const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("buildGeneratedObjectSvg renders barcode preview as Code128-B", async () => {
  const { buildGeneratedObjectSvg } = await importClientModule("generated-objects-svg.js");
  const svg = buildGeneratedObjectSvg("barcode", "26010001");

  assert.match(svg, /data-code128-format="code128"/);
  assert.match(svg, /data-code128-start="B"/);
  assert.match(svg, /data-code128-checksum="88"/);
  assert.match(svg, /data-code128-sequence="104,18,22,16,17,16,16,16,17,88,106"/);
  assert.match(svg, /data-code128-value="26010001"/);
});
