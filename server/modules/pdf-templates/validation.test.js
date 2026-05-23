const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeListFilter, normalizeTemplateMetadata } = require("./validation");

test("normalizeListFilter clamps numeric values and keeps supported filters", () => {
  const filter = normalizeListFilter({
    limit: "500",
    page: "0",
    paperPreset: "A4",
  });

  assert.equal(filter.limit, 100);
  assert.equal(filter.page, 1);
  assert.equal(filter.paperPreset, "A4");
});

test("normalizeTemplateMetadata validates required fields", () => {
  assert.throws(
    () =>
      normalizeTemplateMetadata({
        name: "",
      }),
    /템플릿명을 입력하세요/,
  );
});
