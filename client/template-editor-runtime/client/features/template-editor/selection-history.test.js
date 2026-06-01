const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplateEditorSelectionHistoryController } = require("./selection-history.js");

function createSelectionHistoryHarness() {
  const surface = {
    innerHTML: "",
    dataset: {},
    ownerDocument: {
      defaultView: {
        setTimeout() {
          return 0;
        },
      },
    },
    getBoundingClientRect: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
    matches: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const state = {
    templateEditor: {
      draftHtml: "",
      historyEntries: [],
      historyIndex: -1,
    },
  };
  const noop = () => {};

  const controller = createTemplateEditorSelectionHistoryController({
    TEMPLATE_EDITOR_HISTORY_LIMIT: 20,
    clearTemplateEditorImageSelection: noop,
    clearTemplateEditorTableSelection: noop,
    createTemplateEditorSelectionSnapshot: () => ({ marker: "selection" }),
    decorateTemplateEditorImages: noop,
    getTemplateEditorActiveTableSelection: () => null,
    getTemplateEditorSerializedHtml: () => surface.innerHTML,
    getTemplateEditorSurface: () => surface,
    normalizeTemplateEditorFontNodes: noop,
    normalizeTemplateEditorTables: noop,
    normalizeTemplateTagNodes: noop,
    placeCaretAtTemplateEditorEnd: noop,
    releaseTemplateEditorTableResizeSession: noop,
    releaseTemplateEditorTableSelectionSession: noop,
    restoreTemplateEditorSelectionSnapshot: () => true,
    saveTemplateEditorSelection: noop,
    setTemplateEditorStatus: noop,
    state,
    updateTemplateEditorActiveCell: noop,
    updateTemplateEditorFormattingControls: noop,
    updateTemplateEditorImageSelectionOverlay: noop,
    updateTemplateTableControls: noop,
  });

  return { controller, state, surface };
}

test("template editor undo skips duplicate snapshot when the current draft is already recorded", () => {
  const { controller, state, surface } = createSelectionHistoryHarness();

  state.templateEditor.historyEntries = [
    { html: "<p>before</p>", selection: null },
    { html: "<p>after</p>", selection: null },
  ];
  state.templateEditor.historyIndex = 1;
  state.templateEditor.draftHtml = "<p>after</p>";
  surface.innerHTML = '<p data-runtime-state="volatile">after</p>';

  controller.undoTemplateEditorHistory();

  assert.equal(state.templateEditor.historyEntries.length, 2);
  assert.equal(state.templateEditor.historyIndex, 0);
  assert.equal(surface.innerHTML, "<p>before</p>");
});
