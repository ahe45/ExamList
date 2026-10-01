const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { PDFDocument, PDFArray, decodePDFRawStream } = require("pdf-lib");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, evaluate } = require("../../../scripts/smoke-browser-cdp");
const { renderPreviewDocument } = require("./renderer");
const { renderTemplateContentThumbnail } = require("./thumbnail");
const { renderHtmlToPdf } = require("../pdf-generations/browser-renderer");

test("canvas and PDF preserve text, table, background, line and mark colors", { skip: !resolveBrowserPath() }, async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-text-color-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    const documentHtml = '<div class="template-doc"><p id="plain">Default black</p>' +
      '<table><tr><td id="cell">Table black</td><td id="token"><span data-template-tag-value="candidate.name">Name</span></td></tr></table>' +
      '<p id="black" style="color:#000000">Explicit black</p>' +
      '<p id="red" style="color:#ff0000">Explicit red</p>' +
      '<table><tr><th id="header">Default header</th></tr>' +
      '<tr><td id="black-border" style="border:2px solid #000000;background-color:#00ff00">Black border, green fill</td></tr>' +
      '<tr><td id="custom-border" style="border:2px dashed #ff0000;background-color:#ffff00">Red border, yellow fill</td></tr>' +
      '<tr><td id="no-border" style="border:none;background-color:transparent">No border or fill</td></tr></table>' +
      '<hr id="rule"><blockquote id="quote">Quote</blockquote>' +
      '<div id="shape" style="border:2px solid #000000;background-color:#00ffff;color:#000000">Shape</div></div>';
    const template = { name: "Text colors", paperPreset: "A4", orientation: "portrait", layout: { pages: [
      { type: "content", widthPt: 595.28, heightPt: 841.89, settings: { editorMode: "document", documentHtml,
        pageNumber: { enabled: true }, recognitionMarks: { enabled: true } }, elements: [] },
    ] } };
    const candidates = [{ name: "Candidate black" }];
    const { html } = renderPreviewDocument({ template, candidates });
    const readColors = `(async () => {
      await document.fonts.ready;
      return Object.fromEntries(['plain', 'cell', 'token', 'black', 'red'].map(id =>
        [id, getComputedStyle(document.getElementById(id)).color]));
    })()`;
    const expected = { plain: "rgb(0, 0, 0)", cell: "rgb(0, 0, 0)", token: "rgb(0, 0, 0)", black: "rgb(0, 0, 0)", red: "rgb(255, 0, 0)" };
    const readDecorations = `Object.fromEntries(['cell', 'header', 'black-border', 'custom-border', 'no-border', 'rule', 'quote', 'shape'].map(id => {
      const style = getComputedStyle(document.getElementById(id));
      return [id, { border: style.borderTopColor, borderStyle: style.borderTopStyle,
        borderLeft: style.borderLeftColor, background: style.backgroundColor, color: style.color }];
    }))`;
    // Use the actual canvas styles as the reference, including inherited defaults.
    const styleRoot = path.resolve(__dirname, "../../../styles/features/template-editor/document-surface");
    const canvasStyles = (await Promise.all(["paper-and-surface.css", "content-and-objects.css", "tables-and-generated.css"]
      .map(file => fs.readFile(path.join(styleRoot, file), "utf8")))).join("\n");
    await evaluate(client, `document.open(); document.write(${JSON.stringify(`<style>${canvasStyles}</style><div class="editor-paper"><div class="editor-document-surface">${documentHtml}</div></div>`)}); document.close();`);
    const canvasDecorations = await evaluate(client, readDecorations);
    await evaluate(client, `document.open(); document.write(${JSON.stringify(html)}); document.close();`);
    assert.deepEqual(await evaluate(client, readColors), expected);
    assert.deepEqual(await evaluate(client, readDecorations), canvasDecorations);
    await client.send("Emulation.setEmulatedMedia", { media: "print" });
    assert.deepEqual(await evaluate(client, readColors), expected);
    assert.deepEqual(await evaluate(client, readDecorations), canvasDecorations);
    assert.equal(await evaluate(client, `getComputedStyle(document.getElementById('black-border')).printColorAdjust`), "exact");
    assert.equal(await evaluate(client, `getComputedStyle(document.querySelector('.preview-recognition-mark')).backgroundColor`), "rgb(0, 0, 0)");
    assert.equal(await evaluate(client, `getComputedStyle(document.querySelector('.preview-page-number')).color`), "rgb(16, 36, 69)");
    const result = await client.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
    const pdf = await PDFDocument.load(Buffer.from(result.data, "base64"));
    const contents = pdf.getPage(0).node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref)) : [contents];
    const operators = streams.map(stream => Buffer.from(decodePDFRawStream(stream).decode()).toString()).join("\n");
    assert.match(operators, /0 0 0 rg\b/, "PDF must paint default text in pure black");
    assert.match(operators, /1 0 0 rg\b/, "PDF must preserve explicitly red text");
    assert.match(operators, /0 1 0 rg\b/, "PDF must preserve green cell shading");
    assert.match(operators, /1 1 0 rg\b/, "PDF must preserve yellow cell shading");
    assert.match(operators, /0 1 1 rg\b/, "PDF must preserve cyan shape background");
    // Verify the same browser launch path used by the production PDF worker.
    const htmlFilePath = path.join(profile, "colors.html");
    const pdfFilePath = path.join(profile, "colors.pdf");
    await fs.writeFile(htmlFilePath, html);
    await renderHtmlToPdf({ browserExecutable: resolveBrowserPath(), browserProfileDir: path.join(profile, "print-profile"), htmlFilePath, pdfFilePath });
    const workerPdf = await PDFDocument.load(await fs.readFile(pdfFilePath));
    const workerContents = workerPdf.getPage(0).node.Contents();
    const workerStreams = workerContents instanceof PDFArray ? workerContents.asArray().map(ref => workerPdf.context.lookup(ref)) : [workerContents];
    const workerOperators = workerStreams.map(stream => Buffer.from(decodePDFRawStream(stream).decode()).toString()).join("\n");
    for (const color of ["0 0 0", "1 0 0", "0 1 0", "1 1 0", "0 1 1"]) {
      assert.ok(workerOperators.includes(`${color} rg`), `Worker PDF must preserve RGB ${color}`);
    }
    const thumbnail = renderTemplateContentThumbnail(template, { candidates });
    await client.send("Emulation.setEmulatedMedia", { media: "screen" });
    await evaluate(client, `document.open(); document.write(${JSON.stringify(thumbnail.html)}); document.close();`);
    assert.deepEqual(await evaluate(client, readColors), expected);
    assert.deepEqual(await evaluate(client, readDecorations), canvasDecorations);
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
});
