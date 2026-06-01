const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeSchoolSettingsPayload } = require("./service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("normalizeSchoolSettingsPayload trims values and accepts image data urls", () => {
  assert.deepEqual(
    normalizeSchoolSettingsPayload(
      {
        academicYear: "  2026  ",
        campusCode: " SEOUL ",
        campusName: " 서울캠퍼스 ",
        logoDataUrl: "data:image/png;base64,ZmFrZQ==",
        schoolName: "  한국대학교  ",
      },
      createHttpError,
    ),
    {
      academicYear: "2026",
      campusCode: "SEOUL",
      campusName: "서울캠퍼스",
      logoDataUrl: "data:image/png;base64,ZmFrZQ==",
      schoolName: "한국대학교",
    },
  );
});

test("normalizeSchoolSettingsPayload stores academic year as four digits", () => {
  assert.deepEqual(
    normalizeSchoolSettingsPayload(
      {
        academicYear: "2027학년도",
        logoDataUrl: "",
        schoolName: "한국대학교",
      },
      createHttpError,
    ),
    {
      academicYear: "2027",
      campusCode: "",
      campusName: "",
      logoDataUrl: "",
      schoolName: "한국대학교",
    },
  );
});

test("normalizeSchoolSettingsPayload rejects non numeric academic year", () => {
  assert.throws(
    () =>
      normalizeSchoolSettingsPayload(
        {
          academicYear: "202A",
          logoDataUrl: "",
          schoolName: "한국대학교",
        },
        createHttpError,
      ),
    /학년도는 숫자 4자리로 입력하세요/,
  );
});

test("normalizeSchoolSettingsPayload rejects non-image logo data", () => {
  assert.throws(
    () =>
      normalizeSchoolSettingsPayload(
        {
          academicYear: "2026",
          logoDataUrl: "data:text/plain;base64,ZmFrZQ==",
          schoolName: "한국대학교",
        },
        createHttpError,
      ),
    /로고 이미지는 PNG, JPG, WEBP 데이터 URL만 저장할 수 있습니다/,
  );
});

test("normalizeSchoolSettingsPayload rejects too long academic year", () => {
  assert.throws(
    () =>
      normalizeSchoolSettingsPayload(
        {
          academicYear: "2026학년도".repeat(4),
          logoDataUrl: "",
          schoolName: "한국대학교",
        },
        createHttpError,
      ),
    /학년도는 20자 이하로 입력하세요/,
  );
});

test("normalizeSchoolSettingsPayload rejects too long campus values", () => {
  assert.throws(
    () =>
      normalizeSchoolSettingsPayload(
        {
          campusCode: "C".repeat(121),
          campusName: "서울캠퍼스",
        },
        createHttpError,
      ),
    /캠퍼스코드 값은 120자 이하로 입력하세요/,
  );
});
