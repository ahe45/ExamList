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

test("school modal helpers format campus names without duplicating suffix", async () => {
  const {
    formatCampusNameForSave,
    normalizeCampusNameInputValue,
  } = await importClientModule("utils.js");

  assert.equal(normalizeCampusNameInputValue("서울캠퍼스"), "서울");
  assert.equal(normalizeCampusNameInputValue(" 서울 "), "서울");
  assert.equal(formatCampusNameForSave("서울"), "서울캠퍼스");
  assert.equal(formatCampusNameForSave("서울캠퍼스"), "서울캠퍼스");
  assert.equal(formatCampusNameForSave(""), "");
});

test("school modal helpers remove the campus suffix from a stored school code", async () => {
  const { getBaseSchoolCode } = await importClientModule("utils.js");

  assert.equal(getBaseSchoolCode("SEOUL-01", "01"), "SEOUL");
  assert.equal(getBaseSchoolCode("seoul-a", "A"), "seoul");
  assert.equal(getBaseSchoolCode("SEOUL-01", "02"), "SEOUL-01");
  assert.equal(getBaseSchoolCode("SEOUL", ""), "SEOUL");
});
