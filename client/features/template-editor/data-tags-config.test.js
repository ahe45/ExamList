const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("template tag visibility keeps candidate academic year while hiding school academic year", async () => {
  const { isVisibleTemplateTag } = await importClientModule("data-tags-config.js");

  assert.equal(isVisibleTemplateTag({ key: "candidate.admissionYear", label: "학년도" }), true);
  assert.equal(isVisibleTemplateTag({ key: "school.academicYear", label: "학년도" }), false);
  assert.equal(isVisibleTemplateTag({ key: "candidate.designatedSort", label: "지정정렬" }), false);
});
