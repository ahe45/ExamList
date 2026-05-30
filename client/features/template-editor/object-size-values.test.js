const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("object size input normalization rejects empty and non-numeric values", async () => {
  const { normalizeObjectSizeInputValue } = await importClientModule("object-size-values.js");

  assert.equal(normalizeObjectSizeInputValue(""), null);
  assert.equal(normalizeObjectSizeInputValue(" \n\t "), null);
  assert.equal(normalizeObjectSizeInputValue("abc"), null);
  assert.equal(normalizeObjectSizeInputValue("12px"), null);
});

test("object size input normalization rounds numeric values and clamps to the minimum size", async () => {
  const { normalizeObjectSizeInputValue } = await importClientModule("object-size-values.js");
  const { templateEditorObjectMinimumSize } = await importClientModule("object-toolbar-constants.js");

  assert.equal(normalizeObjectSizeInputValue("1"), templateEditorObjectMinimumSize);
  assert.equal(normalizeObjectSizeInputValue("20.4"), 20);
  assert.equal(normalizeObjectSizeInputValue("20.5"), 21);
  assert.equal(normalizeObjectSizeInputValue(33), 33);
});

test("object size pixel parsing keeps parseFloat-compatible values", async () => {
  const { parseObjectSizePixelValue } = await importClientModule("object-size-values.js");

  assert.equal(parseObjectSizePixelValue("12px"), 12);
  assert.equal(parseObjectSizePixelValue(" 12.5px "), 12.5);
  assert.equal(parseObjectSizePixelValue("-3.25px"), -3.25);
  assert.equal(parseObjectSizePixelValue("14abc"), 14);
  assert.equal(parseObjectSizePixelValue("0", 9), 0);
});

test("object size pixel parsing returns fallback for invalid values", async () => {
  const { parseObjectSizePixelValue } = await importClientModule("object-size-values.js");

  assert.equal(parseObjectSizePixelValue("", 7), 7);
  assert.equal(parseObjectSizePixelValue(null, 7), 7);
  assert.equal(parseObjectSizePixelValue("px", 7), 7);
  assert.equal(parseObjectSizePixelValue("abc", 7), 7);
});

test("object size inline pixel parsing accepts only explicit px values", async () => {
  const { parseObjectSizeInlinePixelValue } = await importClientModule("object-size-values.js");

  assert.equal(parseObjectSizeInlinePixelValue("12px"), 12);
  assert.equal(parseObjectSizeInlinePixelValue(" 12.5PX "), 12.5);
  assert.equal(parseObjectSizeInlinePixelValue("-3px"), -3);
  assert.equal(parseObjectSizeInlinePixelValue("12", 4), 4);
  assert.equal(parseObjectSizeInlinePixelValue("12abc", 4), 4);
  assert.equal(parseObjectSizeInlinePixelValue(".5px", 4), 4);
});
