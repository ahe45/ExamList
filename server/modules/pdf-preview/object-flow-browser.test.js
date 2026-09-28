const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, evaluate } = require("../../../scripts/smoke-browser-cdp");
const { renderPreviewDocument } = require("./renderer");
const { renderTemplateContentThumbnail } = require("./thumbnail");

test("PDF document reserves space for positioned objects before following data tags", { skip: !resolveBrowserPath() }, async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-object-flow-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    await client.send("Emulation.setEmulatedMedia", { media: "print" });
    const documentHtml = '<div class="template-doc">' +
      '<table id="title" style="position:absolute;left:0;top:1px;width:715px;height:50px;margin:0"><tr style="height:50px"><td style="height:50px">지원자 명부</td></tr></table><br>' +
      '<p id="department">학과(부) : <span data-template-tag-value="candidate.departmentName">모집단위명</span></p>' +
      '<table id="normal"><tr><td>일반 표<table id="nested"><tr><td>중첩 표</td></tr></table></td></tr></table>' +
      '<img id="image" style="position:absolute;top:180pt;left:0;width:30px;height:30px" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E">' +
      '<p id="after-image">이미지 아래</p>' +
      '<div class="preview-candidate-block-grid" style="position:absolute;top:300px;height:40px"></div>' +
      '<p id="after-grid">블록 아래</p></div>';
    const template = { name: "지원자 명부", paperPreset: "A4", orientation: "portrait", layout: { pages: [
        { type: "content", widthPt: 595.28, heightPt: 841.89, settings: { editorMode: "document", documentHtml }, elements: [] },
      ] } };
    const { html } = renderPreviewDocument({
      candidates: [{ departmentName: "유아교육과" }],
      template,
    });
    await evaluate(client, `document.open(); document.write(${JSON.stringify(html)}); document.close();`);
    const results = await evaluate(client, `(async () => {
      await document.fonts.ready;
      const read = () => Object.fromEntries(['title', 'department', 'normal', 'nested', 'image', 'after-image', 'after-grid'].map(id => {
        const element = document.getElementById(id), rect = element.getBoundingClientRect();
        return [id, { top: rect.top, bottom: rect.bottom, text: element.textContent }];
      }));
      window.ExamListPreviewDataFit.fit();
      const first = read();
      window.ExamListPreviewDataFit.fit();
      return { first, second: read(), spacers: document.querySelectorAll('[data-preview-object-flow-spacer]').length };
    })()`);
    const rects = results.first;
    assert.ok(rects.department.top >= rects.title.bottom, JSON.stringify(rects));
    assert.match(rects.department.text, /유아교육과/);
    assert.ok(rects["after-image"].top >= rects.image.bottom);
    assert.ok(rects["after-grid"].top >= rects.title.top - 1 + 340);
    assert.equal(results.spacers, 3, "normal and nested tables must not get extra space");
    assert.deepEqual(results.first, results.second, "repeated layout must not accumulate space");
    const pdf = await client.send("Page.printToPDF", { preferCSSPageSize: true });
    assert.ok(Buffer.from(pdf.data, "base64").subarray(0, 5).equals(Buffer.from("%PDF-")));
    // Card thumbnails load through srcdoc and must perform layout automatically.
    // Waiting for load and animation frames intentionally does not call fit().
    const thumbnail = renderTemplateContentThumbnail(template, { candidates: [{ departmentName: "유아교육과" }] });
    await client.send("Emulation.setEmulatedMedia", { media: "screen" });
    const thumbnailRects = await evaluate(client, `(async () => {
      document.body.innerHTML = '';
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:794px;height:1123px;transform:scale(0.54);transform-origin:top left';
      const loaded = new Promise(resolve => frame.onload = resolve);
      frame.srcdoc = ${JSON.stringify(thumbnail.html)};
      document.body.append(frame);
      await loaded;
      await frame.contentDocument.fonts.ready;
      await new Promise(resolve => frame.contentWindow.requestAnimationFrame(() => frame.contentWindow.requestAnimationFrame(resolve)));
      const doc = frame.contentDocument;
      return { titleBottom: doc.getElementById('title').getBoundingClientRect().bottom,
        departmentTop: doc.getElementById('department').getBoundingClientRect().top,
        text: doc.getElementById('department').textContent,
        spacers: doc.querySelectorAll('[data-preview-object-flow-spacer]').length };
    })()`);
    assert.ok(thumbnailRects.departmentTop >= thumbnailRects.titleBottom, JSON.stringify(thumbnailRects));
    assert.match(thumbnailRects.text, /유아교육과/);
    assert.equal(thumbnailRects.spacers, 3);
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
});
