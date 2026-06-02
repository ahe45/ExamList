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
    style = {},
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
    this.style = style;
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

class FakeTableElement extends FakeHTMLElement {}

global.HTMLElement = FakeHTMLElement;
global.HTMLTableElement = FakeTableElement;
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
  return new FakeTableElement({
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

test("candidate block grid minimum size does not add a gap between column names and data rows", async () => {
  const { getCandidateBlockGridMinimumSize } = await importClientModule("object-size-measurements.js");
  const {
    candidateBlockGridMinimumRowHeight,
    pointValueToCssPixel,
  } = await importClientModule("candidate-block-grid-config.js");
  const gridElement = new FakeHTMLElement({
    cssProperties: {
      gridTemplateRows: "16px 20px 5.33px 20px",
      rowGap: "0px",
    },
    dataset: {
      candidateBlockColumnNameRowEnabled: "true",
      candidateBlockGapYPt: "4",
      candidateBlockRows: "2",
    },
  });

  assert.equal(
    getCandidateBlockGridMinimumSize(gridElement).height,
    Math.ceil(candidateBlockGridMinimumRowHeight * 2 + 16 + pointValueToCssPixel(4)),
  );
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

test("object table collapsed border adjustment ignores non-collapsed tables", async () => {
  const { getObjectTableCollapsedBorderAdjustment } = await importClientModule("object-size-measurements.js");
  const tableElement = new FakeTableElement({
    cssProperties: {
      borderCollapse: "separate",
      borderLeftWidth: "9px",
      borderRightWidth: "10px",
    },
  });

  assert.equal(getObjectTableCollapsedBorderAdjustment(new FakeHTMLElement()), 0);
  assert.equal(getObjectTableCollapsedBorderAdjustment(tableElement), 0);
});

test("object table collapsed border adjustment uses the widest table edge or outer cell edge", async () => {
  const { getObjectTableCollapsedBorderAdjustment } = await importClientModule("object-size-measurements.js");
  const leftCell = new FakeHTMLElement({
    cssProperties: {
      borderLeftWidth: "7.2px",
      borderRightWidth: "1px",
    },
  });
  const rightCell = new FakeHTMLElement({
    cssProperties: {
      borderLeftWidth: "1px",
      borderRightWidth: "5px",
    },
  });
  const tableElement = new FakeTableElement({
    cssProperties: {
      borderCollapse: "collapse",
      borderLeftWidth: "2px",
      borderRightWidth: "3px",
    },
    rows: [{ cells: [leftCell, rightCell] }],
  });

  assert.equal(getObjectTableCollapsedBorderAdjustment(tableElement), 7.2);
});

test("object table rendered target width preserves the requested width for collapsed borders", async () => {
  const { getObjectTableRenderedTargetWidth } = await importClientModule("object-size-measurements.js");
  const tableElement = new FakeTableElement({
    cssProperties: {
      borderCollapse: "collapse",
      borderLeftWidth: "4.2px",
      borderRightWidth: "2px",
    },
  });

  assert.equal(getObjectTableRenderedTargetWidth(tableElement, 100.4), 100);
});

test("object table rendered target width preserves requested width when rendered rect is larger", async () => {
  const { getObjectTableRenderedTargetWidth } = await importClientModule("object-size-measurements.js");
  const blockElement = new FakeHTMLElement({
    dataset: {
      candidateBlockLogicalWidth: "100",
    },
    rect: { width: 50 },
  });
  const tableElement = new FakeTableElement({
    closestBlock: blockElement,
    rect: { width: 75 },
    style: { width: "100px" },
  });

  assert.equal(getObjectTableRenderedTargetWidth(tableElement, 200), 200);
});

test("object table rendered target width clamps requested values below the object minimum", async () => {
  const { getObjectTableRenderedTargetWidth } = await importClientModule("object-size-measurements.js");
  const { templateEditorObjectMinimumSize } = await importClientModule("object-toolbar-constants.js");
  const tableElement = new FakeTableElement();

  assert.equal(getObjectTableRenderedTargetWidth(tableElement, 1), templateEditorObjectMinimumSize);
});

test("object table column widths prefer inline style and clamp to the object minimum", async () => {
  const { getObjectTableColumnWidths } = await importClientModule("object-size-measurements.js");
  const { templateEditorObjectMinimumSize } = await importClientModule("object-toolbar-constants.js");
  const tableElement = new FakeTableElement();
  const columns = [
    new FakeHTMLElement({ style: { width: "31.5px" } }),
    new FakeHTMLElement({ style: { width: "1px" } }),
  ];

  assert.deepEqual(getObjectTableColumnWidths(tableElement, columns, null, null), [
    31.5,
    templateEditorObjectMinimumSize,
  ]);
});

test("object table column widths use table utils before scaled rect fallback", async () => {
  const { getObjectTableColumnWidths } = await importClientModule("object-size-measurements.js");
  const blockElement = new FakeHTMLElement({
    dataset: { candidateBlockLogicalWidth: "100" },
    rect: { width: 50 },
  });
  const tableElement = new FakeTableElement({ closestBlock: blockElement });
  const cellMap = new Map();
  const columns = [
    new FakeHTMLElement({ rect: { width: 100 } }),
    new FakeHTMLElement({ rect: { width: 30 } }),
  ];
  const tableUtils = {
    getTemplateEditorMeasuredColumnWidth(targetCellMap, columnIndex) {
      assert.equal(targetCellMap, cellMap);
      return columnIndex === 0 ? 44.4 : 0;
    },
  };

  assert.deepEqual(getObjectTableColumnWidths(tableElement, columns, cellMap, tableUtils), [44, 60]);
});

test("object table row heights prefer inline style and clamp to the object minimum", async () => {
  const { getObjectTableRowHeights } = await importClientModule("object-size-measurements.js");
  const { templateEditorObjectMinimumSize } = await importClientModule("object-toolbar-constants.js");
  const tableElement = new FakeTableElement({
    rows: [
      new FakeHTMLElement({ style: { height: "22.5px" } }),
      new FakeHTMLElement({ style: { height: "1px" } }),
    ],
  });

  assert.deepEqual(getObjectTableRowHeights(tableElement), [
    22.5,
    templateEditorObjectMinimumSize,
  ]);
});

test("object table row heights use scaled rect fallback", async () => {
  const { getObjectTableRowHeights } = await importClientModule("object-size-measurements.js");
  const blockElement = new FakeHTMLElement({
    dataset: { candidateBlockLogicalHeight: "200" },
    rect: { height: 100 },
  });
  const tableElement = new FakeTableElement({
    closestBlock: blockElement,
    rows: [
      new FakeHTMLElement({ rect: { height: 20 } }),
      new FakeHTMLElement({ rect: { height: 0 } }),
    ],
  });
  const { templateEditorObjectMinimumSize } = await importClientModule("object-toolbar-constants.js");

  assert.deepEqual(getObjectTableRowHeights(tableElement), [40, templateEditorObjectMinimumSize]);
});
