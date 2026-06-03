const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeAttribute {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}

class FakeElement {
  constructor(tagName, attributes = {}) {
    this.attributesMap = new Map(Object.entries(attributes));
    this.childNodes = [];
    this.nodeType = global.Node.ELEMENT_NODE;
    this.tagName = tagName.toUpperCase();
  }

  get attributes() {
    return Array.from(this.attributesMap, ([name, value]) => new FakeAttribute(name, value));
  }

  append(...children) {
    this.childNodes.push(...children);
  }

  removeAttribute(name) {
    this.attributesMap.delete(name);
  }

  setAttribute(name, value) {
    this.attributesMap.set(name, value);
  }

  getAttribute(name) {
    return this.attributesMap.get(name) ?? null;
  }
}

test("document sanitizer preserves candidate block explicit grid placement", async () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  const { sanitizeNodeTree } = await importClientModule("document-editor-sanitizer.js");
  const root = new FakeElement("div");
  const block = new FakeElement("div", {
    "data-candidate-block-grid-column": "2",
    "data-candidate-block-grid-row": "4",
    "data-candidate-block-instance": "2",
    style: "grid-row: 4; grid-column: 2; color: #111; bad-property: 1",
  });

  root.append(block);
  sanitizeNodeTree(root);

  assert.equal(block.getAttribute("data-candidate-block-grid-row"), "4");
  assert.equal(block.getAttribute("data-candidate-block-grid-column"), "2");
  assert.equal(block.getAttribute("data-candidate-block-instance"), "2");
  assert.equal(block.getAttribute("style"), "grid-row: 4; grid-column: 2; color: #111");
});

test("document sanitizer preserves browser serialized candidate block grid-area placement", async () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  const { sanitizeNodeTree } = await importClientModule("document-editor-sanitizer.js");
  const root = new FakeElement("div");
  const block = new FakeElement("div", {
    "data-candidate-block-grid-column": "2",
    "data-candidate-block-grid-row": "4",
    "data-candidate-block-instance": "2",
    style: "grid-area: 4 / 2; color: #111; bad-property: 1",
  });

  root.append(block);
  sanitizeNodeTree(root);

  assert.equal(block.getAttribute("data-candidate-block-grid-row"), "4");
  assert.equal(block.getAttribute("data-candidate-block-grid-column"), "2");
  assert.equal(block.getAttribute("data-candidate-block-instance"), "2");
  assert.equal(block.getAttribute("style"), "grid-area: 4 / 2; color: #111");
});

test("document sanitizer preserves candidate block column row metadata", async () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  const { sanitizeNodeTree } = await importClientModule("document-editor-sanitizer.js");
  const root = new FakeElement("div");
  const grid = new FakeElement("div", {
    "data-candidate-block-column-name-row-enabled": "true",
    "data-candidate-block-column-name-row-height-pt": "20",
    "data-candidate-block-gap-xpt": "4",
    "data-candidate-block-gap-ypt": "4",
    "data-candidate-block-grid": "true",
  });
  const columnName = new FakeElement("div", {
    "data-candidate-block-column-name": "true",
    "data-candidate-block-grid-column": "1",
    "data-candidate-block-grid-row": "1",
  });

  grid.append(columnName);
  root.append(grid);
  sanitizeNodeTree(root);

  assert.equal(grid.getAttribute("data-candidate-block-column-name-row-enabled"), "true");
  assert.equal(grid.getAttribute("data-candidate-block-column-name-row-height-pt"), "20");
  assert.equal(grid.getAttribute("data-candidate-block-gap-xpt"), "4");
  assert.equal(grid.getAttribute("data-candidate-block-gap-ypt"), "4");
  assert.equal(columnName.getAttribute("data-candidate-block-column-name"), "true");
});

test("document sanitizer strips transient table object overlays before sanitizing live editor DOM", async () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  const { stripTransientDocumentState } = await importClientModule("document-editor-sanitizer.js");
  const removed = [];
  const transientElements = [
    { name: "selection", remove: () => removed.push("selection") },
    { name: "resize-handle", remove: () => removed.push("resize-handle") },
    { name: "move-handle", remove: () => removed.push("move-handle") },
    { name: "select-handle", remove: () => removed.push("select-handle") },
  ];
  const root = {
    querySelectorAll(selector) {
      return String(selector).includes(".template-editor-table-selection")
        ? transientElements
        : [];
    },
  };

  stripTransientDocumentState(root);

  assert.deepEqual(removed, ["selection", "resize-handle", "move-handle", "select-handle"]);
});

test("document sanitizer strips stale object flow spacers and ids", async () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  const { stripTransientDocumentState } = await importClientModule("document-editor-sanitizer.js");
  const removed = [];
  const strippedAttributes = [];
  const spacer = { remove: () => removed.push("spacer") };
  const flowObject = { removeAttribute: (name) => strippedAttributes.push(name) };
  const root = {
    querySelectorAll(selector) {
      if (selector === "[data-template-object-flow-spacer]") {
        return [spacer];
      }

      if (selector === "[data-template-object-flow-id]") {
        return [flowObject];
      }

      return [];
    },
  };

  stripTransientDocumentState(root);

  assert.deepEqual(removed, ["spacer"]);
  assert.deepEqual(strippedAttributes, ["data-template-object-flow-id"]);
});
