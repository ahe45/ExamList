const test = require("node:test");
const assert = require("node:assert/strict");

const noop = () => {};

class FakeElement {
  constructor({ closestMap = {}, contains = () => false } = {}) {
    this.closestMap = closestMap;
    this.contains = contains;
    this.dataset = {};
  }

  closest(selector = "") {
    const normalizedSelector = String(selector || "");

    return Object.entries(this.closestMap).find(([key]) => normalizedSelector.includes(key))?.[1] || null;
  }
}

global.Element = FakeElement;
global.ExamListTemplateEditorToolbarRendering = {
  createTemplateEditorToolbarRenderingController: () => ({
    renderPagePropertiesPanel: noop,
    renderTagPanel: noop,
    renderToolbar: noop,
  }),
};
global.ExamListTemplateEditorToolbarColorInteractions = {
  createTemplateEditorToolbarColorInteractionController: () => ({
    applyToolbarColorTrigger: noop,
    applyToolbarHexColorInput: noop,
  }),
};

const { createTemplateEditorToolbarInteractionController } = require("./toolbar-interactions.js");

test("cell split toggle opens the panel without moving focus to the count input", () => {
  const focusCalls = [];
  const selectCalls = [];
  const visibilityCalls = [];
  const cellSplitToggle = new FakeElement();
  const modalElement = new FakeElement({
    contains: (target) => target === cellSplitToggle,
  });

  cellSplitToggle.closestMap["[data-template-cell-split-toggle]"] = cellSplitToggle;

  const { handleClick } = createTemplateEditorToolbarInteractionController({
    TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY: "",
    TEMPLATE_EDITOR_DEFAULT_FONT_SIZE: 11,
    applyTemplateEditorCommand: noop,
    applyTemplateEditorFontFamily: noop,
    applyTemplateEditorFontSize: noop,
    applyTemplateTableSize: noop,
    escapeAttribute: String,
    escapeHtml: String,
    getElementById: () => null,
    getTemplateEditorCellSplitConfig: () => null,
    getTemplateEditorModal: () => modalElement,
    handleTemplateEditorInsert: noop,
    handleTemplateTableAction: noop,
    insertTemplateImageSource: noop,
    options: {},
    pageSettings: {},
    setTemplateEditorCellSplitPanelVisibility: (isVisible) => {
      visibilityCalls.push(isVisible);
    },
    setTemplateEditorStatus: noop,
    shell: {},
    tagDefinitions: [],
    toolbar: {},
    toolbarElements: {
      cellSplitCount: {
        focus: () => focusCalls.push(true),
        select: () => selectCalls.push(true),
      },
      cellSplitPanel: {
        classList: {
          contains: (className) => className === "hidden",
        },
      },
    },
    toolbarIds: {},
  });

  handleClick({
    preventDefault: noop,
    target: cellSplitToggle,
  });

  assert.deepEqual(visibilityCalls, [true]);
  assert.deepEqual(focusCalls, []);
  assert.deepEqual(selectCalls, []);
});

test("cell split axis option checks the radio without closing the panel", () => {
  const visibilityCalls = [];
  const rowInput = { checked: false };
  const cellSplitPanel = {
    querySelector: (selector) =>
      String(selector || "").includes('value="row"') ? rowInput : null,
  };
  const cellSplitAxisOption = new FakeElement();
  const modalElement = new FakeElement({
    contains: (target) => target === cellSplitAxisOption,
  });
  let didPreventDefault = false;

  cellSplitAxisOption.dataset.templateCellSplitAxisOption = "row";
  cellSplitAxisOption.closestMap["[data-template-cell-split-axis-option]"] = cellSplitAxisOption;
  cellSplitAxisOption.closestMap[".template-toolbar-cell-split-panel"] = cellSplitPanel;

  const { handleClick } = createTemplateEditorToolbarInteractionController({
    TEMPLATE_EDITOR_DEFAULT_FONT_FAMILY: "",
    TEMPLATE_EDITOR_DEFAULT_FONT_SIZE: 11,
    applyTemplateEditorCommand: noop,
    applyTemplateEditorFontFamily: noop,
    applyTemplateEditorFontSize: noop,
    applyTemplateTableSize: noop,
    escapeAttribute: String,
    escapeHtml: String,
    getElementById: () => null,
    getTemplateEditorCellSplitConfig: () => null,
    getTemplateEditorModal: () => modalElement,
    handleTemplateEditorInsert: noop,
    handleTemplateTableAction: noop,
    insertTemplateImageSource: noop,
    options: {},
    pageSettings: {},
    setTemplateEditorCellSplitPanelVisibility: (isVisible) => {
      visibilityCalls.push(isVisible);
    },
    setTemplateEditorStatus: noop,
    shell: {},
    tagDefinitions: [],
    toolbar: {},
    toolbarElements: {
      cellSplitCount: null,
      cellSplitPanel,
    },
    toolbarIds: {},
  });

  handleClick({
    preventDefault: () => {
      didPreventDefault = true;
    },
    target: cellSplitAxisOption,
  });

  assert.equal(rowInput.checked, true);
  assert.equal(didPreventDefault, true);
  assert.deepEqual(visibilityCalls, []);
});
