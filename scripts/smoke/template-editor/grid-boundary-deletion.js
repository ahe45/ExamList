const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runGridBoundaryDeletionCheck(client) {
  const press = async (key, windowsVirtualKeyCode, modifiers = 0) => {
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode, modifiers });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode, modifiers });
  };
  let backspaceTop;
  for (const key of ["Backspace", "Delete"]) {
    await evaluate(client, `(${setupGridBoundaryDeletion.toString()})()`);
    try {
      const before = await evaluate(client, "window.gridBoundaryDeletion.inspect()");
      const windowsVirtualKeyCode = key === "Delete" ? 46 : 8;
      await press(key, windowsVirtualKeyCode);
      const after = await evaluate(client, "window.gridBoundaryDeletion.inspect()");
      assert.ok(after.top < before.top - 1, `${key} must pull the data block up`);
      assert.deepEqual(after.content, before.content, `${key} must retain the header tag and all data blocks`);
      assert.equal(after.breaks, before.breaks - 1, `${key} must remove one line break`);
      if (key === "Backspace") backspaceTop = after.top;
      else {
        assert.equal(after.top, backspaceTop, "Delete must pull the block up as far as Backspace");
        assert.equal(after.inHost, true, "Delete must retain the caret before the grid");
        await press("Delete", 46);
        assert.deepEqual(await evaluate(client, "window.gridBoundaryDeletion.inspect()"), after,
          "repeating Delete at the zero-space caret must not create a line or delete the grid");
        await press("z", 90, 2);
        const undone = await evaluate(client, "window.gridBoundaryDeletion.inspect()");
        assert.equal(undone.top, before.top, "undo must restore the gap and block position");
        assert.equal(undone.breaks, before.breaks);
        await press("y", 89, 2);
        assert.equal((await evaluate(client, "window.gridBoundaryDeletion.inspect()")).top, after.top,
          "redo must pull the grid up again");
        const reloaded = await evaluate(client, "window.gridBoundaryDeletion.reload()");
        assert.equal(reloaded.top, after.top, "serialization and reload must retain the new block position");
        assert.deepEqual(reloaded.content, before.content);
      }
    } finally {
      await evaluate(client, "window.gridBoundaryDeletion.dispose()");
    }
  }
}

async function setupGridBoundaryDeletion() {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  if (!document.querySelector('link[href="/styles/features/template-editor/document-surface.css"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/styles/features/template-editor/document-surface.css";
    await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; document.head.append(css); });
  }
  const page = { id: "boundary-page", type: "content", settings: {
    editorMode: "document",
    documentHtml: '<div class="template-doc"><table style="position:absolute;left:0;top:0;width:600px;height:30px"><tr><td>전형명: <span class="template-token" contenteditable="false" data-template-tag-value="candidate.admissionTypeName" data-template-tag-label="전형명">전형명</span></td></tr></table><p><br><br></p><div data-candidate-block-grid="true"></div></div>',
    candidateBlockGrid: { enabled: true, variant: "photo", rows: 2, columns: 2, widthPt: 450, heightPt: 150, yPt: 60, blockTemplateHtml: '<table><tr><td>수험생</td></tr></table>' },
  } };
  const template = { id: "boundary-template", name: "빈 행 삭제", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { dataTags: { groups: [] }, selectedPageId: page.id, template } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  surface.focus();
  const host = surface.querySelector(".template-doc > p");
  const range = document.createRange();
  range.setStart(host, 1);
  range.collapse(true);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  const inspect = () => {
      const doc = surface.querySelector(".template-doc");
      const paragraph = doc.querySelector(":scope > p");
      const grid = surface.querySelector("[data-candidate-block-grid]");
      return { top: grid?.getBoundingClientRect().top,
        breaks: paragraph.querySelectorAll("br").length,
        inHost: paragraph.contains(getSelection().anchorNode),
        content: { header: doc.querySelector(":scope > table").textContent,
          tags: [...doc.querySelectorAll(":scope > table [data-template-tag-value]")].map(el => el.dataset.templateTagValue),
          blocks: [...grid.querySelectorAll("[data-candidate-block-instance]")].map(el => el.textContent),
        },
      };
  };
  window.gridBoundaryDeletion = {
    inspect,
    async reload() {
      editor.setHtml(editor.getHtml());
      await new Promise(resolve => requestAnimationFrame(resolve));
      return inspect();
    },
    dispose: unmountTemplateEditorRuntime,
  };
}

module.exports = { runGridBoundaryDeletionCheck };
