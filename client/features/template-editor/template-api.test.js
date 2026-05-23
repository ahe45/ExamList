const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("buildTemplateRequestPayload keeps layout and resolves school id", async () => {
  const { buildTemplateRequestPayload } = await importClientModule("template-api.js");
  const layout = { pages: [{ id: "page-1" }] };
  const payload = buildTemplateRequestPayload(
    {
      description: "설명",
      generationUnit: "room",
      id: "template-1",
      layout,
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
      schoolId: "school-old",
    },
    { schoolId: "school-new" },
  );

  assert.equal(payload.schoolId, "school-new");
  assert.equal(payload.id, "template-1");
  assert.equal(payload.layout, layout);
  assert.equal(payload.paperPreset, "A4");
});
