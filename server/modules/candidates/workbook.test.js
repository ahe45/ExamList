const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const { createCandidateWorkbookService } = require("./workbook");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

function createCandidateWorkbookInput(overrides = {}) {
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

test("normalizeCandidateWorkbookInput maps required XLSX fields", () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const row = service.normalizeCandidateWorkbookInput(
    createCandidateWorkbookInput({
      admissionYear: "2026",
      campus: "서울캠퍼스",
      designatedSort: "1",
      endTime: "10:00",
      temporaryNo: "A001",
    }),
    0,
  );

  assert.equal(row.date, "2026-03-28");
  assert.equal(row.time, "08:40");
  assert.equal(row.endTime, "10:00");
  assert.equal(row.examineeNo, "26010001");
  assert.equal(row.designatedSort, "1");
  assert.equal(row.temporaryNo, "A001");
  assert.equal(row.admissionCode, "SU");
  assert.equal(row.unitCode, "KOR");
  assert.equal(row.periodCode, "P1");
  assert.equal(row.buildingCode, "BLD01");
  assert.equal(row.roomCode, "R101");
  assert.equal(row.opt1, "");
});

test("normalizeCandidateWorkbookInput requires configured code fields", () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const requiredCodeFields = [
    { key: "admissionCode", label: "전형코드" },
    { key: "unitCode", label: "모집단위코드" },
    { key: "periodCode", label: "교시코드" },
    { key: "buildingCode", label: "고사건물코드" },
    { key: "roomCode", label: "고사실코드" },
  ];

  requiredCodeFields.forEach(({ key, label }) => {
    assert.throws(
      () => service.normalizeCandidateWorkbookInput(createCandidateWorkbookInput({ [key]: "" }), 0),
      (error) => error.errorCode === "CANDIDATE_FIELD_REQUIRED" && error.message === `${label} 값을 입력하세요. (2행)`,
    );
  });
});

test("normalizeCandidateWorkbookInput accepts free-form date text", () => {
  const service = createCandidateWorkbookService({ createHttpError });

  const row = service.normalizeCandidateWorkbookInput(
    createCandidateWorkbookInput({
      admissionYear: "2026",
      birth: "2006년 1월 2일",
      campus: "서울캠퍼스",
      date: "2026/03/28",
    }),
    2,
  );

  assert.equal(row.date, "2026/03/28");
  assert.equal(row.birth, "2006년 1월 2일");
});

test("normalizeCandidateWorkbookInput accepts free-form time text", () => {
  const service = createCandidateWorkbookService({ createHttpError });

  const row = service.normalizeCandidateWorkbookInput(
    createCandidateWorkbookInput({
      endTime: "시험 종료 후",
      time: "오전 9시 시작",
    }),
    0,
  );

  assert.equal(row.time, "오전 9시 시작");
  assert.equal(row.endTime, "시험 종료 후");
});

test("normalizeCandidateWorkbookInput does not require campus fields", () => {
  const service = createCandidateWorkbookService({ createHttpError });

  const row = service.normalizeCandidateWorkbookInput(
    createCandidateWorkbookInput(),
    0,
  );

  assert.equal(row.campus, "");
  assert.equal(row.campusCode, "");
});

test("buildCandidateTemplateBuffer omits campus columns", async () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const buffer = await service.buildCandidateTemplateBuffer();
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const headers = worksheet.getRow(1).values.filter(Boolean);

  assert.ok(!headers.includes("캠퍼스명"));
  assert.ok(!headers.includes("캠퍼스코드"));
});

test("buildCandidateTemplateBuffer highlights required column headers", async () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const buffer = await service.buildCandidateTemplateBuffer();
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const headerRow = worksheet.getRow(1);
  const getHeaderFill = (headerText) => {
    let cellIndex = 0;

    headerRow.eachCell((cell, index) => {
      if (!cellIndex && String(cell.value || "") === headerText) {
        cellIndex = index;
      }
    });

    return cellIndex ? headerRow.getCell(cellIndex).fill?.fgColor?.argb : "";
  };

  assert.equal(getHeaderFill("수험번호"), "FFFFF2CC");
  assert.equal(getHeaderFill("시작시간"), "FFFFF2CC");
  assert.equal(getHeaderFill("전형코드"), "FFFFF2CC");
  assert.equal(getHeaderFill("모집단위코드"), "FFFFF2CC");
  assert.equal(getHeaderFill("교시코드"), "FFFFF2CC");
  assert.equal(getHeaderFill("고사건물코드"), "FFFFF2CC");
  assert.equal(getHeaderFill("고사실코드"), "FFFFF2CC");
  assert.equal(getHeaderFill("지정정렬"), "FFF4F7FB");
  assert.equal(getHeaderFill("종료시간"), "FFF4F7FB");
  assert.equal(getHeaderFill("계열코드"), "FFF4F7FB");
});

test("buildCandidateExportBuffer creates XLSX buffer for rows", async () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const buffer = await service.buildCandidateExportBuffer([
    createCandidateWorkbookInput({
      admissionYear: "2026",
      campus: "서울캠퍼스",
    }),
  ]);

  assert.ok(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array);
  assert.ok(buffer.length > 0);
});
