const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeHTMLElement {
  constructor({
    clientHeight = 0,
    clientWidth = 0,
    closestBlock = null,
    cssProperties = {},
    dataset = {},
    offsetHeight = 0,
    offsetWidth = 0,
    rect = {},
  } = {}) {
    this.clientHeight = clientHeight;
    this.clientWidth = clientWidth;
    this.closestBlock = closestBlock;
    this.cssProperties = cssProperties;
    this.dataset = dataset;
    this.offsetHeight = offsetHeight;
    this.offsetWidth = offsetWidth;
    this.rect = {
      height: rect.height || 0,
      width: rect.width || 0,
    };
  }

  closest(selector) {
    return selector === "[data-candidate-block-instance].is-candidate-block-focus-editor"
      ? this.closestBlock
      : null;
  }

  getBoundingClientRect() {
    return this.rect;
  }
}

global.HTMLElement = FakeHTMLElement;
global.window = {
  getComputedStyle(element) {
    return {
      getPropertyValue(name) {
        return element?.cssProperties?.[name] || "";
      },
    };
  },
};

test("candidate block modal content size returns null for non-elements", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");

  assert.equal(getCandidateBlockModalContentSize(null), null);
  assert.equal(getCandidateBlockModalContentSize({}), null);
});

test("candidate block modal content size prefers logical content dataset values", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");
  const element = new FakeHTMLElement({
    clientHeight: 80,
    clientWidth: 160,
    dataset: {
      candidateBlockLogicalContentHeight: "45.9",
      candidateBlockLogicalContentWidth: "123.9",
      candidateBlockLogicalHeight: "90",
      candidateBlockLogicalWidth: "180",
    },
    rect: { height: 100, width: 200 },
  });

  assert.deepEqual(getCandidateBlockModalContentSize(element), {
    height: 45,
    width: 123,
  });
});

test("candidate block modal content size falls back from zero content values to logical size", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");
  const element = new FakeHTMLElement({
    clientHeight: 80,
    clientWidth: 160,
    dataset: {
      candidateBlockLogicalContentHeight: "0",
      candidateBlockLogicalContentWidth: "0",
      candidateBlockLogicalHeight: "30.2",
      candidateBlockLogicalWidth: "88.8",
    },
  });

  assert.deepEqual(getCandidateBlockModalContentSize(element), {
    height: 30,
    width: 88,
  });
});

test("candidate block modal content size uses client size before offset and rect", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");
  const element = new FakeHTMLElement({
    clientHeight: 42,
    clientWidth: 71,
    offsetHeight: 55,
    offsetWidth: 82,
    rect: { height: 80, width: 100 },
  });

  assert.deepEqual(getCandidateBlockModalContentSize(element), {
    height: 42,
    width: 71,
  });
});

test("candidate block modal content size uses offset size before rect fallback", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");
  const element = new FakeHTMLElement({
    offsetHeight: 55,
    offsetWidth: 82,
    rect: { height: 80, width: 100 },
  });

  assert.deepEqual(getCandidateBlockModalContentSize(element), {
    height: 55,
    width: 82,
  });
});

test("candidate block modal content size uses scaled rect fallback", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");
  const blockElement = new FakeHTMLElement({
    dataset: {
      candidateBlockLogicalHeight: "300",
      candidateBlockLogicalWidth: "400",
    },
    rect: { height: 150, width: 200 },
  });
  const modalSurfaceElement = new FakeHTMLElement({
    closestBlock: blockElement,
    rect: { height: 60, width: 120 },
  });

  assert.deepEqual(getCandidateBlockModalContentSize(modalSurfaceElement), {
    height: 120,
    width: 240,
  });
});

test("candidate block modal content size clamps empty values to the object minimum", async () => {
  const { getCandidateBlockModalContentSize } = await importClientModule("object-size-measurements.js");
  const { templateEditorObjectMinimumSize } = await importClientModule("object-toolbar-constants.js");
  const element = new FakeHTMLElement();

  assert.deepEqual(getCandidateBlockModalContentSize(element), {
    height: templateEditorObjectMinimumSize,
    width: templateEditorObjectMinimumSize,
  });
});
