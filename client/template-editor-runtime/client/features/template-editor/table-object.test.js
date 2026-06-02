const test = require("node:test");
const assert = require("node:assert/strict");

class FakeClassList {
  constructor(classNames = []) {
    this.classNames = new Set(classNames);
  }

  add(...classNames) {
    classNames.forEach((className) => this.classNames.add(className));
  }

  contains(className) {
    return this.classNames.has(className);
  }

  remove(...classNames) {
    classNames.forEach((className) => this.classNames.delete(className));
  }
}

class FakeElement {
  constructor({ attributes = {}, classNames = [], dataset = {}, parent = null, tagName = "DIV" } = {}) {
    this.attributes = { ...attributes };
    this.children = [];
    this.classList = new FakeClassList(classNames);
    this.dataset = { ...dataset };
    this.parentElement = null;
    this.tagName = tagName;

    if (parent) {
      parent.appendChild(this);
    }
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  closest(selector) {
    let currentElement = this;

    while (currentElement) {
      if (currentElement.matches(selector)) {
        return currentElement;
      }

      currentElement = currentElement.parentElement;
    }

    return null;
  }

  contains(element) {
    let currentElement = element;

    while (currentElement) {
      if (currentElement === this) {
        return true;
      }

      currentElement = currentElement.parentElement;
    }

    return false;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  matches(selector) {
    return String(selector || "")
      .split(",")
      .map((item) => item.trim())
      .some((item) => {
        if (item === "table") {
          return this.tagName === "TABLE";
        }

        if (item === "[data-candidate-block-grid]") {
          return Object.prototype.hasOwnProperty.call(this.dataset, "candidateBlockGrid");
        }

        if (item === "[data-candidate-block-instance]") {
          return Object.prototype.hasOwnProperty.call(this.dataset, "candidateBlockInstance");
        }

        if (item === ".examlist-candidate-block-grid") {
          return this.classList.contains("examlist-candidate-block-grid");
        }

        if (item === ".template-editor-table-selection") {
          return this.classList.contains("template-editor-table-selection");
        }

        return false;
      });
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      element.children.forEach((child) => {
        if (child.matches(selector)) {
          matches.push(child);
        }

        visit(child);
      });
    };

    visit(this);
    return matches;
  }
}

function createTableObjectController(surfaceElement) {
  const noop = () => {};
  const ownerWindow = {
    Element: FakeElement,
    Event: class FakeEvent {},
    HTMLElement: FakeElement,
    InputEvent: class FakeInputEvent {},
    getSelection: () => ({ removeAllRanges: noop }),
  };
  const ownerDocument = {
    createElement: (tagName) => new FakeElement({ tagName: String(tagName || "div").toUpperCase() }),
    defaultView: ownerWindow,
  };
  const { createTemplateEditorTableObjectController } = require("./table-object.js");

  globalThis.ExamListTemplateEditorTableObjectOverlay = require("./table-object-overlay.js");

  return createTemplateEditorTableObjectController({
    TABLE_EDGE_THRESHOLD: 6,
    TEMPLATE_EDITOR_TABLE_MIN_SIZE: 20,
    buildTemplateTableCellMap: () => [],
    clearTemplateEditorActiveCell: noop,
    clearTemplateEditorImageSelection: noop,
    clearTemplateEditorTableSelection: noop,
    ensureTemplateEditorTableColGroup: noop,
    getTemplateEditorDocumentElement: () => surfaceElement,
    getTemplateEditorImageOverlayContainer: () => surfaceElement,
    getTemplateEditorMeasuredColumnWidth: () => 0,
    getTemplateEditorModal: () => ({ classList: { contains: () => false } }),
    ownerDocument,
    ownerWindow,
    parseTemplateEditorPixelStyle: (_value, fallback = 0) => fallback,
    placeCaretAtEnd: noop,
    shell: { surfaceElement },
    state: { templateEditor: {} },
    syncTemplateEditorContent: noop,
    syncTemplateEditorTableWidth: noop,
    updateTemplateEditorFormattingControls: noop,
    updateTemplateTableControls: noop,
  });
}

test("template editor table object selection ignores candidate block column name row tables", () => {
  const previousElement = global.Element;
  const previousHTMLElement = global.HTMLElement;
  const previousOverlay = globalThis.ExamListTemplateEditorTableObjectOverlay;
  const previousWindow = global.window;
  const previousDocument = global.document;

  global.Element = FakeElement;
  global.HTMLElement = FakeElement;
  global.window = { getComputedStyle: () => ({}) };
  global.document = {};

  try {
    const surfaceElement = new FakeElement({ dataset: { editorDocumentSurface: "true" } });
    const controller = createTableObjectController(surfaceElement);
    const canvasTable = new FakeElement({ parent: surfaceElement, tagName: "TABLE" });
    const gridElement = new FakeElement({
      classNames: ["examlist-candidate-block-grid"],
      dataset: { candidateBlockGrid: "true" },
      parent: surfaceElement,
    });
    const columnNameElement = new FakeElement({
      classNames: ["examlist-candidate-block-column-name"],
      dataset: { candidateBlockColumnName: "true" },
      parent: gridElement,
    });
    const columnNameTable = new FakeElement({ parent: columnNameElement, tagName: "TABLE" });
    const dataBlockElement = new FakeElement({
      dataset: { candidateBlockInstance: "1", candidateBlockTemplateRole: "source" },
      parent: gridElement,
    });
    const dataBlockTable = new FakeElement({ parent: dataBlockElement, tagName: "TABLE" });
    const focusBlockElement = new FakeElement({
      classNames: ["is-candidate-block-focus-editor"],
      dataset: { candidateBlockInstance: "1", candidateBlockTemplateRole: "source" },
      parent: surfaceElement,
    });
    const focusEditorTable = new FakeElement({ parent: focusBlockElement, tagName: "TABLE" });

    assert.equal(controller.isTemplateEditorTableObjectElement(canvasTable), true);
    assert.equal(controller.isTemplateEditorTableObjectElement(columnNameTable), false);
    assert.equal(controller.isTemplateEditorTableObjectElement(dataBlockTable), false);
    assert.equal(controller.isTemplateEditorTableObjectElement(focusEditorTable), true);
  } finally {
    global.Element = previousElement;
    global.HTMLElement = previousHTMLElement;
    global.window = previousWindow;
    global.document = previousDocument;
    globalThis.ExamListTemplateEditorTableObjectOverlay = previousOverlay;
  }
});
