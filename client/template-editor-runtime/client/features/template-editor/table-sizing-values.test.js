const test = require("node:test");
const assert = require("node:assert/strict");
const { createTemplateEditorTableSizingValueController } = require("./table-sizing-values");

test("equal sizes preserve the total and distribute rounding across columns", () => {
  const { distributeTemplateEditorTotalSize } = createTemplateEditorTableSizingValueController({ TEMPLATE_EDITOR_TABLE_MIN_SIZE: 24 });
  for (const [total, count] of [[348, 5], [715, 3], [428, 2], [715, 5]]) {
    const sizes = distributeTemplateEditorTotalSize(total, count);
    assert.equal(sizes.reduce((sum, size) => sum + size, 0), total);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
  }
});
