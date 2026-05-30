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
    blockElements = [],
    closestBlock = null,
    columns = [],
    cssProperties = {},
    dataset = {},
    offsetHeight = 0,
    offsetWidth = 0,
    rect = {},
    rows = [],
    tables = [],
  } = {}) {
    this.blockElements = blockElements;
    this.clientHeight = clientHeight;
    this.clientWidth = clientWidth;
    this.closestBlock = closestBlock;
    this.columns = columns;
    this.cssProperties = cssProperties;
    this.dataset = dataset;
    this.offsetHeight = offsetHeight;
    this.offsetWidth = offsetWidth;
    this.rect = {
      height: rect.height || 0,
      width: rect.width || 0,
    };
    this.rows = rows;
    this.tables = tables;
  }

  closest(selector) {
    return selector === "[data-candidate-block-instance].is-candidate-block-focus-editor"
      ? this.closestBlock
      : null;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  querySelectorAll(selector) {
    if (selector === "[data-candidate-block-instance]") {
      return this.blockElements;
    }

    if (selector === "table") {
      return this.tables;
    }

    if (selector === "colgroup col") {
      return this.columns;
    }

    return [];
  }
}

global.HTMLElement = FakeHTMLElement;
global.window = {
  getComputedStyle(element) {
    return {
      ...(element?.cssProperties || {}),
      getPropertyValue(name) {
        const camelName = String(name || "").replace(/-([a-z])/g, (_match, character) => character.toUpperCase());

        return element?.cssProperties?.[name] || element?.cssProperties?.[camelName] || "";
      },
    };
  },
};

function createCandidateBlockTable({ cellStyle = {}, columnCount = 1, rowCount = 1 } = {}) {
  return new FakeHTMLElement({
    columns: Array.from({ length: columnCount }, () => new FakeHTMLElement()),
    rows: Array.from({ length: rowCount }, () => ({
      cells: Array.from({ length: columnCount }, () => new FakeHTMLElement({ cssProperties: cellStyle })),
    })),
  });
}

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

test("candidate block grid minimum size uses row count and gap while clamping width", async () => {
  const { getCandidateBlockGridMinimumSize } = await importClientModule("object-size-measurements.js");
  const {
    candidateBlockGridMinimumRowHeight,
    candidateBlockGridMinimumWidth,
  } = await importClientModule("candidate-block-grid-config.js");
  const gridElement = new FakeHTMLElement({
    cssProperties: { gap: "4px" },
    dataset: { candidateBlockRows: "3" },
  });

  assert.deepEqual(getCandidateBlockGridMinimumSize(gridElement), {
    height: candidateBlockGridMinimumRowHeight * 3 + 4 * 2,
    width: candidateBlockGridMinimumWidth,
  });
});

test("candidate block grid minimum size prefers row gap over generic gap", async () => {
  const { getCandidateBlockGridMinimumSize } = await importClientModule("object-size-measurements.js");
  const { candidateBlockGridMinimumRowHeight } = await importClientModule("candidate-block-grid-config.js");
  const gridElement = new FakeHTMLElement({
    cssProperties: {
      gap: "99px",
      rowGap: "5px",
    },
    dataset: { candidateBlockRows: "2" },
  });

  assert.equal(getCandidateBlockGridMinimumSize(gridElement).height, candidateBlockGridMinimumRowHeight * 2 + 5);
});

test("candidate block grid minimum size includes table minimum size", async () => {
  const { getCandidateBlockGridMinimumSize } = await importClientModule("object-size-measurements.js");
  const cellStyle = {
    borderBottomWidth: "1px",
    borderLeftWidth: "5px",
    borderRightWidth: "5px",
    borderTopWidth: "1px",
    lineHeight: "20px",
    paddingBottom: "2px",
    paddingLeft: "10px",
    paddingRight: "10px",
    paddingTop: "2px",
  };
  const tableElement = createCandidateBlockTable({
    cellStyle,
    columnCount: 3,
    rowCount: 2,
  });
  const blockElement = new FakeHTMLElement({
    cssProperties: {
      borderBottomWidth: "1px",
      borderLeftWidth: "5px",
      borderRightWidth: "5px",
      borderTopWidth: "1px",
      paddingBottom: "3px",
      paddingLeft: "10px",
      paddingRight: "10px",
      paddingTop: "3px",
    },
    tables: [tableElement],
  });
  const gridElement = new FakeHTMLElement({
    blockElements: [blockElement],
    cssProperties: {
      columnGap: "7px",
      rowGap: "5px",
    },
    dataset: {
      candidateBlockColumns: "2",
      candidateBlockRows: "2",
    },
  });

  assert.deepEqual(getCandidateBlockGridMinimumSize(gridElement), {
    height: 125,
    width: 247,
  });
});
