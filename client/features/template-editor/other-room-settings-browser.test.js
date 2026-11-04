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

test("other room modal cancels safely, preserves text on toggle and reload, and renders it in PDF", { skip: !resolveBrowserPath() }, async () => {
  const root = path.resolve(__dirname, "../../..");
  const bundle = await esbuild.build({ stdin: { resolveDir: __dirname, contents: `
    import { renderTemplateEditorView } from './renderers.js';
    import { mountTemplateEditorRuntime, syncTemplateEditorRuntimeToState, resetTemplateEditorRuntimeDirtyBaseline } from './editor-runtime-adapter.js';
    import { renderTemplateEditorPanel } from '../../app/template-editor-panel.js';
    import { createOtherRoomSettingsActions } from './other-room-settings-actions.js';
    import { bindTemplateEditorClickEvents } from './template-editor-click-events.js';
    import { createModalCloseGuard } from '../../app/modal-close-guard.js';
    window.testState = { ui: {}, templateEditor: {
      selectedPageId: 'page-1', dataTags: { groups: [] }, isDirty: false,
      template: { id: 'test', name: '서식 테스트', paperPreset: 'A4', orientation: 'portrait', generationUnit: 'room', layout: { pages: [
        { id: 'page-1', type: 'content', settings: { documentHtml: '<div class="template-doc"><p>본문 <span class="template-token" data-template-tag-value="room.otherRoom">#타고사실</span></p></div>', otherRoomPage: { enabled: true } } },
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
    const actions = createOtherRoomSettingsActions({ appState, canManageTemplates: () => true, onStateChange: render });
    const guard = createModalCloseGuard({ appState, onStateChange: render });
    guard.registerModal({ id: 'format', closeActions: ['close-other-room-settings-modal'],
      close: actions.closeOtherRoomSettingsModal, isOpen: () => appState.templateEditor.otherRoomSettingsModal?.isOpen });
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
    const open = () => click('[data-action="open-other-room-settings-modal"]');
    const read = () => evaluate(client, "testState.templateEditor.template.layout.pages[0].settings.otherRoomPage");
    const set = value => evaluate(client, `document.querySelector('[data-other-room-text]').value=${JSON.stringify(value)}`);
    await open();
    assert.equal(await evaluate(client, "document.getElementById('templateEditorRuntimeHost').inert"), true);
    assert.equal(await evaluate(client, "document.querySelector('[data-other-room-text]').value"), "타고사실");
    await set('취소 문구');
    await click('[data-action="close-other-room-settings-modal"]');
    assert.deepEqual(await read(), { enabled: true });
    assert.equal(await evaluate(client, "testState.templateEditor.isDirty"), false);
    await open();
    const text = '다른 고사실 <안내> & "확인"';
    await set(text);
    if (process.env.EXAMLIST_QA_OUTPUT) {
      const shot = await client.send('Page.captureScreenshot', {format:'png'});
      await fs.writeFile(process.env.EXAMLIST_QA_OUTPUT, Buffer.from(shot.data,'base64'));
    }
    await click('[data-action="save-other-room-settings-modal"]');
    assert.deepEqual(await read(), { enabled: true, text });
    assert.equal(await evaluate(client, "testState.templateEditor.isDirty"), true);
    assert.equal(await evaluate(client, "document.querySelector('[data-action=save-template-layout]').disabled"), false);
    assert.equal(await evaluate(client, "document.getElementById('templateEditorSurface') === window.originalSurface"), true);
    await open();
    assert.equal(await evaluate(client, "document.querySelector('[data-other-room-text]').value"), text);
    await dispatchBrowserKey(client, 'Escape', {keyCode:27});
    await evaluate(client, 'window.testRenderPending');
    assert.equal(await evaluate(client, "document.querySelector('.other-room-settings-modal-overlay') === null"), true);
    await evaluate(client, `(() => {const c=document.querySelector('[data-examlist-other-room-page-setting=enabled]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.deepEqual(await read(), { enabled: false, text });
    assert.equal(await evaluate(client, "document.querySelector('[data-action=open-other-room-settings-modal]').disabled"), true);
    await evaluate(client, `(() => {const c=document.querySelector('[data-examlist-other-room-page-setting=enabled]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const pages = await evaluate(client, 'testState.templateEditor.template.layout.pages');
    const metadata = { name:'문구 테스트',paperPreset:'A4',orientation:'portrait',generationUnit:'room' };
    const layout = normalizeTemplateLayout({pages},metadata,'test');
    const reloaded = normalizeTemplateLayout(JSON.parse(JSON.stringify(layout)),metadata,'test');
    assert.deepEqual(reloaded.pages[0].settings.otherRoomPage, {enabled:true,text});
    const preview = renderPreviewDocument({template:{...metadata,layout:reloaded},candidates:[{examNo:'1',roomName:'101'}]});
    assert.ok(preview.pages[1].html.includes('다른 고사실 &lt;안내&gt; &amp; &quot;확인&quot;'));
    assert.ok(!preview.pages[0].html.includes('다른 고사실'));
    reloaded.pages[0].settings.otherRoomPage.text = '';
    const blankPreview = renderPreviewDocument({template:{...metadata,layout:reloaded},candidates:[{examNo:'1',roomName:'101'}],emptyValueData:{'room.otherRoom':'대체 문구'}});
    assert.ok(!blankPreview.pages[1].html.includes('대체 문구'));
    await evaluate(client, `document.open();document.write(${JSON.stringify(preview.html)});document.close();`);
    assert.ok((await evaluate(client,'document.body.textContent')).includes(text));
    const pdf = await client.send('Page.printToPDF', {preferCSSPageSize:true,printBackground:true});
    assert.ok(Buffer.from(pdf.data,'base64').subarray(0,5).equals(Buffer.from('%PDF-')));
    assert.deepEqual(client.getPageErrors(), []);
  } finally {
    client?.close();
    browser.kill();
    await new Promise(resolve => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
});
