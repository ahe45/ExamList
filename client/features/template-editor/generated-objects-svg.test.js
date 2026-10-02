const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("exam date barcode preview uses compact dates while other sources retain hyphens", async () => {
  const { buildGeneratedObjectMarkup } = await importClientModule("generated-objects-markup.js");
  const { buildGeneratedObjectSvg } = await importClientModule("generated-objects-svg.js");
  const markup = buildGeneratedObjectMarkup("barcode", "candidate.examDate", { previewRecord: {examDate:"2026-10-21"} });
  assert.match(decodeURIComponent(markup), /data-code128-value="20261021"/);
  assert.match(buildGeneratedObjectSvg("barcode", "2026-10-21", "candidate.opt1"), /data-code128-value="2026-10-21"/);
  assert.equal(buildGeneratedObjectSvg("qrcode", "2026-10-21", "candidate.examDate"), buildGeneratedObjectSvg("qrcode", "2026-10-21"));
});

test("buildGeneratedObjectSvg renders barcode preview as Code128-B", async () => {
  const { buildGeneratedObjectSvg } = await importClientModule("generated-objects-svg.js");
  const svg = buildGeneratedObjectSvg("barcode", "26010001");

  assert.match(svg, /data-code128-format="code128"/);
  assert.match(svg, /data-code128-start="B"/);
  assert.match(svg, /data-code128-checksum="88"/);
  assert.match(svg, /data-code128-sequence="104,18,22,16,17,16,16,16,17,88,106"/);
  assert.match(svg, /data-code128-value="26010001"/);
  assert.match(svg, /fill="#000000"/);
  assert.doesNotMatch(svg, /#111827/);
});

test("QR preview uses pure black for every foreground module", async () => {
  const { buildGeneratedObjectSvg } = await importClientModule("generated-objects-svg.js");
  const svg = buildGeneratedObjectSvg("qrcode", "26010001");
  const fills = Array.from(svg.matchAll(/<rect[^>]*fill="([^"]+)"/g), match => match[1]);
  assert.equal(fills[0], "#ffffff");
  assert.ok(fills.length > 1 && fills.slice(1).every(color => color === "#000000"));
});
