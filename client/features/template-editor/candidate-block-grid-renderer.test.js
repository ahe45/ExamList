const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

function createDocumentSizeStub({ height, width }) {
  return {
    clientHeight: height,
    clientWidth: width,
    getBoundingClientRect: () => ({
      height,
      width,
    }),
  };
}

test("candidate block grid position is clamped when a column name row increases rendered height", async () => {
  const {
    clampCandidateBlockGridPositionToDocument,
  } = await importClientModule("candidate-block-grid-renderer.js");
  const { cssPixelToPointValue } = await importClientModule("candidate-block-grid-config.js");
  const documentElement = createDocumentSizeStub({ height: 800, width: 600 });
  const config = {
    columnNameRow: {
      enabled: true,
      heightPt: 30,
    },
    heightPt: 560,
    widthPt: 300,
    xPt: 200,
    yPt: 50,
  };

  assert.equal(clampCandidateBlockGridPositionToDocument(config, documentElement), true);
  assert.equal(config.heightPt, 560);
  assert.equal(config.columnNameRow.heightPt, 30);
  assert.equal(config.xPt, cssPixelToPointValue(600) - 300);
  assert.equal(config.yPt, cssPixelToPointValue(800) - 590);
});

test("candidate block grid position clamp is skipped when document size is unavailable", async () => {
  const { clampCandidateBlockGridPositionToDocument } = await importClientModule("candidate-block-grid-renderer.js");
  const config = {
    columnNameRow: {
      enabled: true,
      heightPt: 30,
    },
    heightPt: 560,
    widthPt: 300,
    xPt: 200,
    yPt: 50,
  };

  assert.equal(clampCandidateBlockGridPositionToDocument(config, { clientHeight: 0, clientWidth: 0 }), false);
  assert.equal(config.xPt, 200);
  assert.equal(config.yPt, 50);
});
