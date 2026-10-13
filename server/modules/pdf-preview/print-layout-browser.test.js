const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, evaluate } = require("../../../scripts/smoke-browser-cdp");
const { renderPreviewDocument } = require("./renderer");
const { normalizeTemplateLayout } = require("../pdf-templates/layout");

test("printing completes object flow and keeps barcodes clear of cell borders without animation frames", { skip: !resolveBrowserPath() }, async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-print-layout-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    for (const collapse of ["collapse", "separate"]) {
      const metadata = { name: "Print layout", paperPreset: "A4", orientation: "portrait", generationUnit: "room" };
      const barcode = (id, width, left, positioned) =>
        `<tr style="height:22px"><td style="width:285px;height:22px;border:1px solid #ff00ff;padding:0;position:relative;text-align:center">` +
        `<img id="${id}" data-template-object-type="barcode" data-template-object-source="candidate.examNo" style="width:${width}px;height:14px;max-width:100%;${positioned ? `position:absolute;left:${left}px;top:3px` : ""}" /></td></tr>`;
      const layout = normalizeTemplateLayout({ pages: [{ type: "content", repeatable: true, settings: {
        editorMode: "document",
        documentHtml: '<div class="template-doc"><p>Title</p><div data-candidate-block-grid="true"></div><p id="signature">Supervisor signature</p></div>',
        candidateBlockGrid: {
          enabled: true, variant: "photo", columns: 1, rows: 1, widthPt: 214.5, heightPt: 60,
          xPt: 0, yPt: 100,
          blockTemplateHtml: `<table style="width:285px;height:66px;border-collapse:${collapse};border-spacing:0">` +
            '<colgroup><col style="width:285px"></colgroup><tbody>' +
            barcode("positioned", 284, 0, true) + barcode("inline", 284, 0, false) +
            barcode("smaller", 100, 20, true) + '</tbody></table>',
        },
      } }] }, metadata, "print-layout-test");
      const { html } = renderPreviewDocument({ template: { ...metadata, layout }, candidates: [{ examNo: "260100001" }] });
      // Reproduce printing before the browser's next animation frame. Only the
      // real print event may prepare the document; no manual fit() beforehand.
      await evaluate(client, `window.requestAnimationFrame=()=>0;document.open();document.write(${JSON.stringify(html)});document.close();`);
      await evaluate(client, "document.fonts.ready");
      assert.equal(await evaluate(client, "document.querySelectorAll('[data-preview-object-flow-spacer]').length"), 0);
      const pdf = await client.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
      assert.ok(Buffer.from(pdf.data, "base64").subarray(0, 5).equals(Buffer.from("%PDF-")));
      const read = `(() => {
        const page=document.querySelector('.preview-page'), origin=page.getBoundingClientRect();
        const grid=document.querySelector('.preview-candidate-block-grid'), signature=document.getElementById('signature');
        const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left-origin.left,right:r.right-origin.left,width:r.width};};
        return { signatureTop: signature.getBoundingClientRect().top-origin.top,
          gridBottom: grid.getBoundingClientRect().bottom-origin.top,
          spacers: document.querySelectorAll('[data-preview-object-flow-spacer]').length,
          images: ['positioned','inline','smaller'].map(id=>{const img=document.getElementById(id),cell=img.closest('td'),s=getComputedStyle(cell);return {id,image:rect(img),cell:rect(cell),borderLeft:parseFloat(s.borderLeftWidth),borderRight:parseFloat(s.borderRightWidth),left:img.style.left};}) };
      })()`;
      const first = await evaluate(client, read);
      assert.equal(first.spacers, 1);
      assert.ok(first.signatureTop >= first.gridBottom, JSON.stringify(first));
      for (const { image, cell, borderLeft, borderRight } of first.images) {
        const factor = collapse === "collapse" ? 0.5 : 1;
        assert.ok(image.left >= cell.left + borderLeft * factor + 0.49, JSON.stringify(first));
        assert.ok(image.right <= cell.right - borderRight * factor - 0.49, JSON.stringify(first));
      }
      assert.equal(first.images[2].image.width, 100);
      assert.equal(first.images[2].left, "20px");
      await evaluate(client, "window.ExamListPreviewDataFit.fit();window.ExamListPreviewDataFit.fit();");
      assert.deepEqual(await evaluate(client, read), first, "repeated fitting must not shrink or move images further");
    }
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
});
