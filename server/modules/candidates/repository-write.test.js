const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createCandidateRecordId,
  createCandidateRecordSourceId,
} = require("./repository-write");

test("candidate record source id uses examinee number and period code", () => {
  assert.equal(
    createCandidateRecordSourceId({ examineeNo: "26010001", periodCode: "P1" }),
    "26010001|P1",
  );
});

test("candidate record id differs by period code for the same examinee", () => {
  const firstPeriodId = createCandidateRecordId({
    row: { examineeNo: "26010001", periodCode: "P1" },
    schoolId: "school-1",
    sourceType: "xlsx",
  });
  const secondPeriodId = createCandidateRecordId({
    row: { examineeNo: "26010001", periodCode: "P2" },
    schoolId: "school-1",
    sourceType: "xlsx",
  });

  assert.notEqual(firstPeriodId, secondPeriodId);
});
