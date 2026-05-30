const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getPreviewDataFitHeightTolerancePx,
  getPreviewDataFitScript,
} = require("./data-fit-script");

test("preview data fit gives rowspanned cells extra height tolerance before shrinking text", () => {
  const script = getPreviewDataFitScript();

  assert.match(script, /function getCellFitHeightTolerancePx\(cell\)/);
  assert.match(script, /const rowSpan = Math\.max\(1, Math\.round\(Number\(cell\?\.rowSpan\)\) \|\| 1\);/);
  assert.match(script, /Math\.min\(4, tolerancePx \+ rowSpan \* 0\.75\)/);
  assert.match(script, /const heightTolerancePx = getCellFitHeightTolerancePx\(cell\);/);
  assert.match(script, /rectHeight > targetHeightPx \+ heightTolerancePx/);
});

test("preview data fit tolerance covers observed rowspanned block rounding", () => {
  assert.ok(getPreviewDataFitHeightTolerancePx(2) > 2.25);
});
