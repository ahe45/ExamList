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
      { examineeNo: "26010001", name: "First", opt10: "first-option-10", periodCode: "P1" },
      { examineeNo: "26010002", name: "Second", opt10: "second-option-10", periodCode: "P1" },
    ],
    "xlsx",
    { connection, schoolId: "school-1" },
  );

  assert.equal(fallbackQueryCalled, false);
  assert.equal(connectionQueries.length, 1);
  assert.equal(connectionQueries[0].params.length, 82);
  assert.equal(connectionQueries[0].params[1], "school-1");
  assert.equal(connectionQueries[0].params[2], "xlsx");
  assert.equal(connectionQueries[0].params[3], "26010001|P1");
  assert.equal(connectionQueries[0].params[38], "first-option-10");
  assert.equal(connectionQueries[0].params[39], "");
  assert.equal(connectionQueries[0].params[40], "");
  assert.equal(connectionQueries[0].params[44], "26010002|P1");
  assert.equal(connectionQueries[0].params[79], "second-option-10");
  assert.match(connectionQueries[0].sql, /INSERT INTO candidate_records/);
  assert.match(connectionQueries[0].sql, /source_id = VALUES\(source_id\)/);
  assert.match(connectionQueries[0].sql, /opt10 = VALUES\(opt10\)/);
  assert.doesNotMatch(connectionQueries[0].sql, /source_type = VALUES\(source_type\)/);
  assert.doesNotMatch(connectionQueries[0].sql, /photo_name = VALUES\(photo_name\)/);
  assert.doesNotMatch(connectionQueries[0].sql, /photo_mime = VALUES\(photo_mime\)/);
});

test("candidate detail updates write OPT10 with matching SQL parameters", async () => {
  let capturedQuery = null;
  const repository = createCandidateWriteRepository({
    async query(sql, params) {
      capturedQuery = { params, sql };
    },
    resolveSchoolId: async (schoolId) => schoolId,
  });

  await repository.updateCandidateRowById(
    "candidate-1",
    {
      examineeNo: "26010001",
      opt10: "추가옵션",
      periodCode: "P1",
    },
    { schoolId: "school-1" },
  );

  assert.match(capturedQuery.sql, /opt10 = \?/);
  assert.equal((capturedQuery.sql.match(/\?/g) || []).length, capturedQuery.params.length);
  assert.equal(capturedQuery.params[35], "추가옵션");
  assert.deepEqual(capturedQuery.params.slice(-2), ["candidate-1", "school-1"]);
});
