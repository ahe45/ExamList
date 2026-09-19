const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runObjectScrollStabilityCheck(client) {
  await evaluate(client, `(${setupObjectScrollStability.toString()})()`);
  try {
    for (const kind of ["table", "image", "grid"]) {
      for (const action of ["move", "resize"]) {
        const point = await evaluate(client, `window.objectScrollStability.prepare('${kind}')`);
        await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
        await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
        const start = await evaluate(client, `window.objectScrollStability.handle('${kind}', '${action}')`);
        await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...start.point });
        const down = await evaluate(client, "window.objectScrollStability.inspect()");
        await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: start.point.x + 20, y: start.point.y + 25 });
        const moved = await evaluate(client, "window.objectScrollStability.inspect()");
        const refocused = await evaluate(client, "window.objectScrollStability.focusOffscreenContent()");
        await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: start.point.x + 20, y: start.point.y + 25 });
        const ended = await evaluate(client, "window.objectScrollStability.inspect()");
        for (const state of [down, moved, refocused, ended]) assert.deepEqual(state.scroll, start.scroll, `${kind} ${action} must preserve scroll`);
        assert.notDeepEqual(moved.geometry, down.geometry, `${kind} ${action} must actually change the object`);
        assert.notEqual((await evaluate(client, "window.objectScrollStability.scrollAfterRelease()")).scroll[1], start.scroll[1],
          "normal scrolling must resume after releasing the handle");
      }
    }
  } finally {
    await evaluate(client, "window.objectScrollStability.dispose()");
  }
}

async function setupObjectScrollStability() {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/styles/features/template-editor.css";
  await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; document.head.append(css); });
  const page = { id: "scroll-page", type: "content", settings: { editorMode: "document",
    documentHtml: '<div class="template-doc"><p style="height:24px;margin:0">앞 문장</p><table style="position:absolute;top:460px;left:80px;width:350px;height:60px"><tr><td>표</td></tr></table><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2240%22/%3E" style="position:absolute;top:560px;left:80px;width:80px;height:40px"><div data-candidate-block-grid="true"></div><p>마지막 문장</p></div>',
    candidateBlockGrid: { enabled: true, variant: "photo", columns: 2, rows: 2, xPt: 60, yPt: 500, widthPt: 320, heightPt: 110, blockTemplateHtml: '<table><tr><td>수험생</td></tr></table>' },
  } };
  const template = { id: "scroll-template", name: "스크롤 유지", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { template, selectedPageId: page.id, dataTags: { groups: [] } } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  const panel = root.querySelector(".template-editor-page");
  panel.style.cssText = "position:fixed;left:40px;top:40px;width:900px;height:400px;overflow:auto;z-index:100;";
  const doc = surface.querySelector(".template-doc");
  const object = kind => doc.querySelector(kind === "table" ? ":scope > table" : kind === "image" ? ":scope > img" : "[data-candidate-block-grid]");
  const settle = () => new Promise(resolve => setTimeout(resolve, 180));
  const scroll = () => [panel.scrollLeft, panel.scrollTop, surface.scrollLeft, surface.scrollTop, window.scrollX, window.scrollY];
  let currentKind = "table";
  const inspect = async () => {
    await settle();
    const el = object(currentKind);
    return { scroll: scroll(), geometry: [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight] };
  };
  window.objectScrollStability = {
    async prepare(kind) {
      currentKind = kind;
      const el = object(kind);
      panel.scrollTop += el.getBoundingClientRect().top - panel.getBoundingClientRect().top - 100;
      await settle();
      const rect = el.getBoundingClientRect();
      return { x: rect.left - (kind === "table" ? 1 : -1), y: rect.top + 10 };
    },
    async handle(kind, action) {
      if (action === "resize") {
        panel.scrollTop += object(kind).getBoundingClientRect().top - panel.getBoundingClientRect().top + 10;
      }
      await settle();
      const selector = kind === "table"
        ? action === "move" ? '[data-template-table-object-overlay="selection"] [data-template-table-object-move-handle]' : '[data-template-table-object-overlay="selection"] [data-template-table-object-handle-position="bottom-right"]'
        : kind === "grid" ? action === "move" ? '[data-candidate-block-grid-move-handle]' : '[data-candidate-block-grid-resize-corner="bottom-right"]'
        : action === "move" ? ".template-doc > img" : '.template-editor-image-selection [data-template-resize-corner="bottom-right"]';
      const handle = surface.querySelector(selector);
      if (!handle) throw new Error(`missing ${kind} ${action} handle: ${selector}`);
      const rect = handle.getBoundingClientRect();
      return { point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, scroll: scroll() };
    },
    inspect,
    async focusOffscreenContent() {
      // Reproduce native scrolling caused by focus restoration during a drag.
      // This must be guarded regardless of which control requested the focus.
      const paragraph = doc.querySelector("p");
      paragraph.tabIndex = -1;
      paragraph.focus();
      paragraph.removeAttribute("tabindex");
      return inspect();
    },
    async scrollAfterRelease() { panel.scrollTop += panel.scrollTop > 10 ? -10 : 10; return inspect(); },
    dispose() { unmountTemplateEditorRuntime(); css.remove(); },
  };
}

module.exports = { runObjectScrollStabilityCheck };
