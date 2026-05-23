const test = require("node:test");
const assert = require("node:assert/strict");

const { buildBlankTemplateSnapshot } = require("./defaults");

test("buildBlankTemplateSnapshot creates empty cover and content pages", () => {
  const snapshot = buildBlankTemplateSnapshot({
    description: "설명",
    generationUnit: "room",
    name: "빈 템플릿",
    orientation: "portrait",
    paperPreset: "A4",
  });

  assert.equal(snapshot.pages.length, 2);
  assert.equal(snapshot.pages[0].type, "cover");
  assert.equal(snapshot.pages[0].name, "표지");
  assert.equal(snapshot.pages[1].type, "content");
  assert.equal(snapshot.pages[1].name, "본문");
  assert.deepEqual(snapshot.pages[0].elements, []);
  assert.deepEqual(snapshot.pages[1].elements, []);
});
