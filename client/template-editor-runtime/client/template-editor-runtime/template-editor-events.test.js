const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplateEditorEventController } = require("./template-editor-events.js");

function createFakeEventTarget({ contains = () => false } = {}) {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || [];

      typeListeners.push(listener);
      listeners.set(type, typeListeners);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    getListener(type) {
      return listeners.get(type)?.at(-1);
    },
    getListeners(type) {
      return listeners.get(type) || [];
    },
    contains(target) {
      return contains(target);
    },
  };
}

function createRuntimeEventHarness({
  modalContains = () => false,
  surfaceContains = () => false,
  toolbarContains = () => false,
} = {}) {
  const modal = createFakeEventTarget({ contains: modalContains });
  const ownerDocument = createFakeEventTarget();
  const ownerWindow = createFakeEventTarget();
  const shellSurface = createFakeEventTarget();
  const toolbarHost = createFakeEventTarget({ contains: toolbarContains });
  const surface = {
    dataset: {},
    matches: () => false,
    contains: surfaceContains,
  };
  const syncCalls = [];
  const selectionSaveCalls = [];
  const historyCalls = [];
  const state = { templateEditor: {} };
  const noop = () => {};

  ownerWindow.Element = class FakeElement {};
  ownerWindow.getSelection = () => ({
    anchorNode: ownerWindow.selectionAnchorNode || null,
    getRangeAt: () => ({ commonAncestorContainer: ownerWindow.selectionAnchorNode || null }),
    rangeCount: ownerWindow.selectionAnchorNode ? 1 : 0,
  });
  ownerWindow.setTimeout = (callback) => {
    callback();
    return 0;
  };

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
    saveTemplateEditorSelection: () => {
      selectionSaveCalls.push(true);
    },
    selectTemplateEditorImage: noop,
    shell: {
      surfaceElement: shellSurface,
      toolbarHost,
    },
    startTemplateEditorImageMoveSession: noop,
    state,
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
    redoTemplateEditorHistory: () => {
      historyCalls.push("redo");
    },
    undoTemplateEditorHistory: () => {
      historyCalls.push("undo");
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
    handleBeforeInput: modal.getListener("beforeinput"),
    handleCompositionEnd: modal.getListener("compositionend"),
    handleInput: modal.getListener("input"),
    handlePointerDown: modal.getListener("pointerdown"),
    handlePointerDownCapture: modal.getListeners("pointerdown")[0],
    handleSelectionChange: ownerDocument.getListener("selectionchange"),
    FakeElement: ownerWindow.Element,
    historyCalls,
    ownerDocument,
    ownerWindow,
    selectionSaveCalls,
    state,
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

test("template editor runtime syncs after IME composition is committed", () => {
  const { handleCompositionEnd, handleInput, surface, syncCalls } = createRuntimeEventHarness();

  handleInput({ inputType: "insertCompositionText", isComposing: false, target: surface });

  assert.equal(syncCalls.length, 0);

  handleCompositionEnd({ target: surface });

  assert.equal(syncCalls.length, 1);
});

test("template editor runtime blocks native undo beforeinput and uses custom history", () => {
  const { handleBeforeInput, historyCalls, surface } = createRuntimeEventHarness();
  let didPreventDefault = false;

  handleBeforeInput({
    inputType: "historyUndo",
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: surface,
  });

  assert.equal(didPreventDefault, true);
  assert.deepEqual(historyCalls, ["undo"]);
});

test("template editor runtime suppresses native history after keyboard shortcut handled it", () => {
  const { handleBeforeInput, historyCalls, state, surface } = createRuntimeEventHarness();
  let didPreventDefault = false;

  state.templateEditor.suppressedNativeHistoryInputType = "historyRedo";
  handleBeforeInput({
    inputType: "historyRedo",
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: surface,
  });

  assert.equal(didPreventDefault, true);
  assert.deepEqual(historyCalls, []);
  assert.equal(state.templateEditor.suppressedNativeHistoryInputType, undefined);
});

test("template editor runtime ignores toolbar focus selectionchange", () => {
  let toolbarControl = null;
  let selectionAnchorNode = null;
  const {
    FakeElement,
    handleSelectionChange,
    ownerDocument,
    ownerWindow,
    selectionSaveCalls,
  } = createRuntimeEventHarness({
    surfaceContains: (target) => target === selectionAnchorNode,
    toolbarContains: (target) => target === toolbarControl,
  });

  toolbarControl = new FakeElement();
  selectionAnchorNode = new FakeElement();
  ownerDocument.activeElement = toolbarControl;
  ownerWindow.selectionAnchorNode = selectionAnchorNode;

  handleSelectionChange();

  assert.equal(selectionSaveCalls.length, 0);
});

test("template editor runtime ignores pending toolbar root selectionchange before focus moves", () => {
  const {
    handleSelectionChange,
    ownerDocument,
    ownerWindow,
    selectionSaveCalls,
    state,
    surface,
  } = createRuntimeEventHarness({
    surfaceContains: (target) => target === surface,
  });

  ownerDocument.activeElement = null;
  ownerWindow.selectionAnchorNode = surface;
  state.templateEditor.suppressToolbarSelectionChange = true;

  handleSelectionChange();

  assert.equal(selectionSaveCalls.length, 0);
  assert.equal(state.templateEditor.suppressToolbarSelectionChange, true);
});

test("template editor runtime does not overwrite saved selection while toolbar selection is suppressed", () => {
  let commandElement = null;
  const { FakeElement, handlePointerDown, selectionSaveCalls, state } = createRuntimeEventHarness({
    modalContains: (target) => target === commandElement,
  });
  let didPreventDefault = false;

  commandElement = new FakeElement();
  commandElement.closest = (selector) =>
    String(selector || "").includes("[data-template-command]") ? commandElement : null;
  state.templateEditor.suppressToolbarSelectionChange = true;

  handlePointerDown({
    button: 0,
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: commandElement,
  });

  assert.equal(selectionSaveCalls.length, 0);
  assert.equal(didPreventDefault, true);
});

test("template editor runtime captures toolbar selection control before browser focus moves", () => {
  let fontFamilyElement = null;
  const { FakeElement, handlePointerDown, handlePointerDownCapture, selectionSaveCalls, state } =
    createRuntimeEventHarness({
      modalContains: (target) => target === fontFamilyElement,
    });

  fontFamilyElement = new FakeElement();
  fontFamilyElement.closest = (selector) =>
    String(selector || "").includes("#fontFamily") ? fontFamilyElement : null;

  handlePointerDownCapture({
    button: 0,
    preventDefault: () => {},
    target: fontFamilyElement,
  });
  handlePointerDown({
    button: 0,
    preventDefault: () => {},
    target: fontFamilyElement,
  });

  assert.equal(selectionSaveCalls.length, 1);
  assert.equal(state.templateEditor.suppressToolbarSelectionChange, true);
});

test("template editor runtime lets candidate block column height input receive focus", () => {
  let heightInputElement = null;
  let didHandleTableObjectPointer = false;
  const modal = createFakeEventTarget({ contains: (target) => target === heightInputElement });
  const ownerDocument = createFakeEventTarget();
  const ownerWindow = createFakeEventTarget();
  const toolbarHost = createFakeEventTarget();
  const state = { templateEditor: {} };
  const noop = () => {};
  const selectionSaveCalls = [];

  ownerWindow.Element = class FakeElement {};
  ownerWindow.getSelection = () => ({
    anchorNode: null,
    rangeCount: 0,
  });
  ownerWindow.setTimeout = (callback) => {
    callback();
    return 0;
  };

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
    getTemplateEditorSurface: () => ({ contains: () => true, dataset: {}, matches: () => false }),
    handleClick: noop,
    handleKeydown: noop,
    handleTemplateEditorTableObjectPointerDown: () => {
      didHandleTableObjectPointer = true;
      return true;
    },
    handleTemplateEditorTablePointerDown: () => false,
    handleTemplatePageSettingChange: () => false,
    handleTemplateTableAction: noop,
    insertTemplateImage: noop,
    ownerDocument,
    ownerWindow,
    saveTemplateEditorSelection: () => {
      selectionSaveCalls.push(true);
    },
    selectTemplateEditorImage: noop,
    shell: {
      surfaceElement: createFakeEventTarget(),
      toolbarHost,
    },
    startTemplateEditorImageMoveSession: noop,
    state,
    syncTemplateEditorContent: noop,
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
    redoTemplateEditorHistory: noop,
    undoTemplateEditorHistory: noop,
    updateTemplateEditorActiveCell: noop,
    updateTemplateEditorFormattingControls: noop,
    updateTemplateEditorImageSelectionOverlay: noop,
    updateTemplateEditorTableHoverState: noop,
    updateTemplateEditorTableObjectHoverState: noop,
    updateTemplateEditorTableObjectOverlay: noop,
    updateTemplateTableControls: noop,
  });

  controller.bindEvents();
  heightInputElement = new ownerWindow.Element();
  heightInputElement.closest = (selector) =>
    String(selector || "").includes("[data-candidate-block-column-name-row-height-px]")
      ? heightInputElement
      : null;

  modal.getListeners("pointerdown")[0]({
    button: 0,
    preventDefault: () => {},
    target: heightInputElement,
  });
  modal.getListener("pointerdown")({
    button: 0,
    preventDefault: () => {},
    target: heightInputElement,
  });

  assert.equal(selectionSaveCalls.length, 1);
  assert.equal(state.templateEditor.suppressToolbarSelectionChange, true);
  assert.equal(didHandleTableObjectPointer, false);
});

test("template editor runtime suppresses toolbar trigger selectionchange before click", () => {
  let splitToggleElement = null;
  const { FakeElement, handlePointerDown, handlePointerDownCapture, selectionSaveCalls, state } =
    createRuntimeEventHarness({
      modalContains: (target) => target === splitToggleElement,
    });

  splitToggleElement = new FakeElement();
  splitToggleElement.closest = (selector) =>
    String(selector || "").includes("[data-template-cell-split-toggle]") ? splitToggleElement : null;

  handlePointerDownCapture({
    button: 0,
    preventDefault: () => {},
    target: splitToggleElement,
  });
  handlePointerDown({
    button: 0,
    preventDefault: () => {},
    target: splitToggleElement,
  });

  assert.equal(selectionSaveCalls.length, 1);
  assert.equal(state.templateEditor.suppressToolbarSelectionChange, true);
});

test("template editor runtime treats cell split axis choice as a focus-preserving toolbar trigger", () => {
  let splitAxisElement = null;
  const { FakeElement, handlePointerDown, handlePointerDownCapture, selectionSaveCalls, state } =
    createRuntimeEventHarness({
      modalContains: (target) => target === splitAxisElement,
    });
  let didPreventDefault = false;

  splitAxisElement = new FakeElement();
  splitAxisElement.closest = (selector) =>
    String(selector || "").includes("[data-template-cell-split-axis-option]") ? splitAxisElement : null;

  const event = {
    button: 0,
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: splitAxisElement,
  };

  handlePointerDownCapture(event);
  handlePointerDown(event);

  assert.equal(selectionSaveCalls.length, 1);
  assert.equal(state.templateEditor.suppressToolbarSelectionChange, true);
  assert.equal(didPreventDefault, true);
});

test("template editor runtime preserves selection for border width dropdown options", () => {
  let borderWidthOptionElement = null;
  const { FakeElement, handlePointerDown, selectionSaveCalls } = createRuntimeEventHarness({
    modalContains: (target) => target === borderWidthOptionElement,
  });
  let didPreventDefault = false;

  borderWidthOptionElement = new FakeElement();
  borderWidthOptionElement.closest = (selector) =>
    String(selector || "").includes("[data-editor-border-width-option]") ? borderWidthOptionElement : null;

  handlePointerDown({
    button: 0,
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: borderWidthOptionElement,
  });

  assert.equal(selectionSaveCalls.length, 1);
  assert.equal(didPreventDefault, true);
});

test("template editor runtime reapplies table selection visual state after toolbar focus", () => {
  let fontFamilyElement = null;
  let selectedCell = null;
  const { FakeElement, handlePointerDownCapture, state, surface } = createRuntimeEventHarness({
    modalContains: (target) => target === fontFamilyElement,
    surfaceContains: (target) => target === selectedCell,
  });
  const addedClasses = [];

  fontFamilyElement = new FakeElement();
  fontFamilyElement.closest = (selector) =>
    String(selector || "").includes("#fontFamily") ? fontFamilyElement : null;
  selectedCell = {
    classList: {
      add: (...classNames) => addedClasses.push(...classNames),
    },
    isConnected: true,
  };
  surface.contains = (target) => target === selectedCell;
  state.templateEditor.tableSelection = {
    selectedCells: [selectedCell],
  };

  handlePointerDownCapture({
    button: 0,
    preventDefault: () => {},
    target: fontFamilyElement,
  });

  assert.deepEqual(addedClasses, ["is-selected-cell"]);
});

test("template editor data tag accordion pointerdown preserves editor selection", () => {
  let summaryElement = null;
  const { FakeElement, handlePointerDown, selectionSaveCalls } = createRuntimeEventHarness({
    modalContains: (target) => target === summaryElement,
  });
  let didPreventDefault = false;

  summaryElement = new FakeElement();
  summaryElement.closest = (selector) =>
    String(selector || "").includes(".template-tag-accordion-summary") ? summaryElement : null;

  handlePointerDown({
    button: 0,
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: summaryElement,
  });

  assert.equal(selectionSaveCalls.length, 1);
  assert.equal(didPreventDefault, true);
});
