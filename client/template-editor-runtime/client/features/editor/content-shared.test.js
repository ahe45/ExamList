const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_PADDING,
  buildTemplateEditorTableMarkup,
} = require("./content-shared.js");

test("inserted template tables default every cell padding side to 2pt", () => {
  const html = buildTemplateEditorTableMarkup(2, 2);

  assert.equal(TEMPLATE_EDITOR_DEFAULT_TABLE_CELL_PADDING, "2pt");
  assert.match(html, /padding: 2pt;/);
  assert.doesNotMatch(html, /padding: 8pt 10pt;/);
});
