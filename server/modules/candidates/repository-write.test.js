const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createCandidateRecordId,
  createCandidateRecordSourceId,
  createCandidateWriteRepository,
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

test("candidate workbook rows are written with one multi-row upsert query", async () => {
  const connectionQueries = [];
  let fallbackQueryCalled = false;
  const repository = createCandidateWriteRepository({
    query: async () => {
      fallbackQueryCalled = true;
    },
    resolveSchoolId: async (schoolId) => schoolId,
  });
  const connection = {
    async query(sql, params) {
      connectionQueries.push({ params, sql });
    },
  };

  await repository.upsertCandidateWorkbookRows(
    [
      { examineeNo: "26010001", name: "First", periodCode: "P1" },
      { examineeNo: "26010002", name: "Second", periodCode: "P1" },
    ],
    "xlsx",
    { connection, schoolId: "school-1" },
  );

  assert.equal(fallbackQueryCalled, false);
  assert.equal(connectionQueries.length, 1);
  assert.equal(connectionQueries[0].params.length, 72);
  assert.equal(connectionQueries[0].params[1], "school-1");
  assert.equal(connectionQueries[0].params[2], "xlsx");
  assert.equal(connectionQueries[0].params[3], "26010001|P1");
  assert.equal(connectionQueries[0].params[34], "");
  assert.equal(connectionQueries[0].params[35], "");
  assert.equal(connectionQueries[0].params[39], "26010002|P1");
  assert.match(connectionQueries[0].sql, /INSERT INTO candidate_records/);
  assert.match(connectionQueries[0].sql, /source_id = VALUES\(source_id\)/);
  assert.doesNotMatch(connectionQueries[0].sql, /source_type = VALUES\(source_type\)/);
  assert.doesNotMatch(connectionQueries[0].sql, /photo_name = VALUES\(photo_name\)/);
  assert.doesNotMatch(connectionQueries[0].sql, /photo_mime = VALUES\(photo_mime\)/);
});
