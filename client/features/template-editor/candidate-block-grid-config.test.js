const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("candidate block column name row height normalizes pixel input for the editor control", async () => {
  const {
    candidateBlockGridColumnNameRowDefaultHeightPt,
    normalizeCandidateBlockColumnNameRowHeightPx,
    pointValueToCssPixel,
  } = await importClientModule("candidate-block-grid-config.js");

  assert.equal(
    normalizeCandidateBlockColumnNameRowHeightPx("bad"),
    Math.round(pointValueToCssPixel(candidateBlockGridColumnNameRowDefaultHeightPt)),
  );
  assert.equal(normalizeCandidateBlockColumnNameRowHeightPx(20.4), 20);
  assert.equal(normalizeCandidateBlockColumnNameRowHeightPx(20.5), 21);
  assert.equal(normalizeCandidateBlockColumnNameRowHeightPx(-10), 6);
  assert.equal(normalizeCandidateBlockColumnNameRowHeightPx(10000), 320);
});

test("candidate block column name row height converts pixel input to the persisted point value", async () => {
  const {
    cssPixelToCandidateBlockColumnNameRowHeightPt,
    normalizeCandidateBlockGridConfig,
  } = await importClientModule("candidate-block-grid-config.js");

  assert.equal(cssPixelToCandidateBlockColumnNameRowHeightPt(20), 15);
  assert.equal(cssPixelToCandidateBlockColumnNameRowHeightPt(48), 36);
  assert.equal(cssPixelToCandidateBlockColumnNameRowHeightPt(-10), 4.5);
  assert.equal(cssPixelToCandidateBlockColumnNameRowHeightPt(10000), 240);
  assert.equal(
    normalizeCandidateBlockGridConfig({
      columnNameRow: {
        enabled: true,
        heightPt: 500,
      },
    }).columnNameRow.heightPt,
    240,
  );
});

