const assert = require("node:assert/strict");
const test = require("node:test");

const { decodeRouteParams, readGenerationTargetFilters } = require("./route-helpers");

test("decodeRouteParams decodes regex route groups", () => {
  assert.deepEqual(decodeRouteParams({ generationId: "pdf%201", schoolId: "%ED%95%99%EA%B5%90" }), {
    generationId: "pdf 1",
    schoolId: "학교",
  });
});

test("readGenerationTargetFilters accepts camelCase and snake_case aliases", () => {
  const searchParams = new URLSearchParams({
    admission_code: "A1",
    buildingCode: "B2",
    date: "2026-11-12",
    endTime: "12:00",
    period_code: "P3",
    room_code: "R4",
    seriesCode: "S5",
    unit_code: "U6",
  });

  assert.deepEqual(readGenerationTargetFilters(searchParams), {
    admission: "",
    admissionCode: "A1",
    building: "",
    buildingCode: "B2",
    campus: "",
    examDate: "2026-11-12",
    group: "",
    major: "",
    period: "",
    periodCode: "P3",
    room: "",
    roomCode: "R4",
    series: "",
    seriesCode: "S5",
    time: "",
    endTime: "12:00",
    track: "",
    unit: "",
    unitCode: "U6",
  });
});
