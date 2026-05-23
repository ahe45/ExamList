const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplateEditorEventController } = require("./template-editor-events.js");

function createFakeEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    getListener(type) {
      return listeners.get(type);
    },
    contains() {
      return false;
    },
  };
}

function createRuntimeEventHarness() {
  const modal = createFakeEventTarget();
  const ownerDocument = createFakeEventTarget();
  const ownerWindow = createFakeEventTarget();
  const shellSurface = createFakeEventTarget();
  const surface = {
    dataset: {},
    matches: () => false,
    contains: () => false,
  };
  const syncCalls = [];
  const noop = () => {};

  ownerWindow.Element = class FakeElement {};

  const controller = createTemplateEditorEventController({
    applyTemplateEditorFontFamily: noop,
    applyTemplateEditorFontSize: noop,
    applyToolbarColorTrigger: noop,
    applyToolbarHexColorInput: noop,
    clearTemplateEditorImageSelection: noop,
    clearTemplateEditorTableHoverState: noop,
    clearTemplateEditorTableObjectHoverState: noop,
    clearTemplateEditorTableObjectSelection: noop,
    clearTemplateEditorTableSelection: noop,
    getTemplateEditorImageTarget: () => null,
    getTemplateEditorModal: () => modal,
    getTemplateEditorSurface: () => surface,
    handleClick: noop,
    handleKeydown: noop,
    handleTemplateEditorTableObjectPointerDown: () => false,
    handleTemplateEditorTablePointerDown: () => false,
    handleTemplatePageSettingChange: () => false,
    handleTemplateTableAction: noop,
    insertTemplateImage: noop,
    ownerDocument,
    ownerWindow,
    saveTemplateEditorSelection: noop,
    selectTemplateEditorImage: noop,
    shell: { surfaceElement: shellSurface },
    startTemplateEditorImageMoveSession: noop,
    state: { templateEditor: {} },
    syncTemplateEditorContent: (...args) => {
      syncCalls.push(args);
    },
    toolbar: {
      closeAllEditorToolbarBorderSelectMenus: noop,
      closeAllEditorToolbarColorPanels: noop,
      closeAllEditorToolbarFontSizeMenus: noop,
      closeAllEditorToolbarTableInsertPanels: noop,
      syncEditorToolbarFontSizeMenuSelection: noop,
    },
    toolbarElements: {
      fontFamily: {},
      fontSize: {},
      imageInput: {},
    },
    toolbarIds: {
      borderColor: "borderColor",
      borderStyle: "borderStyle",
      borderTarget: "borderTarget",
      borderWidth: "borderWidth",
      cellPaddingBottom: "cellPaddingBottom",
      cellPaddingLeft: "cellPaddingLeft",
      cellPaddingRight: "cellPaddingRight",
      cellPaddingTop: "cellPaddingTop",
      cellShading: "cellShading",
      cellSplitPanel: "cellSplitPanel",
      fontFamily: "fontFamily",
      fontSize: "fontSize",
      tableColumns: "tableColumns",
      tableRows: "tableRows",
      textColor: "textColor",
      textShading: "textShading",
    },
    updateTemplateEditorActiveCell: noop,
    updateTemplateEditorFormattingControls: noop,
    updateTemplateEditorImageSelectionOverlay: noop,
    updateTemplateEditorTableHoverState: noop,
    updateTemplateEditorTableObjectHoverState: noop,
    updateTemplateEditorTableObjectOverlay: noop,
    updateTemplateTableControls: noop,
  });

  controller.bindEvents();

  return {
    handleInput: modal.getListener("input"),
    surface,
    syncCalls,
  };
}

test("template editor runtime input sync waits until IME composition is committed", () => {
  const { handleInput, surface, syncCalls } = createRuntimeEventHarness();

  handleInput({ inputType: "insertCompositionText", isComposing: true, target: surface });
  handleInput({ inputType: "insertCompositionText", isComposing: false, target: surface });
  handleInput({ inputType: "deleteCompositionText", isComposing: false, target: surface });

  assert.equal(syncCalls.length, 0);

  handleInput({ inputType: "insertText", isComposing: false, target: surface });

  assert.equal(syncCalls.length, 1);
});
