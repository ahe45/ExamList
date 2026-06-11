const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("data tag format options validate custom date patterns and render weekday preview", async () => {
  const {
    getDataTagFormatOptions,
    getDataTagFormatInputError,
    normalizeDataTagFormat,
    renderDataTagFormatPreview,
  } = await importClientModule("data-tag-format-options.js");

  assert.ok(getDataTagFormatOptions("date").length >= 18);
  assert.ok(getDataTagFormatOptions("time").length >= 12);
  assert.equal(getDataTagFormatInputError("date", "YYYY.MM.DD (dddd)"), "");
  assert.equal(renderDataTagFormatPreview("date", "YYYY.MM.DD (dddd)"), "2026.03.28 (토요일)");
  assert.equal(normalizeDataTagFormat("date", "YYYY.MM.DD|default:x"), "");
  assert.notEqual(getDataTagFormatInputError("date", "YYYY.QQ.DD"), "");
});

test("data tag sample date and time values are validated and formatted from canonical values", async () => {
  const {
    formatDataTagSampleValue,
    getDataTagSampleValueError,
  } = await importClientModule("data-tag-value-formatting.js");

  assert.equal(getDataTagSampleValueError("candidate.examDate", "2026-11-28"), "");
  assert.match(getDataTagSampleValueError("candidate.examDate", "2026.11.28"), /yyyy-mm-dd/);
  assert.match(getDataTagSampleValueError("candidate.examDate", "2026-02-30"), /yyyy-mm-dd/);
  assert.equal(getDataTagSampleValueError("candidate.examStartTime", "09:00"), "");
  assert.match(getDataTagSampleValueError("candidate.examStartTime", "9:00"), /hh:mm/);
  assert.equal(formatDataTagSampleValue("candidate.examDate", "2026-11-28", "YYYY.MM.DD (ddd)"), "2026.11.28 (토)");
  assert.equal(formatDataTagSampleValue("candidate.examStartTime", "09:00", "A h:mm"), "오전 9:00");
});
