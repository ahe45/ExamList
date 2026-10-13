const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const esbuild = require("esbuild");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, waitForCondition, evaluate, dispatchBrowserMouseClick, dispatchBrowserKey } = require("../../../scripts/smoke-browser-cdp");
const { normalizeTemplateLayout } = require("../../../server/modules/pdf-templates/layout");
const { renderPreviewDocument } = require("../../../server/modules/pdf-preview/renderer");

test("page number modal cancels safely, saves formatting, and renders the same format in PDF", { skip: !resolveBrowserPath() }, async () => {
  const root = path.resolve(__dirname, "../../..");
  const bundle = await esbuild.build({ stdin: { resolveDir: __dirname, contents: `
    import { renderTemplateEditorView } from './renderers.js';
    import { mountTemplateEditorRuntime, syncTemplateEditorRuntimeToState, resetTemplateEditorRuntimeDirtyBaseline } from './editor-runtime-adapter.js';
    import { renderTemplateEditorPanel } from '../../app/template-editor-panel.js';
    import { createPageNumberFormatActions } from './page-number-format-actions.js';
    import { bindTemplateEditorClickEvents } from './template-editor-click-events.js';
    import { createModalCloseGuard } from '../../app/modal-close-guard.js';
    window.testState = { ui: {}, templateEditor: {
      selectedPageId: 'page-1', dataTags: { groups: [] }, isDirty: false,
      template: { id: 'test', name: '서식 테스트', paperPreset: 'A4', orientation: 'portrait', generationUnit: 'room', layout: { pages: [
        { id: 'page-1', type: 'content', settings: { documentHtml: '<div class="template-doc"><p>본문</p></div>', pageNumber: { enabled: true, position: 'right', preset: 'koreanPage' } } },
        { id: 'page-2', type: 'content', settings: {} }
      ] } }
    } };
    const appState = window.testState;
    const access = { permissions: { manageTemplates: true, previewTemplates: true } };
    function render() {
      window.testRenderPending = (async () => {
        syncTemplateEditorRuntimeToState({ appState });
        renderTemplateEditorPanel(document.getElementById('root'), renderTemplateEditorView({ access, editor: appState.templateEditor }));
        await mountTemplateEditorRuntime({ access, appState });
      })();
      return window.testRenderPending;
    }
    window.testRender = render;
    const actions = createPageNumberFormatActions({ appState, canManageTemplates: () => true, onStateChange: render });
    const guard = createModalCloseGuard({ appState, onStateChange: render });
    guard.registerModal({ id: 'format', closeActions: ['close-page-number-format-modal'],
      close: actions.closePageNumberFormatModal, isOpen: () => appState.templateEditor.pageNumberFormatModal?.isOpen });
    guard.attach();
    bindTemplateEditorClickEvents({ appState, ...actions });
    window.ExamListTemplateEditorRuntimeLoader = {
      load: () => Promise.resolve(),
      createTemplateEditor: window.ExamListTemplateEditorRuntime.createTemplateEditor,
    };
    window.testReady = render().then(() => {
      appState.templateEditor.savedTemplateSnapshot = structuredClone(appState.templateEditor.template);
      resetTemplateEditorRuntimeDirtyBaseline({ appState });
      window.originalSurface = document.getElementById('templateEditorSurface');
      window.testResetBaseline = () => {
        appState.templateEditor.savedTemplateSnapshot = structuredClone(appState.templateEditor.template);
        resetTemplateEditorRuntimeDirtyBaseline({ appState });
      };
      return true;
    });
  ` }, bundle: true, write: false, format: "iife", platform: "browser" });
  const css = (await Promise.all(["styles/base.css", "styles/surfaces.css", "styles/features/template-editor.css"]
    .map(async file => (await esbuild.build({ entryPoints: [path.join(root, file)], bundle: true, write: false })).outputFiles[0].text))).join("\n");
  const runtimeRoot = path.join(root, "client/template-editor-runtime");
  const manifest = require(path.join(runtimeRoot, "client/template-editor-runtime/manifest.js"));
  const runtimeSources = await Promise.all(manifest.requiredScripts.map(file => fs.readFile(path.resolve(runtimeRoot, file), "utf8")));
  const runtime = await esbuild.transform(runtimeSources.join("\n;\n"), { minify: true });
  const html = `<html><head><style>${css}</style></head><body><main id="root"></main><script>${runtime.code}</script><script>${bundle.outputFiles[0].text}</script></body></html>`;
  const server = http.createServer((request, response) => {
    if (request.url !== "/") { response.writeHead(404).end(); return; }
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(html);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-page-number-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await client.send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
    await waitForCondition(client, "window.testReady", "real editor initialization");
    await evaluate(client, "window.testReady");
    const click = async selector => {
      await dispatchBrowserMouseClick(client, selector);
      await evaluate(client, "window.testRenderPending");
    };
    const open = () => click('[data-action="open-page-number-format-modal"]');
    const set = (key, value) => evaluate(client, `document.querySelector('[data-page-number-format-field="${key}"]').value=${JSON.stringify(value)};`);
    const readFormat = () => evaluate(client, "testState.templateEditor.template.layout.pages[0].settings.pageNumber.format || null");
    const saveDisabled = () => evaluate(client, "document.querySelector('[data-action=save-template-layout]').disabled");
    assert.equal(await saveDisabled(), true);
    assert.equal(await evaluate(client, "document.getElementById('templateEditorSurface') === window.originalSurface"), true);
    await open();
    assert.equal(await evaluate(client, "document.getElementById('templateEditorRuntimeHost').inert"), true);
    assert.equal(await evaluate(client, "document.querySelector('.page-number-format-modal-overlay').getAttribute('aria-modal')"), "true");
    const font = "'GulimChe', 'Gulim', sans-serif";
    await set("fontFamily", font);
    await set("fontSizePt", "16.5");
    await click('[data-action="toggle-page-number-format-style"][data-style="italic"]');
    await click('.page-number-format-modal-overlay .ghost-button');
    assert.equal(await readFormat(), null);
    assert.equal(await evaluate(client, "testState.templateEditor.isDirty"), false);
    assert.equal(await saveDisabled(), true);
    await open();
    await set("fontSizePt", "99");
    await click('[data-action="save-page-number-format-modal"]');
    assert.equal(await evaluate(client, "testState.templateEditor.pageNumberFormatModal.isOpen"), true);
    assert.equal(await readFormat(), null);
    await set("fontFamily", font);
    await set("fontSizePt", "16.5");
    await click('[data-action="set-page-number-format-color"][data-color="#1d4ed8"]');
    for (const style of ["bold", "italic", "underline"]) {
      await click(`[data-action="toggle-page-number-format-style"][data-style="${style}"]`);
    }
    if (process.env.EXAMLIST_QA_OUTPUT) {
      const shot = await client.send("Page.captureScreenshot", { format: "png" });
      await fs.writeFile(process.env.EXAMLIST_QA_OUTPUT, Buffer.from(shot.data, "base64"));
    }
    await click('[data-action="save-page-number-format-modal"]');
    const expected = { fontFamily: font, fontSizePt: 16.5, color: "#1d4ed8", bold: false, italic: true, underline: true };
    assert.deepEqual(await readFormat(), expected);
    assert.equal(await evaluate(client, "testState.templateEditor.isDirty"), true);
    assert.equal(await saveDisabled(), false, "Saving page number format must enable template Save after the runtime refresh");
    assert.equal(await evaluate(client, "document.getElementById('templateEditorSurface') === window.originalSurface"), true);
    const readStyle = selector => evaluate(client, `(() => {const s=getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
      return { fontFamily:s.fontFamily, fontSize:s.fontSize, color:s.color, fontWeight:s.fontWeight, fontStyle:s.fontStyle, decoration:s.textDecorationLine };})()`);
    const editorStyle = await readStyle(".template-page-number-overlay");
    assert.equal(editorStyle.fontSize, "22px");
    assert.equal(editorStyle.fontWeight, "400");
    assert.equal(editorStyle.fontStyle, "italic");
    assert.equal(editorStyle.decoration, "underline");
    await open();
    assert.equal(await evaluate(client, "document.querySelector('[data-page-number-format-field=fontFamily]').value"), font);
    assert.equal(await evaluate(client, "document.querySelector('[data-page-number-format-field=fontSizePt]').value"), "16.5");
    await dispatchBrowserKey(client, "Escape", { keyCode: 27 });
    await evaluate(client, "window.testRenderPending");
    assert.equal(await evaluate(client, "document.querySelector('.page-number-format-modal-overlay') === null"), true);
    // Changing alignment must not discard the format saved in the modal.
    await evaluate(client, "const position=document.querySelector('[data-examlist-page-number-setting=position]');position.value='left';position.dispatchEvent(new Event('change',{bubbles:true}));");
    assert.deepEqual(await readFormat(), expected);
    await evaluate(client, "window.testRender()");
    assert.equal(await saveDisabled(), false, "Later renders must retain unsaved page number formatting");
    await evaluate(client, "window.testResetBaseline()");
    assert.equal(await saveDisabled(), true, "Saving the template establishes a clean baseline");
    const pages = await evaluate(client, "testState.templateEditor.template.layout.pages");
    const metadata = { name: "서식", paperPreset: "A4", orientation: "portrait", generationUnit: "room" };
    const layout = normalizeTemplateLayout({ pages }, metadata, "format-test");
    const reloaded = normalizeTemplateLayout(JSON.parse(JSON.stringify(layout)), metadata, "format-test");
    const preview = renderPreviewDocument({ template: { ...metadata, layout: reloaded }, candidates: [{ examNo: "1" }] });
    await evaluate(client, `document.open();document.write(${JSON.stringify(preview.html)});document.close();`);
    await evaluate(client, "document.fonts.ready");
    await client.send("Emulation.setEmulatedMedia", { media: "print" });
    assert.deepEqual(await readStyle(".preview-page-number"), editorStyle);
    const pdf = await client.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
    assert.ok(Buffer.from(pdf.data, "base64").subarray(0, 5).equals(Buffer.from("%PDF-")));
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
});
