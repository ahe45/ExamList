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

    // Free objects retain the same coordinates without reserving text rows,
    // including a data grid rebuilt from its saved placeholder.
    const freeTemplate = structuredClone(template);
    freeTemplate.layout.pages[0].settings.documentHtml = '<div class="template-doc">' +
      '<table id="freeTable" data-template-object-inline="false" style="position:absolute;left:30px;top:100px;width:200px;height:60px;margin:0"><tr><td>표</td></tr></table>' +
      '<img id="freeImage" data-template-object-inline="false" style="position:absolute;left:30px;top:100px;width:80px;height:50px" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E">' +
      '<div data-candidate-block-grid="true" data-template-object-inline="false"></div><p id="freeAfter">뒷 문장</p></div>';
    freeTemplate.layout.pages[0].settings.candidateBlockGrid = {
      enabled:true,variant:'photo',columns:1,rows:1,xPt:22.5,yPt:75,widthPt:165,heightPt:75,blockTemplateHtml:'<p>수험생</p>',
    };
    const freeHtml = renderPreviewDocument({candidates:[{name:'수험생'}],template:freeTemplate}).html;
    await evaluate(client, `document.open(); document.write(${JSON.stringify(freeHtml)}); document.close();`);
    const freeResult = await evaluate(client, `(async () => {
      await document.fonts.ready;
      const read = () => ({
        spacers:document.querySelectorAll('[data-preview-object-flow-spacer]').length,
        tops:['#freeTable','#freeImage','.preview-candidate-block-grid'].map(selector => {
          const el=document.querySelector(selector);return {top:el.getBoundingClientRect().top,inline:el.dataset.templateObjectInline};
        }),after:document.getElementById('freeAfter').getBoundingClientRect().top,
      });
      window.ExamListPreviewDataFit.fit(); const first=read();
      window.ExamListPreviewDataFit.fit(); return {first,second:read()};
    })()`);
    assert.equal(freeResult.first.spacers,0,JSON.stringify(freeResult));
    freeResult.first.tops.forEach(object => {
      assert.equal(object.inline,'false');
      assert.ok(Math.abs(object.top-freeResult.first.tops[0].top)<1,JSON.stringify(freeResult));
    });
    assert.ok(freeResult.first.after < freeResult.first.tops[0].top, 'Free objects must not push following text');
    assert.deepEqual(freeResult.first,freeResult.second);
    const freeThumbnail = renderTemplateContentThumbnail(freeTemplate,{candidates:[{name:'수험생'}]});
    assert.match(freeThumbnail.html,/data-template-object-inline="false"/);
    const freePdf = await client.send("Page.printToPDF",{preferCSSPageSize:true});
    assert.ok(Buffer.from(freePdf.data,'base64').subarray(0,5).equals(Buffer.from('%PDF-')));
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  }
});
