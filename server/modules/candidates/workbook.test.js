const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const candidateFields = require("../../../shared/domain/candidate-fields");
const { createCandidateWorkbookService } = require("./workbook");

const candidateTemplateColumns = candidateFields.createTemplateColumns({
  keys: candidateFields.candidateWorkbookFieldKeys,
});

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

async function createCandidateWorkbookBase64(rowValues = {}, cellFormatOverrides = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("수험생업로드");

  worksheet.columns = candidateTemplateColumns.map((column) => ({
    header: column.header,
    key: column.key,
    style: { numFmt: "@" },
    width: column.width,
  }));
  worksheet.addRow(
    candidateTemplateColumns.reduce((row, column) => {
      row[column.key] = rowValues[column.key] ?? column.sample;
      return row;
    }, {}),
  );

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= candidateTemplateColumns.length; columnIndex += 1) {
      worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
    }
  }

  Object.entries(cellFormatOverrides).forEach(([key, numFmt]) => {
    const columnIndex = candidateTemplateColumns.findIndex((column) => column.key === key) + 1;

    if (columnIndex > 0) {
      worksheet.getRow(2).getCell(columnIndex).numFmt = numFmt;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
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

test("normalizeCandidateWorkbookInput preserves uploaded text values", () => {
  const service = createCandidateWorkbookService({ createHttpError });

  const row = service.normalizeCandidateWorkbookInput(
    createCandidateWorkbookInput({
      date: " 2026-11-28 ",
      name: " 홍길동 ",
      opt1: " 값 앞뒤 공백 ",
    }),
    0,
  );

  assert.equal(row.date, " 2026-11-28 ");
  assert.equal(row.name, " 홍길동 ");
  assert.equal(row.opt1, " 값 앞뒤 공백 ");
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

test("parseCandidateWorkbook preserves text-formatted cell values", async () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const rows = await service.parseCandidateWorkbook(
    await createCandidateWorkbookBase64({
      birth: "2006/01/02",
      date: "2026-11-28",
      name: " 홍길동 ",
      opt1: " 값 앞뒤 공백 ",
      time: "오전 9시 시작",
    }),
  );

  assert.equal(rows[0].date, "2026-11-28");
  assert.equal(rows[0].birth, "2006/01/02");
  assert.equal(rows[0].name, " 홍길동 ");
  assert.equal(rows[0].opt1, " 값 앞뒤 공백 ");
  assert.equal(rows[0].time, "오전 9시 시작");
});

test("parseCandidateWorkbook rejects populated cells without text format", async () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const fileContentBase64 = await createCandidateWorkbookBase64(
    { date: "2026-11-28" },
    { date: "yyyy-mm-dd" },
  );

  await assert.rejects(
    () => service.parseCandidateWorkbook(fileContentBase64),
    (error) =>
      error.errorCode === "CANDIDATE_IMPORT_CELL_FORMAT_INVALID" &&
      error.message === "XLSX 데이터 셀은 텍스트 서식이어야 합니다. (2행, 시험날짜)",
  );
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
