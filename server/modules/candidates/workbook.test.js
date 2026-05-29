const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidateWorkbookService } = require("./workbook");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("normalizeCandidateWorkbookInput maps required XLSX fields", () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const row = service.normalizeCandidateWorkbookInput(
    {
      admission: "일반전형",
      admissionYear: "2026",
      birth: "2006-01-02",
      building: "본관",
      campus: "서울캠퍼스",
      date: "2026-03-28",
      designatedSort: "1",
      endTime: "10:00",
      examineeNo: "26010001",
      temporaryNo: "A001",
      name: "홍길동",
      period: "1교시",
      room: "101",
      series: "인문",
      time: "08:40",
      track: "수시",
      unit: "국어국문학과",
    },
    0,
  );

  assert.equal(row.date, "2026-03-28");
  assert.equal(row.time, "08:40");
  assert.equal(row.endTime, "10:00");
  assert.equal(row.examineeNo, "26010001");
  assert.equal(row.designatedSort, "1");
  assert.equal(row.temporaryNo, "A001");
  assert.equal(row.admissionCode, "");
  assert.equal(row.opt1, "");
});

test("normalizeCandidateWorkbookInput accepts free-form date text", () => {
  const service = createCandidateWorkbookService({ createHttpError });

  const row = service.normalizeCandidateWorkbookInput(
    {
      admission: "일반전형",
      admissionYear: "2026",
      birth: "2006년 1월 2일",
      building: "본관",
      campus: "서울캠퍼스",
      date: "2026/03/28",
      examineeNo: "26010001",
      name: "홍길동",
      period: "1교시",
      room: "101",
      series: "인문",
      time: "08:40",
      track: "수시",
      unit: "국어국문학과",
    },
    2,
  );

  assert.equal(row.date, "2026/03/28");
  assert.equal(row.birth, "2006년 1월 2일");
});

test("buildCandidateExportBuffer creates XLSX buffer for rows", async () => {
  const service = createCandidateWorkbookService({ createHttpError });
  const buffer = await service.buildCandidateExportBuffer([
    {
      admission: "일반전형",
      admissionYear: "2026",
      birth: "2006-01-02",
      building: "본관",
      campus: "서울캠퍼스",
      date: "2026-03-28",
      examineeNo: "26010001",
      name: "홍길동",
      period: "1교시",
      room: "101",
      series: "인문",
      time: "08:40",
      track: "수시",
      unit: "국어국문학과",
    },
  ]);

  assert.ok(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array);
  assert.ok(buffer.length > 0);
});
