const ExcelJS = require("exceljs");
const candidateFields = require("../../../shared/domain/candidate-fields");

const candidateTemplateColumns = candidateFields.createTemplateColumns({
  keys: candidateFields.candidateWorkbookFieldKeys,
});
const candidateExportColumns = candidateFields.createWorkbookTextColumns({
  dateLabel: "시험날짜",
  keys: candidateFields.candidateWorkbookFieldKeys,
});
const optionalCandidateTemplateColumnKeys = new Set(candidateFields.optionalTemplateFieldKeys);
const legacyCandidateTemplateHeaders = candidateFields.legacyTemplateHeaders;

function createCandidateWorkbookService({ createHttpError }) {
  function normalizeText(value, fieldName, rowNumber) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 값을 입력하세요.${suffix}`, "CANDIDATE_FIELD_REQUIRED");
    }

    return normalizedValue;
  }

  function normalizeOptionalText(value) {
    return String(value ?? "").trim();
  }

  function normalizeDate(value, fieldName, rowNumber) {
    const normalizedValue = normalizeText(value, fieldName, rowNumber);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 형식은 YYYY-MM-DD여야 합니다.${suffix}`, "CANDIDATE_DATE_INVALID");
    }

    return normalizedValue;
  }

  function normalizeTime(value, fieldName, rowNumber) {
    const normalizedValue = normalizeText(value, fieldName, rowNumber);

    if (!/^\d{2}:\d{2}$/.test(normalizedValue)) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 형식은 HH:MM이어야 합니다.${suffix}`, "CANDIDATE_TIME_INVALID");
    }

    const [hourText, minuteText] = normalizedValue.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 값이 올바르지 않습니다.${suffix}`, "CANDIDATE_TIME_INVALID");
    }

    return normalizedValue;
  }

  function normalizeOptionalTime(value, fieldName, rowNumber) {
    const normalizedValue = normalizeOptionalText(value);

    if (!normalizedValue) {
      return "";
    }

    return normalizeTime(normalizedValue, fieldName, rowNumber);
  }

  function normalizeYear(value, fieldName, rowNumber) {
    const normalizedValue = normalizeText(value, fieldName, rowNumber);

    if (!/^\d{4}$/.test(normalizedValue)) {
      const suffix = Number.isFinite(rowNumber) && rowNumber >= 0 ? ` (${rowNumber}행)` : "";
      throw createHttpError(400, `${fieldName} 형식은 YYYY여야 합니다.${suffix}`, "CANDIDATE_YEAR_INVALID");
    }

    return normalizedValue;
  }

  function normalizeCandidateWorkbookInput(candidateInput = {}, index = -1) {
    const rowNumber = Number(index) >= 0 ? Number(index) + 2 : -1;

    return {
      admission: normalizeText(candidateInput.admission ?? candidateInput.exam, "전형명", rowNumber),
      admissionYear: normalizeOptionalText(candidateInput.admissionYear),
      admissionCode: normalizeOptionalText(candidateInput.admissionCode),
      birth: normalizeDate(candidateInput.birth ?? candidateInput.birthDate, "생년월일", rowNumber),
      building: normalizeText(candidateInput.building, "고사건물명", rowNumber),
      buildingCode: normalizeOptionalText(candidateInput.buildingCode),
      campus: normalizeText(candidateInput.campus ?? candidateInput.campusName, "캠퍼스명", rowNumber),
      campusCode: normalizeOptionalText(candidateInput.campusCode),
      date: normalizeDate(candidateInput.date ?? candidateInput.examDate, "시험날짜", rowNumber),
      designatedSort: normalizeOptionalText(candidateInput.designatedSort),
      examineeNo: normalizeText(candidateInput.examineeNo ?? candidateInput.examNo, "수험번호", rowNumber),
      group: normalizeOptionalText(candidateInput.group ?? candidateInput.groupName),
      major: normalizeOptionalText(candidateInput.major),
      majorCode: normalizeOptionalText(candidateInput.majorCode),
      name: normalizeText(candidateInput.name, "이름", rowNumber),
      opt1: normalizeOptionalText(candidateInput.opt1 ?? candidateInput.OPT1),
      opt2: normalizeOptionalText(candidateInput.opt2 ?? candidateInput.OPT2),
      opt3: normalizeOptionalText(candidateInput.opt3 ?? candidateInput.OPT3),
      opt4: normalizeOptionalText(candidateInput.opt4 ?? candidateInput.OPT4),
      opt5: normalizeOptionalText(candidateInput.opt5 ?? candidateInput.OPT5),
      period: normalizeText(candidateInput.period ?? candidateInput.periodName, "교시명", rowNumber),
      periodCode: normalizeOptionalText(candidateInput.periodCode),
      room: normalizeText(candidateInput.room, "고사실명", rowNumber),
      roomCode: normalizeOptionalText(candidateInput.roomCode),
      series: normalizeText(candidateInput.series, "계열명", rowNumber),
      seriesCode: normalizeOptionalText(candidateInput.seriesCode),
      temporaryNo: normalizeOptionalText(candidateInput.temporaryNo),
      time: normalizeTime(candidateInput.time ?? candidateInput.session ?? candidateInput.examStartTime, "시작시간", rowNumber),
      endTime: normalizeOptionalTime(candidateInput.endTime ?? candidateInput.examEndTime, "종료시간", rowNumber),
      track: normalizeText(candidateInput.track, "모집시기", rowNumber),
      unit: normalizeText(candidateInput.unit, "모집단위명", rowNumber),
      unitCode: normalizeOptionalText(candidateInput.unitCode),
    };
  }

  function extractExcelCellValue(value) {
    if (value == null) {
      return "";
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    if (typeof value === "object") {
      if (typeof value.text === "string") {
        return value.text;
      }

      if (Array.isArray(value.richText)) {
        return value.richText.map((segment) => segment?.text || "").join("");
      }

      if (value.result != null) {
        return extractExcelCellValue(value.result);
      }

      if (value.hyperlink) {
        return String(value.text || value.hyperlink || "");
      }

      if (value.formula && value.result != null) {
        return extractExcelCellValue(value.result);
      }
    }

    return "";
  }

  function getExcelCellText(cell) {
    return extractExcelCellValue(cell?.value)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
  }

  function applyWorkbookHeaderStyle(worksheet) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      fgColor: { argb: "FFF4F7FB" },
      pattern: "solid",
      type: "pattern",
    };
  }

  function buildWorkbookSheet(workbook, sheetName, columns, rows) {
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      style: column.text ? { numFmt: "@" } : undefined,
      width: column.width,
    }));

    applyWorkbookHeaderStyle(worksheet);
    rows.forEach((row) => worksheet.addRow(row));

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      columns.forEach((column, columnIndex) => {
        if (column.text) {
          worksheet.getRow(rowIndex).getCell(columnIndex + 1).numFmt = "@";
        }
      });
    }

    return worksheet;
  }

  function normalizeCandidateExportRow(record = {}) {
    return {
      admission: String(record.admission ?? record.admissionTypeName ?? "").trim(),
      admissionYear: String(record.admissionYear ?? "").trim(),
      admissionCode: String(record.admissionCode ?? record.applicationNo ?? "").trim(),
      birth: String(record.birth ?? record.birthDate ?? "").trim(),
      building: String(record.building ?? record.buildingName ?? "").trim(),
      buildingCode: String(record.buildingCode ?? "").trim(),
      campus: String(record.campus ?? record.campusName ?? "").trim(),
      campusCode: String(record.campusCode ?? "").trim(),
      date: String(record.date ?? record.examDate ?? "").trim(),
      designatedSort: String(record.designatedSort ?? "").trim(),
      examineeNo: String(record.examineeNo ?? record.examNo ?? "").trim(),
      group: String(record.group ?? record.groupName ?? "").trim(),
      major: String(record.major ?? record.majorName ?? "").trim(),
      majorCode: String(record.majorCode ?? "").trim(),
      name: String(record.name ?? "").trim(),
      opt1: String(record.opt1 ?? "").trim(),
      opt2: String(record.opt2 ?? "").trim(),
      opt3: String(record.opt3 ?? "").trim(),
      opt4: String(record.opt4 ?? "").trim(),
      opt5: String(record.opt5 ?? "").trim(),
      period: String(record.period ?? record.periodName ?? "").trim(),
      periodCode: String(record.periodCode ?? "").trim(),
      room: String(record.room ?? record.roomName ?? "").trim(),
      roomCode: String(record.roomCode ?? record.roomId ?? "").trim(),
      series: String(record.series ?? record.raw?.series ?? "").trim(),
      seriesCode: String(record.seriesCode ?? "").trim(),
      temporaryNo: String(record.temporaryNo ?? "").trim(),
      time: String(record.time ?? record.examStartTime ?? "").trim(),
      endTime: String(record.endTime ?? record.examEndTime ?? "").trim(),
      track: String(record.track ?? record.examName ?? "").trim(),
      unit: String(record.unit ?? record.departmentName ?? "").trim(),
      unitCode: String(record.unitCode ?? "").trim(),
    };
  }

  async function buildCandidateTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("수험생업로드", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = candidateTemplateColumns.map((column) => ({
      header: column.header,
      key: column.key,
      style: { numFmt: "@" },
      width: column.width,
    }));

    applyWorkbookHeaderStyle(worksheet);
    worksheet.addRow(
      candidateTemplateColumns.reduce((row, column) => {
        row[column.key] = column.sample;
        return row;
      }, {}),
    );

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= candidateTemplateColumns.length; columnIndex += 1) {
        worksheet.getRow(rowIndex).getCell(columnIndex).numFmt = "@";
      }
    }

    return workbook.xlsx.writeBuffer();
  }

  async function buildCandidateExportBuffer(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createHttpError(400, "다운로드할 수험생 데이터가 없습니다.", "CANDIDATE_EXPORT_EMPTY");
    }

    const workbook = new ExcelJS.Workbook();

    buildWorkbookSheet(workbook, "수험생등록", candidateExportColumns, rows.map((row) => normalizeCandidateExportRow(row)));

    return workbook.xlsx.writeBuffer();
  }

  async function parseCandidateWorkbook(fileContentBase64) {
    if (!fileContentBase64) {
      throw createHttpError(400, "XLSX 파일 데이터가 없습니다.", "CANDIDATE_IMPORT_FILE_EMPTY");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(fileContentBase64, "base64"));

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw createHttpError(400, "XLSX 파일에서 시트를 찾을 수 없습니다.", "CANDIDATE_IMPORT_SHEET_EMPTY");
    }

    const headerRow = worksheet.getRow(1);
    const columnIndexes = candidateTemplateColumns.reduce((indexes, column) => {
      const legacyHeaders = legacyCandidateTemplateHeaders[column.key];
      const expectedHeaders = [
        column.header,
        ...(Array.isArray(legacyHeaders) ? legacyHeaders : [legacyHeaders]),
      ]
        .filter(Boolean)
        .filter((header, index, headers) => headers.indexOf(header) === index);
      const matchedColumnIndex =
        headerRow.actualCellCount === 0
          ? -1
          : Array.from({ length: Math.max(worksheet.columnCount, candidateTemplateColumns.length) }, (_, offset) => offset + 1)
              .find((columnIndex) => expectedHeaders.includes(getExcelCellText(headerRow.getCell(columnIndex)))) ?? -1;

      if (matchedColumnIndex === -1) {
        if (optionalCandidateTemplateColumnKeys.has(column.key)) {
          indexes[column.key] = -1;
          return indexes;
        }

        throw createHttpError(400, `XLSX 헤더에 '${column.header}' 컬럼이 없습니다.`, "CANDIDATE_IMPORT_HEADER_MISSING");
      }

      indexes[column.key] = matchedColumnIndex;
      return indexes;
    }, {});
    const candidates = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const candidate = {};
      let hasAnyValue = false;

      candidateTemplateColumns.forEach((column) => {
        const columnIndex = columnIndexes[column.key];
        const value = columnIndex > 0 ? getExcelCellText(row.getCell(columnIndex)) : "";

        candidate[column.key] = value;
        hasAnyValue = hasAnyValue || value !== "";
      });

      if (hasAnyValue) {
        candidates.push(candidate);
      }
    }

    if (candidates.length === 0) {
      throw createHttpError(400, "XLSX에는 헤더와 최소 1개 이상의 데이터 행이 필요합니다.", "CANDIDATE_IMPORT_EMPTY");
    }

    return candidates;
  }

  return Object.freeze({
    buildCandidateExportBuffer,
    buildCandidateTemplateBuffer,
    normalizeCandidateExportRow,
    normalizeCandidateWorkbookInput,
    parseCandidateWorkbook,
  });
}

module.exports = {
  createCandidateWorkbookService,
};
