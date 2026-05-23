const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("school modal helpers format university names without duplicating suffix", async () => {
  const {
    formatSchoolNameForSave,
    normalizeSchoolNameInputValue,
  } = await importClientModule("utils.js");

  assert.equal(normalizeSchoolNameInputValue("한국대학교"), "한국");
  assert.equal(normalizeSchoolNameInputValue(" 한국 "), "한국");
  assert.equal(formatSchoolNameForSave("한국"), "한국대학교");
  assert.equal(formatSchoolNameForSave("한국대학교"), "한국대학교");
  assert.equal(formatSchoolNameForSave(""), "");
});

test("school modal helpers format academic year labels", async () => {
  const {
    formatAcademicYearForSave,
    normalizeAcademicYearInputValue,
  } = await importClientModule("utils.js");

  assert.equal(normalizeAcademicYearInputValue("2027학년도"), "2027");
  assert.equal(normalizeAcademicYearInputValue("2027년"), "2027");
  assert.equal(formatAcademicYearForSave("2027"), "2027학년도");
  assert.equal(formatAcademicYearForSave("2027학년도"), "2027학년도");
  assert.equal(formatAcademicYearForSave(""), "");
});
