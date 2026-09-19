const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runCellObjectAlignmentCheck(client) {
  for (const modal of [false, true]) {
    await evaluate(client, `(${setupCellObjectAlignment.toString()})(${modal})`);
    try {
      const initial = await evaluate(client, "window.cellObjectAlignment.inspect()");
      assert.equal(initial.enabled, true, "cell object alignment options must be enabled");
      assert.equal(initial.reference, "기준: 셀");
      for (const alignment of ["right", "bottom", "center-x", "center-y", "left", "top"]) {
        const result = await evaluate(client, `window.cellObjectAlignment.align('${alignment}')`);
        assert.equal(result.inCell, true, "alignment must retain cell ownership");
        const expected = alignment === "left" ? result.minX : alignment === "right" ? result.maxX
          : alignment === "center-x" ? (result.minX + result.maxX) / 2 : alignment === "top" ? result.minY
          : alignment === "bottom" ? result.maxY : (result.minY + result.maxY) / 2;
        const actual = ["left", "center-x", "right"].includes(alignment) ? result.left : result.top;
        assert.ok(Math.abs(actual - expected) < 2, `${modal ? "modal" : "page"} ${alignment}: ${actual} != ${expected}`);
        assert.ok(Math.abs(result.tableHeight - initial.tableHeight) < 2, "alignment must not resize the table");
        assert.deepEqual(result.size.map(Math.round), initial.size.map(Math.round), "alignment must retain object dimensions");
        assert.deepEqual(result.cssSize, initial.cssSize, "repeated alignment must not gradually shrink the object");
        assert.equal(result.otherText, initial.otherText, "alignment must not change other cells");
      }
      if (!modal) {
        const history = await evaluate(client, "window.cellObjectAlignment.checkHistory()");
        assert.ok(history.undoTop > history.redoTop + 1, "undo/redo must restore the object position");
      }
      const saved = await evaluate(client, "window.cellObjectAlignment.reload()");
      assert.equal(saved.inCell, true, "cell ownership must survive save/reload or modal Apply");
      assert.ok(Math.abs(saved.left - saved.minX) < 2 && Math.abs(saved.top - saved.minY) < 2,
        "cell alignment must survive save/reload or modal Apply");
      if (modal) {
        const cancelled = await evaluate(client, "window.cellObjectAlignment.checkCancel()");
        assert.ok(Math.abs(cancelled.left - cancelled.minX) < 2, "cancelling modal alignment must preserve the applied position");
      }
    } finally { await evaluate(client, "window.cellObjectAlignment.dispose()"); }
  }
}

async function setupCellObjectAlignment(modal) {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const { applyObjectAlignmentSelection } = await import("/client/features/template-editor/object-alignment-selection.js");
  const { openCandidateBlockFocusEditor, closeCandidateBlockFocusEditor, cancelCandidateBlockFocusEditor } = await import("/client/features/template-editor/candidate-block-grid-focus-editor.js");
  const markup = '<table style="width:500px;height:160px;border-collapse:collapse"><tr style="height:80px"><td rowspan="2" style="padding:10px 16px;height:160px;width:300px;border:2px solid black"><span><img class="template-generated-object template-generated-object-barcode" data-template-object-type="barcode" data-template-object-source="candidate.examNo" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2230%22/%3E" style="width:100px;height:30px"></span></td><td>다른 셀</td></tr><tr style="height:80px"><td>유지할 내용</td></tr></table>';
  const page = { id: "cell-align-page", type: modal ? "content" : "cover", settings: { editorMode: "document",
    documentHtml: `<div class="template-doc">${modal ? '<div data-candidate-block-grid="true"></div>' : markup}</div>`,
    candidateBlockGrid: { enabled: true, variant: "photo", columns: 1, rows: 1, widthPt: 400, heightPt: 160, blockTemplateHtml: markup },
  } };
  const template = { id: "cell-align", name: "셀 개체 정렬", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { template, selectedPageId: page.id, dataTags: { groups: [] } } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/styles/features/template-editor/document-surface.css";
  await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; document.head.append(css); });
  surface.style.transform = "scale(0.8)";
  const open = () => openCandidateBlockFocusEditor({
    blockElement: surface.querySelector('[data-candidate-block-template-role="source"]'),
    editor, surfaceElement: surface, selectedPage: page, onDirty() {},
  });
  if (modal) open();
  const content = () => modal ? surface.querySelector("[data-candidate-block-modal-editor-surface]") : surface.querySelector(".template-doc");
  const image = () => content().querySelector("img");
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  applyObjectAlignmentSelection(editor, surface, [image()]);
  document.dispatchEvent(new Event("selectionchange"));
  await settle();
  const inspect = () => {
    const img = image(), cell = img.closest("td"), rect = cell.getBoundingClientRect(), objectRect = img.getBoundingClientRect();
    const sx = rect.width / cell.offsetWidth, sy = rect.height / cell.offsetHeight, style = getComputedStyle(cell);
    return { enabled: !root.querySelector('[data-examlist-object-align="align-center-x"]').disabled,
      reference: root.querySelector("[data-examlist-object-align-reference]").textContent,
      inCell: !!cell, left: (objectRect.left - rect.left) / sx - cell.clientLeft, top: (objectRect.top - rect.top) / sy - cell.clientTop,
      minX: parseFloat(style.paddingLeft), maxX: cell.clientWidth - parseFloat(style.paddingRight) - objectRect.width / sx,
      minY: parseFloat(style.paddingTop), maxY: cell.clientHeight - parseFloat(style.paddingBottom) - objectRect.height / sy,
      size: [objectRect.width / sx, objectRect.height / sy], tableHeight: cell.closest("table").offsetHeight,
      cssSize: [getComputedStyle(img).width, getComputedStyle(img).height],
      cellSize: [cell.clientWidth, cell.clientHeight],
      otherText: [...cell.closest("table").querySelectorAll("td")].slice(1).map(el => el.textContent).join(),
    };
  };
  window.cellObjectAlignment = {
    inspect,
    clickPoint() {
      surface.ownerDocument.activeElement?.blur();
      const rect = image().getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    },
    textPoint() {
      const text = content().querySelector("td").nextElementSibling.firstChild;
      const range = document.createRange(); range.setStart(text, 1); range.collapse(true);
      const rect = range.getBoundingClientRect();
      return { x: rect.left + 0.2, y: rect.top + rect.height / 2 };
    },
    async align(alignment) {
      root.querySelector(`[data-examlist-object-align="align-${alignment}"]`).click();
      await settle();
      return inspect();
    },
    async reload() {
      if (modal) { closeCandidateBlockFocusEditor(); open(); }
      else { editor.setHtml(editor.getHtml()); }
      await settle();
      return inspect();
    },
    async checkHistory() {
      editor.undo(); await settle(); const undoTop = inspect().top;
      editor.redo(); await settle(); return { undoTop, redoTop: inspect().top };
    },
    async checkCancel() {
      applyObjectAlignmentSelection(editor, surface, [image()]);
      document.dispatchEvent(new Event("selectionchange")); await settle();
      root.querySelector('[data-examlist-object-align="align-right"]').click(); await settle();
      cancelCandidateBlockFocusEditor(); open(); await settle(); return inspect();
    },
    dispose() { closeCandidateBlockFocusEditor(); unmountTemplateEditorRuntime(); css.remove(); },
  };
}

module.exports = { runCellObjectAlignmentCheck, setupCellObjectAlignment };
