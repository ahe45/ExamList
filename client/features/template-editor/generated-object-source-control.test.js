const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("generated object source picker renders data tag accordion options", async () => {
  const { renderGeneratedObjectSourceOptions } = await importClientModule("generated-object-source-control.js");
  const html = renderGeneratedObjectSourceOptions(
    [
      { key: "candidate.examNo", label: "수험번호" },
      { key: "candidate.name", label: "이름" },
      { key: "candidate.examStartTime", label: "시작시간" },
    ],
    "candidate.name",
  );

  assert.match(html, /class="template-tag-accordion-group"/);
  assert.match(html, /class="template-tag-accordion-summary"/);
  assert.match(html, /class="template-tag-group-icon"/);
  assert.match(html, /class="template-tag-button template-tag-accordion-button examlist-generated-object-source-option selected"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.name"/);
  assert.match(html, /<span class="template-tag-button-label">이름<\/span>/);
  assert.match(html, /수험생 정보/);
  assert.match(html, /시험 일정/);
  assert.doesNotMatch(html, /<details\b[^>]*\bopen\b/i);
});
