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

function createService({ existingRows = [], normalizeCandidateWorkbookInput = (row) => row, workbookRows = [] } = {}) {
  return createCandidateImportService({
    createHttpError,
    insertCandidateWorkbookRow: async () => {},
    normalizeCandidateWorkbookInput,
    parseCandidateWorkbook: async () => workbookRows,
    query: async () => existingRows,
    resolveSchoolId: async (schoolId = "") => schoolId || "school-1",
    toCandidateWorkbookRow: (row) => ({ ...row }),
    updateCandidateRowById: async () => {},
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
