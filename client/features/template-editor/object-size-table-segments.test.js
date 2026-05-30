const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("object table segment normalization returns no segments for an empty source", async () => {
  const { normalizeObjectTableSegmentSizes } = await importClientModule("object-size-table-segments.js");

  assert.deepEqual(normalizeObjectTableSegmentSizes([], 100, 5), []);
});

test("object table segment normalization distributes nearly even sources evenly", async () => {
  const { normalizeObjectTableSegmentSizes } = await importClientModule("object-size-table-segments.js");

  assert.deepEqual(normalizeObjectTableSegmentSizes([10, 11, 10], 34, 5), [12, 11, 11]);
});

test("object table segment normalization clamps target size to the minimum total", async () => {
  const { normalizeObjectTableSegmentSizes } = await importClientModule("object-size-table-segments.js");

  assert.deepEqual(normalizeObjectTableSegmentSizes([1, 2, 3], 10, 5), [5, 5, 5]);
});

test("object table segment normalization distributes uneven sources proportionally", async () => {
  const { normalizeObjectTableSegmentSizes } = await importClientModule("object-size-table-segments.js");

  assert.deepEqual(normalizeObjectTableSegmentSizes([10, 20, 40], 100, 5), [13, 28, 59]);
});

test("object table segment normalization rounds inputs and preserves the final target total", async () => {
  const { normalizeObjectTableSegmentSizes } = await importClientModule("object-size-table-segments.js");

  assert.deepEqual(normalizeObjectTableSegmentSizes(["bad", 10.6], 21.4, 4.2), [4, 17]);
});

test("object table segment normalization reduces rounding overflow from the end", async () => {
  const { normalizeObjectTableSegmentSizes } = await importClientModule("object-size-table-segments.js");

  assert.deepEqual(normalizeObjectTableSegmentSizes([100, 100, 1], 16, 5), [6, 5, 5]);
});
