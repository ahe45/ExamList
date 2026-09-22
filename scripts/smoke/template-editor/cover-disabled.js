const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function setupDisabledCoverCheck(enabled = true, type = "cover") {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const page = { id: "cover-lock", type, enabled, settings: { editorMode: "document",
    documentHtml: '<div class="template-doc"><p>표지 내용 유지</p><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2260%22/%3E" style="position:absolute;left:80px;top:100px;width:100px;height:60px"><table style="position:absolute;left:80px;top:240px;width:300px;height:80px"><tr><td>표 내용 유지</td></tr></table></div>',
  } };
  const template = { id: "cover-lock-template", name: "표지 비활성화", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { template, selectedPageId: page.id, dataTags: { groups: [] } } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/styles/features/template-editor/document-surface.css";
  await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; document.head.append(css); });
  // Keep this isolated test's canvas in the viewport without loading the app shell.
  root.querySelector("#templateEditorRuntimeHost").style.cssText = "display:grid;grid-template-columns:150px 150px 800px 200px;align-items:start";
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.coverLock = {
    editor,
    async toggle(value) {
      const control = root.querySelector('[data-examlist-cover-page-setting="enabled"]');
      control.checked = value;
      control.dispatchEvent(new Event("change", { bubbles: true }));
      await settle();
    },
    point(selector) {
      const rect = surface.querySelector(selector).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    },
    inspect() {
      return {
        html: editor.getHtml(),
        selected: !!surface.querySelector(".is-selected-object, .is-selected-table-object"),
        locked: !!editor.state.templateEditor.interactionDisabled,
        inert: [surface.closest(".template-editor-page"), root.querySelector("#templateEditorToolbarHost"), root.querySelector(".template-tag-panel")].every(node => node.inert),
        focusInCanvas: surface.contains(document.activeElement),
        imageLeft: surface.querySelector("img").style.left,
      };
    },
    dispose() { unmountTemplateEditorRuntime(); css.remove(); },
  };
  await settle();
}

async function runDisabledCoverCheck(client) {
  const mouse = (type, point, extra = {}) => client.send("Input.dispatchMouseEvent", { type, ...point, ...extra });
  const press = async (key, windowsVirtualKeyCode, modifiers = 0) => {
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode, modifiers });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode, modifiers });
  };
  const click = async (point) => {
    await mouse("mousePressed", point, { button: "left", clickCount: 1 });
    await mouse("mouseReleased", point, { button: "left", clickCount: 1 });
  };
  await evaluate(client, `(${setupDisabledCoverCheck.toString()})()`);
  try {
    let point = await evaluate(client, 'coverLock.point("img")');
    await click(point);
    assert.equal((await evaluate(client, "coverLock.inspect()")).selected, true, "enabled image must be selectable");
    // Disable while a drag is active; subsequent pointer movement must do nothing.
    await mouse("mousePressed", point, { button: "left", clickCount: 1 });
    await evaluate(client, "coverLock.toggle(false)");
    const before = await evaluate(client, "coverLock.inspect()");
    assert.equal(before.locked && before.inert, true, "canvas, toolbar and tag panel must be disabled");
    assert.equal(before.selected, false, "disabling must clear object selection");
    await mouse("mouseMoved", { x: point.x + 45, y: point.y + 25 }, { buttons: 1 });
    await mouse("mouseReleased", { x: point.x + 45, y: point.y + 25 }, { button: "left", clickCount: 1 });
    for (const selector of ["img", "table", "p"]) {
      point = await evaluate(client, `coverLock.point('${selector}')`);
      await click(point);
      await mouse("mousePressed", point, { button: "left", clickCount: 2 });
      await mouse("mouseMoved", { x: point.x + 40, y: point.y + 20 }, { buttons: 1 });
      await mouse("mouseReleased", { x: point.x + 40, y: point.y + 20 }, { button: "left", clickCount: 2 });
    }
    await press("ArrowRight", 39);
    await press("Delete", 46);
    await press("Backspace", 8);
    await press("z", 90, 2);
    await client.send("Input.insertText", { text: "변경 금지" });
    await evaluate(client, `(() => {
      const surface = document.querySelector('#templateEditorSurface');
      surface.focus();
      surface.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'historyUndo', cancelable: true }));
      coverLock.editor.insertHtml('<p>삽입 금지</p>');
      coverLock.editor.insertTag('candidate.name');
      coverLock.editor.applyCommand('bold');
      coverLock.editor.undo(); coverLock.editor.redo();
    })()`);
    const after = await evaluate(client, "coverLock.inspect()");
    assert.equal(after.html, before.html, "disabled cover must reject drags, text, deletion, history and insertion");
    assert.equal(after.selected || after.focusInCanvas, false, "disabled canvas must not accept selection or focus");
    await evaluate(client, "coverLock.toggle(true)");
    point = await evaluate(client, 'coverLock.point("img")');
    await click(point);
    const restored = await evaluate(client, "coverLock.inspect()");
    assert.equal(restored.inert || restored.locked, false, "enabling must restore interaction");
    assert.equal(restored.selected, true);
    await press("ArrowRight", 39);
    assert.notEqual((await evaluate(client, "coverLock.inspect()")).imageLeft, restored.imageLeft, "enabled objects must move again");
  } finally { await evaluate(client, "coverLock.dispose()"); }
  for (const type of ["cover", "content"]) {
    await evaluate(client, `(${setupDisabledCoverCheck.toString()})(false, '${type}')`);
    try {
      const result = await evaluate(client, "coverLock.inspect()");
      assert.equal(result.locked, type === "cover", "initial mount must respect disabled cover without locking content pages");
      assert.equal(result.inert, type === "cover");
    } finally { await evaluate(client, "coverLock.dispose()"); }
  }
}

module.exports = { runDisabledCoverCheck };
