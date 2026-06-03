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

test("barcode source picker renders only Code128-safe data tags", async () => {
  const { renderGeneratedObjectSourceOptions } = await importClientModule("generated-object-source-control.js");
  const html = renderGeneratedObjectSourceOptions(
    [
      { key: "school.name", label: "학교명" },
      { key: "school.code", label: "학교코드" },
      { key: "candidate.admissionTypeCode", label: "전형코드" },
      { key: "candidate.departmentName", label: "모집단위명" },
      { key: "candidate.departmentCode", label: "모집단위코드" },
      { key: "candidate.examNo", label: "수험번호" },
      { key: "candidate.name", label: "이름" },
      { key: "candidate.opt1", label: "OPT1" },
      { key: "row.indexInPage", label: "순번" },
    ],
    "candidate.examNo",
    "barcode",
  );

  assert.match(html, /data-examlist-generated-object-source-option="school\.code"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.admissionTypeCode"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.departmentCode"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.examNo"/);
  assert.match(html, /data-examlist-generated-object-source-option="row\.indexInPage"/);
  assert.doesNotMatch(html, /data-examlist-generated-object-source-option="school\.name"/);
  assert.doesNotMatch(html, /data-examlist-generated-object-source-option="candidate\.departmentName"/);
  assert.doesNotMatch(html, /data-examlist-generated-object-source-option="candidate\.name"/);
  assert.doesNotMatch(html, /data-examlist-generated-object-source-option="candidate\.opt1"/);
});

test("QR code source picker keeps non-image data tags", async () => {
  const { renderGeneratedObjectSourceOptions } = await importClientModule("generated-object-source-control.js");
  const html = renderGeneratedObjectSourceOptions(
    [
      { key: "school.name", label: "학교명" },
      { key: "candidate.departmentName", label: "모집단위명" },
      { key: "candidate.examNo", label: "수험번호" },
      { key: "candidate.name", label: "이름" },
      { key: "candidate.opt1", label: "OPT1" },
    ],
    "candidate.name",
    "qrcode",
  );

  assert.match(html, /data-examlist-generated-object-source-option="school\.name"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.departmentName"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.examNo"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.name"/);
  assert.match(html, /data-examlist-generated-object-source-option="candidate\.opt1"/);
});
