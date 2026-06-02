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

test("preview data fit uses rendered height when table layout expands stale cell heights", () => {
  const script = getPreviewDataFitScript();

  assert.match(script, /function getTableDeclaredRowsHeightPx\(table\)/);
  assert.match(script, /function shouldUseRenderedTableLayoutHeight\(cell, targetHeightPx\)/);
  assert.match(script, /function shouldUseRenderedCellHeight\(cell, targetHeightPx\)/);
  assert.match(script, /function getSavedCellTargetHeightPx\(cell\)/);
  assert.match(script, /const targetHeight = Math\.max\(cellHeight, spannedRowHeight\);/);
  assert.match(script, /tableHeight > declaredRowsHeight \+ tolerancePx/);
  assert.match(script, /!shouldUseRenderedTableLayoutHeight\(cell, targetHeightPx\)/);
  assert.match(script, /return Math\.max\(targetHeight, cell\.getBoundingClientRect\(\)\.height \|\| 0\);/);
  assert.match(script, /const targetHeightPx = Math\.max\(getSavedCellTargetHeightPx\(cell\), getCellTargetHeightPx\(cell\)\);/);
  assert.match(script, /cell\.setAttribute\("data-template-data-fit-target-height", String\(targetHeightPx\)\);/);
});

test("preview data fit accepts rendered candidate block table height before shrinking text", () => {
  const script = getPreviewDataFitScript();

  assert.ok(script.includes('const isCandidateBlockTableLayout = Boolean(table?.closest?.(".preview-candidate-block"));'));
  assert.match(script, /const renderedTableLayoutExpanded =\s*isCandidateBlockTableLayout && renderedTableHeight > declaredRowsHeight \+ tolerancePx;/);
  assert.match(script, /\(declaredTableLayoutExpanded \|\| renderedTableLayoutExpanded\)/);
});

test("preview data fit preserves saved line-height ratio when scaling text", () => {
  const script = getPreviewDataFitScript();

  assert.match(script, /const effectiveScale = item\.baseFontSize > 0 \? fontSize \/ item\.baseFontSize : scale;/);
  assert.match(script, /const lineHeight = Math\.max\(1, item\.baseLineHeight \* effectiveScale\);/);
  assert.doesNotMatch(script, /fontSize \* 1\.05/);
});

test("preview data fit accepts intrinsic rendered cell height before shrinking text", () => {
  const script = getPreviewDataFitScript();

  assert.match(script, /const intrinsicHeightTolerancePx = 8;/);
  assert.match(script, /function getCellVerticalBoxHeightPx\(cell\)/);
  assert.match(script, /function getCellSingleLineContentHeightPx\(cell\)/);
  assert.match(script, /function shouldUseRenderedIntrinsicHeight\(cell, targetHeightPx\)/);
  assert.match(script, /intrinsicSingleLineHeight > targetHeightPx \+ tolerancePx/);
  assert.match(script, /renderedCellHeight <= intrinsicSingleLineHeight \+ intrinsicHeightTolerancePx/);
  assert.match(script, /cell\.scrollHeight <= cell\.clientHeight \+ tolerancePx/);
});
