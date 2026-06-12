const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_PADDING,
  buildTemplateEditorTableMarkup,
  normalizeTemplateEditorColorValue,
} = require("./content-shared.js");

test("inserted template tables default every cell padding side to 2pt", () => {
  const html = buildTemplateEditorTableMarkup(2, 2);

  assert.equal(TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_PADDING, "2pt");
  assert.match(html, /padding: 2pt;/);
  assert.doesNotMatch(html, /padding: 8pt 10pt;/);
});

test("legacy default black normalizes to pure black when black is the fallback", () => {
  assert.equal(normalizeTemplateEditorColorValue("#152033", "#000000"), "#000000");
  assert.equal(normalizeTemplateEditorColorValue("rgb(21, 32, 51)", "#000000"), "#000000");
  assert.equal(normalizeTemplateEditorColorValue("#152033", "#ffffff"), "#152033");
});
