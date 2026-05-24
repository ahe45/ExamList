const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("data tag view options default to hidden icons and sample data display", async () => {
  const { getDataTagViewOptions, normalizeDataTagViewOptions } = await importClientModule("data-tags-view-options.js");

  assert.deepEqual(getDataTagViewOptions(), {
    showIcons: false,
    showSampleData: true,
  });
  assert.deepEqual(normalizeDataTagViewOptions({}), {
    showIcons: false,
    showSampleData: true,
  });
});
