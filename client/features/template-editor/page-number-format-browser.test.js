const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const esbuild = require("esbuild");
const { resolveBrowserPath, getAvailablePort } = require("../../../scripts/smoke-utils");
const { createCdpClient, waitForDevtools, evaluate, dispatchBrowserMouseClick, dispatchBrowserKey } = require("../../../scripts/smoke-browser-cdp");
const { normalizeTemplateLayout } = require("../../../server/modules/pdf-templates/layout");
const { renderPreviewDocument } = require("../../../server/modules/pdf-preview/renderer");

test("page number modal cancels safely, saves formatting, and renders the same format in PDF", { skip: !resolveBrowserPath() }, async () => {
  const root = path.resolve(__dirname, "../../..");
  const bundle = await esbuild.build({ stdin: { resolveDir: __dirname, contents: `
    import { renderTemplateEditorView } from './renderers.js';
    import { bindPageNumberControls } from './page-number-controls.js';
    import { createPageNumberFormatActions } from './page-number-format-actions.js';
    import { bindTemplateEditorClickEvents } from './template-editor-click-events.js';
    import { createModalCloseGuard } from '../../app/modal-close-guard.js';
    window.testState = { ui: {}, templateEditor: {
      selectedPageId: 'page-1', dataTags: { groups: [] }, isDirty: false,
      template: { id: 'test', layout: { pages: [
        { id: 'page-1', type: 'content', settings: { pageNumber: { enabled: true, position: 'right', preset: 'koreanPage' } } },
        { id: 'page-2', type: 'content', settings: {} }
      ] } }
    } };
    const appState = window.testState;
    let dispose;
    function render() {
      dispose?.();
      document.getElementById('root').innerHTML = renderTemplateEditorView({
        access: { permissions: { manageTemplates: true, previewTemplates: true } }, editor: appState.templateEditor,
      });
      dispose = bindPageNumberControls({ appState,
        pagePropertiesHost: document.getElementById('templatePagePropertiesPanel'),
        selectedPage: appState.templateEditor.template.layout.pages.find(p => p.id === appState.templateEditor.selectedPageId),
        surfaceElement: document.getElementById('templateEditorSurface'),
      });
    }
    window.testRender = render;
    const actions = createPageNumberFormatActions({ appState, canManageTemplates: () => true, onStateChange: render });
    const guard = createModalCloseGuard({ appState, onStateChange: render });
    guard.registerModal({ id: 'format', closeActions: ['close-page-number-format-modal'],
      close: actions.closePageNumberFormatModal, isOpen: () => appState.templateEditor.pageNumberFormatModal?.isOpen });
    guard.attach();
    bindTemplateEditorClickEvents({ appState, ...actions });
    render();
  ` }, bundle: true, write: false, format: "iife", platform: "browser" });
  const css = (await Promise.all(["styles/base.css", "styles/surfaces.css", "styles/features/template-editor.css"]
    .map(async file => (await esbuild.build({ entryPoints: [path.join(root, file)], bundle: true, write: false })).outputFiles[0].text))).join("\n");
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-page-number-"));
  const port = await getAvailablePort();
  const browser = spawn(resolveBrowserPath(), ["--headless", "--disable-gpu", "--no-first-run",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let client;
  try {
    client = await createCdpClient(await waitForDevtools(port));
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const html = `<html><head><style>${css}</style></head><body><main id="root"></main><script>${bundle.outputFiles[0].text}</script></body></html>`;
    await evaluate(client, `document.open();document.write(${JSON.stringify(html)});document.close();`);
    const click = selector => dispatchBrowserMouseClick(client, selector);
    const open = () => click('[data-action="open-page-number-format-modal"]');
    const set = (key, value) => evaluate(client, `document.querySelector('[data-page-number-format-field="${key}"]').value=${JSON.stringify(value)};`);
    const readFormat = () => evaluate(client, "testState.templateEditor.template.layout.pages[0].settings.pageNumber.format || null");
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
    assert.equal(await evaluate(client, "document.querySelector('.page-number-format-modal-overlay') === null"), true);
    // Changing alignment must not discard the format saved in the modal.
    await evaluate(client, "const position=document.querySelector('[data-examlist-page-number-setting=position]');position.value='left';position.dispatchEvent(new Event('change',{bubbles:true}));");
    assert.deepEqual(await readFormat(), expected);
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
  }
});
