const test = require("node:test");
const assert = require("node:assert/strict");

const {
  combineSchoolCode,
  normalizeCombinedSchoolCode,
  normalizeSchoolPayload,
} = require("./validators");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("normalizeSchoolPayload combines school and campus codes", () => {
  const school = normalizeSchoolPayload({
    campusCode: " 01 ",
    code: " seoul ",
    name: "서울대학교",
  }, createHttpError);

  assert.equal(school.code, "SEOUL-01");
  assert.equal(school.campusCode, "01");
});

test("different campus codes produce different unique school codes", () => {
  const firstCampus = normalizeSchoolPayload({ campusCode: "01", code: "SEOUL", name: "서울대학교" }, createHttpError);
  const secondCampus = normalizeSchoolPayload({ campusCode: "02", code: "SEOUL", name: "서울대학교" }, createHttpError);

  assert.equal(firstCampus.code, "SEOUL-01");
  assert.equal(secondCampus.code, "SEOUL-02");
  assert.notEqual(firstCampus.code, secondCampus.code);
});

test("combineSchoolCode does not duplicate an existing campus suffix", () => {
  assert.equal(combineSchoolCode("SEOUL-01", "01"), "SEOUL-01");
  assert.equal(combineSchoolCode("SEOUL", ""), "SEOUL");
});

test("normalizeSchoolPayload rejects a campus code that cannot be stored in the school code", () => {
  assert.throws(
    () => normalizeSchoolPayload({ campusCode: "서울 01", code: "SEOUL", name: "서울대학교" }, createHttpError),
    (error) => error.statusCode === 400 && error.errorCode === "INVALID_CAMPUS_CODE",
  );
});

test("normalizeCombinedSchoolCode rejects a generated code longer than the database column", () => {
  assert.throws(
    () => normalizeCombinedSchoolCode("SCHOOL-12345678", "A".repeat(80), createHttpError),
    (error) => error.statusCode === 400 && error.errorCode === "INVALID_SCHOOL_CODE",
  );
});
