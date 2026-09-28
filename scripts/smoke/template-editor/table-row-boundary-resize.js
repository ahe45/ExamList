const assert = require("node:assert/strict");
const { evaluate, dispatchBrowserMouseDrag } = require("../../smoke-browser-cdp");
const { runTableRowResizeScenario } = require("./table-row-resize");

async function runTableRowBoundaryResizeCheck(client) {
  for (const modal of [false, true]) {
    for (const zoom of [1, 0.8, 1.25]) {
      await evaluate(client, `(${setup.toString()})(${zoom}, ${modal})`);
      try {
        const initial = await evaluate(client, "window.blockRowResize.read()");
        for (const delta of [-20, 35, -15, 12, -143, 20]) {
          const before = await evaluate(client, "window.blockRowResize.read()");
          await dispatchBrowserMouseDrag(client, before.point, { x: before.point.x, y: before.point.y + delta * before.scale });
          const after = await evaluate(client, "window.blockRowResize.settle()");
          assert.ok(Math.abs(after.rows[0] - before.rows[0] - delta) <= 2, JSON.stringify({ modal, zoom, delta, before, after }));
          assert.ok(Math.abs(after.rows[1] - before.rows[1] + delta) <= 2, "adjacent row must absorb the height change");
          assert.ok(Math.abs(after.height - initial.height) <= 2, "table height must remain fixed");
        }
        const beforeSave = await evaluate(client, "window.blockRowResize.read()");
        const reloaded = await evaluate(client, "window.blockRowResize.reload()");
        reloaded.rows.forEach((height, i) => assert.ok(Math.abs(height - beforeSave.rows[i]) <= 2, "Apply/reopen must retain row heights"));
      } finally {
        await evaluate(client, "window.blockRowResize.dispose()");
      }
    }
  }
  await evaluate(client, `(${setup.toString()})(1, false)`);
  try {
    await runTableRowResizeScenario({ client });
  } finally {
    await evaluate(client, "window.blockRowResize.dispose()");
  }
}

async function setup(zoom, modal, applicationEvents = false) {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const { openCandidateBlockFocusEditor, closeCandidateBlockFocusEditor } = await import("/client/features/template-editor/candidate-block-grid-focus-editor.js");
  const cell = '<td style="border:1px solid black;padding:0"><br></td>';
  const markup = `<table style="width:350px;height:310px;border-collapse:collapse;table-layout:fixed"><tbody><tr style="height:155px">${cell.repeat(5)}</tr><tr style="height:155px"><td colspan="5" style="border:1px solid black;padding:0"><br></td></tr></tbody></table>`;
  const page = { id: "row-resize", type: modal ? "content" : "cover", settings: { editorMode: "document",
    documentHtml: `<div class="template-doc">${modal ? '<div data-candidate-block-grid="true"></div>' : markup}</div>`,
    candidateBlockGrid: { enabled: true, variant: "photo", columns: 2, rows: 1, widthPt: 530, heightPt: 240, blockTemplateHtml: markup },
  } };
  const template = { id: "row-resize", name: "행 높이", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { template, selectedPageId: page.id, dataTags: { groups: [] } } };
  const access = { permissions: { manageTemplates: true } };
  if (applicationEvents) {
    const { setupTemplateEditorActions } = await import("/client/features/template-editor/actions.js");
    appState.summary = access;
    setupTemplateEditorActions({ appState, navigateToPath() {}, onStateChange() {}, templatesActions: {} });
  }
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  surface.style.transform = `scale(${zoom})`;
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "/styles/features/template-editor/document-surface.css";
  await new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; document.head.append(css); });
  const open = () => openCandidateBlockFocusEditor({ blockElement: surface.querySelector('[data-candidate-block-template-role="source"]'), editor, surfaceElement: surface, selectedPage: page, onDirty() {} });
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(read()))));
  const read = () => {
    const table = surface.querySelector(modal ? '[data-candidate-block-modal-editor-surface] table' : '.template-doc table');
    const rect = table.getBoundingClientRect(), cellRect = table.rows[0].cells[0].getBoundingClientRect();
    const scale = rect.height / table.offsetHeight;
    return { height: table.offsetHeight, rows: Array.from(table.rows, row => row.getBoundingClientRect().height / scale), scale,
      point: { x: cellRect.left + cellRect.width / 2, y: cellRect.bottom - 1 } };
  };
  if (modal) open();
  await settle();
  window.blockRowResize = { read, settle,
    async reload() {
      if (modal) { closeCandidateBlockFocusEditor(); open(); }
      else editor.setHtml(editor.getHtml());
      return settle();
    },
    dispose() { closeCandidateBlockFocusEditor(); unmountTemplateEditorRuntime(); css.remove(); },
  };
}

module.exports = { runTableRowBoundaryResizeCheck, setupTableSizing: setup };
