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
    closestGrid = null,
    cssProperties = {},
    dataset = {},
    offsetHeight = 0,
    offsetWidth = 0,
    rect = {},
  } = {}) {
    this.clientHeight = clientHeight;
    this.clientWidth = clientWidth;
    this.closestGrid = closestGrid;
    this.cssProperties = cssProperties;
    this.dataset = dataset;
    this.offsetHeight = offsetHeight;
    this.offsetWidth = offsetWidth;
    this.ownerDocument = {
      defaultView: {
        getComputedStyle(element) {
          return element?.cssProperties || {};
        },
      },
    };
    this.rect = {
      height: rect.height || 0,
      width: rect.width || 0,
    };
  }

  closest(selector) {
    return selector === "[data-candidate-block-grid]" ? this.closestGrid : null;
  }

  getBoundingClientRect() {
    return this.rect;
  }
}

test("candidate block focus pixel helpers normalize finite positive values", async () => {
  const { parseCssPixelValue, toFinitePixelValue } = await importClientModule("candidate-block-grid-focus-layout.js");

  assert.equal(parseCssPixelValue("12.5px"), 12.5);
  assert.equal(parseCssPixelValue("bad"), 0);
  assert.equal(parseCssPixelValue(""), 0);
  assert.equal(toFinitePixelValue(42, 10), 42);
  assert.equal(toFinitePixelValue(0, 10), 10);
  assert.equal(toFinitePixelValue(-1, 10), 10);
  assert.equal(toFinitePixelValue("bad", 10), 10);
});

test("calculateVisibleCanvasRect preserves viewport fallback and canvas padding rules", async () => {
  const { calculateVisibleCanvasRect } = await importClientModule("candidate-block-grid-focus-layout.js");

  assert.deepEqual(calculateVisibleCanvasRect(null, { height: 0, width: 0 }), {
    bottom: 768,
    height: 768,
    left: 0,
    right: 1024,
    top: 0,
    width: 1024,
  });

  assert.deepEqual(
    calculateVisibleCanvasRect(
      {
        bottom: 700,
        left: 0,
        right: 1000,
        top: 0,
      },
      {
        height: 768,
        width: 1024,
      },
    ),
    {
      bottom: 688,
      height: 676,
      left: 12,
      right: 988,
      top: 12,
      width: 976,
    },
  );
});

test("calculateCanvasBackdropRect clips measured canvas to the viewport", async () => {
  const { calculateCanvasBackdropRect } = await importClientModule("candidate-block-grid-focus-layout.js");

  assert.deepEqual(calculateCanvasBackdropRect(null, { height: 0, width: 0 }), {
    height: 768,
    left: 0,
    top: 0,
    width: 1024,
  });

  assert.deepEqual(
    calculateCanvasBackdropRect(
      {
        bottom: 900,
        left: -12.4,
        right: 1200,
        top: 9.6,
      },
      {
        height: 768,
        width: 1024,
      },
    ),
    {
      height: 758.4,
      left: 0,
      top: 10,
      width: 1024,
    },
  );
});

test("calculateCandidateBlockFocusLayout fits the logical block inside the visible canvas", async () => {
  const { calculateCandidateBlockFocusLayout } = await importClientModule("candidate-block-grid-focus-layout.js");

  assert.deepEqual(
    calculateCandidateBlockFocusLayout(
      {
        height: 400,
        left: 10,
        top: 20,
        width: 500,
      },
      {
        height: 50,
        width: 100,
      },
    ),
    {
      editorHeight: 50,
      editorWidth: 100,
      panelHeight: 281,
      panelLeft: 10,
      panelTop: 80,
      panelWidth: 500,
      scale: 4.42,
      visualHeight: 221,
      visualWidth: 442,
    },
  );
});

test("calculateCandidateBlockFocusLayout keeps the previous minimum shrink scale", async () => {
  const { calculateCandidateBlockFocusLayout } = await importClientModule("candidate-block-grid-focus-layout.js");

  assert.deepEqual(
    calculateCandidateBlockFocusLayout(
      {
        height: 140,
        left: 0,
        top: 0,
        width: 200,
      },
      {
        height: 1000,
        width: 1000,
      },
    ),
    {
      editorHeight: 1000,
      editorWidth: 1000,
      panelHeight: 560,
      panelLeft: 0,
      panelTop: 0,
      panelWidth: 558,
      scale: 0.5,
      visualHeight: 500,
      visualWidth: 500,
    },
  );
});

test("candidate block focus size prefers the selected data row over column row grid estimates", async () => {
  global.HTMLElement = FakeHTMLElement;
  global.window = {
    getComputedStyle(element) {
      return element?.cssProperties || {};
    },
  };
  const { getCandidateBlockFocusBlockLogicalSize } = await importClientModule("candidate-block-grid-focus-editor.js");
  const gridElement = new FakeHTMLElement({
    cssProperties: {
      columnGap: "0px",
    },
    dataset: {
      candidateBlockColumnNameRowEnabled: "true",
      candidateBlockColumnNameRowHeightPt: "20",
      candidateBlockColumns: "1",
      candidateBlockGapYPt: "4",
      candidateBlockRows: "2",
    },
    rect: {
      height: 400,
      width: 500,
    },
  });
  const blockElement = new FakeHTMLElement({
    closestGrid: gridElement,
    offsetHeight: 160,
    offsetWidth: 500,
    rect: {
      height: 120,
      width: 375,
    },
  });

  assert.deepEqual(getCandidateBlockFocusBlockLogicalSize(blockElement), {
    height: 160,
    width: 500,
  });
});
