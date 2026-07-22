const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidateImportService } = require("./import-service");

function createHttpError(statusCode, message, errorCode = "") {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

function createCandidateRow(overrides = {}) {
  return {
    admission: "일반전형",
    admissionCode: "SU",
    birth: "2006-01-02",
    building: "본관",
    buildingCode: "BLD01",
    date: "2026-03-28",
    examineeNo: "26010001",
    name: "홍길동",
    period: "1교시",
    periodCode: "P1",
    room: "101",
    roomCode: "R101",
    series: "인문",
    time: "08:40",
    track: "수시",
    unit: "국어국문학과",
    unitCode: "KOR",
    ...overrides,
  };
}

function createService({
  existingRows = [],
  getPool = () => ({
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        release() {},
        async rollback() {},
      };
    },
  }),
  normalizeCandidateWorkbookInput = (row) => row,
  upsertCandidateWorkbookRows = async () => {},
  workbookRows = [],
} = {}) {
  return createCandidateImportService({
    createHttpError,
    getPool,
    normalizeCandidateWorkbookInput,
    parseCandidateWorkbook: async () => workbookRows,
    query: async () => existingRows,
    resolveSchoolId: async (schoolId = "") => schoolId || "school-1",
    toCandidateWorkbookRow: (row) => ({ ...row }),
    upsertCandidateWorkbookRows,
  });
}

test("candidate import allows the same examinee number in different periods", async () => {
  const service = createService({
    workbookRows: [
      createCandidateRow({ periodCode: "P1" }),
      createCandidateRow({ period: "2교시", periodCode: "P2" }),
    ],
  });

  const preview = await service.previewCandidateImport({
    fileContentBase64: "xlsx",
    schoolId: "school-1",
  });

  assert.equal(preview.insertCount, 2);
  assert.equal(preview.updateCount, 0);
});

test("candidate import enables upload date and time format validation", async () => {
  const capturedOptions = [];
  const service = createService({
    normalizeCandidateWorkbookInput: (row, index, options) => {
      capturedOptions.push(options);
      return row;
    },
    workbookRows: [createCandidateRow()],
  });

  await service.previewCandidateImport({
    fileContentBase64: "xlsx",
    schoolId: "school-1",
  });

  assert.equal(capturedOptions.length, 1);
  assert.equal(capturedOptions[0].validateUploadDateTimeFormat, true);
});

test("candidate import rejects duplicate examinee and period code combinations", async () => {
  const service = createService({
    workbookRows: [
      createCandidateRow({ periodCode: "P1" }),
      createCandidateRow({ name: "김철수", periodCode: "P1" }),
    ],
  });

  await assert.rejects(
    () => service.previewCandidateImport({ fileContentBase64: "xlsx", schoolId: "school-1" }),
    (error) =>
      error.errorCode === "CANDIDATE_IMPORT_DUPLICATE_NO" &&
      error.message.includes("26010001/P1(2, 3행)"),
  );
});

test("candidate import matches existing rows by examinee number and period code", async () => {
  const service = createService({
    existingRows: [
      {
        ...createCandidateRow({ id: "candidate-existing", name: "기존이름", periodCode: "P1" }),
      },
    ],
    workbookRows: [
      createCandidateRow({ name: "변경이름", periodCode: "P1" }),
      createCandidateRow({ period: "2교시", periodCode: "P2" }),
    ],
  });

  const preview = await service.previewCandidateImport({
    fileContentBase64: "xlsx",
    schoolId: "school-1",
  });

  assert.equal(preview.insertCount, 1);
  assert.equal(preview.updateCount, 1);
  assert.equal(preview.previewRows[0].operation, "update");
  assert.equal(preview.previewRows[1].operation, "insert");
});

test("candidate import writes 500-row batches in one transaction", async () => {
  const calls = [];
  const connection = {
    async beginTransaction() {
      calls.push("begin");
    },
    async commit() {
      calls.push("commit");
    },
    release() {
      calls.push("release");
    },
    async rollback() {
      calls.push("rollback");
    },
  };
  const workbookRows = Array.from({ length: 1001 }, (_value, index) =>
    createCandidateRow({ examineeNo: String(26010001 + index) }),
  );
  const service = createService({
    getPool: () => ({
      async getConnection() {
        return connection;
      },
    }),
    upsertCandidateWorkbookRows: async (rows, sourceType, options) => {
      assert.equal(sourceType, "xlsx");
      assert.equal(options.connection, connection);
      assert.equal(options.schoolId, "school-1");
      calls.push(`write:${rows.length}`);
    },
    workbookRows,
  });

  const result = await service.importCandidates({
    fileContentBase64: "xlsx",
    schoolId: "school-1",
  });

  assert.deepEqual(result, { processed: 1001 });
  assert.deepEqual(calls, ["begin", "write:500", "write:500", "write:1", "commit", "release"]);
});

test("candidate import rolls back every batch when a bulk write fails", async () => {
  const calls = [];
  const expectedError = new Error("bulk write failed");
  const connection = {
    async beginTransaction() {
      calls.push("begin");
    },
    async commit() {
      calls.push("commit");
    },
    release() {
      calls.push("release");
    },
    async rollback() {
      calls.push("rollback");
    },
  };
  const workbookRows = Array.from({ length: 501 }, (_value, index) =>
    createCandidateRow({ examineeNo: String(26010001 + index) }),
  );
  const service = createService({
    getPool: () => ({
      async getConnection() {
        return connection;
      },
    }),
    upsertCandidateWorkbookRows: async (rows) => {
      calls.push(`write:${rows.length}`);

      if (rows.length === 1) {
        throw expectedError;
      }
    },
    workbookRows,
  });

  await assert.rejects(
    () => service.importCandidates({ fileContentBase64: "xlsx", schoolId: "school-1" }),
    expectedError,
  );
  assert.deepEqual(calls, ["begin", "write:500", "write:1", "rollback", "release"]);
});
