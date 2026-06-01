const candidateFields = require("../../../shared/domain/candidate-fields");

const CANDIDATE_DETAIL_BATCH_QUERY_SIZE = 200;
const CANDIDATE_IMPORT_PREVIEW_ROW_LIMIT = 8;
const CANDIDATE_IMPORT_COMPARISON_FIELDS = candidateFields.candidateWorkbookFieldKeys;
const CANDIDATE_IMPORT_EXISTING_DATA_POLICIES = Object.freeze({
  ALL: "all",
  INSERT_ONLY: "insert-only",
  INSERT_UPDATE: "insert-update",
});
const candidateImportCountFormatter = new Intl.NumberFormat("ko-KR");

function formatCandidateImportCount(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? candidateImportCountFormatter.format(Math.max(0, Math.trunc(numericValue))) : "0";
}

function createCandidateImportService({
  createHttpError,
  insertCandidateWorkbookRow,
  normalizeCandidateWorkbookInput,
  parseCandidateWorkbook,
  query,
  resolveSchoolId,
  toCandidateWorkbookRow,
  updateCandidateRowById,
}) {
  function buildCandidateImportDuplicateError(duplicateEntries = []) {
    const normalizedEntries = (Array.isArray(duplicateEntries) ? duplicateEntries : [])
      .map((entry) => ({
        examineeNo: String(entry?.examineeNo || "").trim(),
        rowNumbers: Array.isArray(entry?.rowNumbers) ? entry.rowNumbers : [],
      }))
      .filter((entry) => entry.examineeNo && entry.rowNumbers.length > 1);

    if (!normalizedEntries.length) {
      return null;
    }

    const summaryText = normalizedEntries
      .slice(0, 3)
      .map((entry) => `${entry.examineeNo}(${entry.rowNumbers.join(", ")}행)`)
      .join(", ");
    const suffix = normalizedEntries.length > 3 ? ` 외 ${formatCandidateImportCount(normalizedEntries.length - 3)}건` : "";

    return createHttpError(400, `XLSX에 중복된 수험번호가 있습니다: ${summaryText}${suffix}`, "CANDIDATE_IMPORT_DUPLICATE_NO");
  }

  function prepareCandidateImportRows(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw createHttpError(400, "업로드할 수험생 데이터가 없습니다.", "CANDIDATE_IMPORT_EMPTY");
    }

    const normalizedRows = rows.map((row, index) => normalizeCandidateWorkbookInput(row, index));
    const duplicateRowMap = new Map();

    normalizedRows.forEach((row, index) => {
      const duplicateEntry = duplicateRowMap.get(row.examineeNo) || {
        examineeNo: row.examineeNo,
        rowNumbers: [],
      };

      duplicateEntry.rowNumbers.push(index + 2);
      duplicateRowMap.set(row.examineeNo, duplicateEntry);
    });

    const duplicateError = buildCandidateImportDuplicateError(
      Array.from(duplicateRowMap.values()).filter((entry) => entry.rowNumbers.length > 1),
    );

    if (duplicateError) {
      throw duplicateError;
    }

    return normalizedRows;
  }

  async function getExistingCandidateImportRowsByNos(examineeNos = [], schoolId = "") {
    const normalizedExamineeNos = Array.from(
      new Set(
        (Array.isArray(examineeNos) ? examineeNos : [examineeNos])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    if (!normalizedExamineeNos.length) {
      return new Map();
    }

    const existingRowMap = new Map();

    for (let startIndex = 0; startIndex < normalizedExamineeNos.length; startIndex += CANDIDATE_DETAIL_BATCH_QUERY_SIZE) {
      const examineeChunk = normalizedExamineeNos.slice(startIndex, startIndex + CANDIDATE_DETAIL_BATCH_QUERY_SIZE);
      const placeholders = examineeChunk.map(() => "?").join(", ");
      const scopedConditions = schoolId ? "school_id = ? AND" : "";
      const scopedParams = schoolId ? [schoolId] : [];
      const rows = await query(
        `
          SELECT
            id,
            designated_sort AS designatedSort,
            admission_year AS admissionYear,
            exam_date AS date,
            time,
            end_time AS endTime,
            track,
            admission,
            admission_code AS admissionCode,
            series,
            series_code AS seriesCode,
            unit,
            unit_code AS unitCode,
            major,
            major_code AS majorCode,
            building,
            building_code AS buildingCode,
            room,
            room_code AS roomCode,
            group_name AS \`group\`,
            period,
            period_code AS periodCode,
            examinee_no AS examineeNo,
            temporary_no AS temporaryNo,
            name,
            birth_date AS birth,
            opt1,
            opt2,
            opt3,
            opt4,
            opt5
          FROM candidate_records
          WHERE ${scopedConditions} examinee_no IN (${placeholders})
          ORDER BY updated_at DESC
        `,
        [...scopedParams, ...examineeChunk],
      );

      rows.forEach((row) => {
        if (!existingRowMap.has(row.examineeNo)) {
          const normalizedExistingRow = toCandidateWorkbookRow(row);

          normalizedExistingRow.id = String(row.id || "");
          existingRowMap.set(row.examineeNo, normalizedExistingRow);
        }
      });
    }

    return existingRowMap;
  }

  function areCandidateImportRowsEqual(leftRow = {}, rightRow = {}) {
    return CANDIDATE_IMPORT_COMPARISON_FIELDS.every(
      (fieldKey) => String(leftRow?.[fieldKey] || "").trim() === String(rightRow?.[fieldKey] || "").trim(),
    );
  }

  function normalizeCandidateImportExistingDataPolicy(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (Object.values(CANDIDATE_IMPORT_EXISTING_DATA_POLICIES).includes(normalizedValue)) {
      return normalizedValue;
    }

    return CANDIDATE_IMPORT_EXISTING_DATA_POLICIES.INSERT_UPDATE;
  }

  function classifyCandidateImportRows(normalizedRows = [], existingRowMap = new Map()) {
    return (Array.isArray(normalizedRows) ? normalizedRows : []).map((row, index) => {
      const existingRow = existingRowMap.get(row.examineeNo) || null;
      const operation = existingRow ? (areCandidateImportRowsEqual(row, existingRow) ? "unchanged" : "update") : "insert";

      return {
        existingId: existingRow?.id || "",
        operation,
        row,
        rowNumber: index + 2,
      };
    });
  }

  function shouldProcessCandidateImportOperation(operation = "", existingDataPolicy = "") {
    const normalizedPolicy = normalizeCandidateImportExistingDataPolicy(existingDataPolicy);

    if (normalizedPolicy === CANDIDATE_IMPORT_EXISTING_DATA_POLICIES.ALL) {
      return true;
    }

    if (normalizedPolicy === CANDIDATE_IMPORT_EXISTING_DATA_POLICIES.INSERT_ONLY) {
      return String(operation || "").trim() === "insert";
    }

    return ["insert", "update"].includes(String(operation || "").trim());
  }

  async function saveCandidateRows(classifiedRows = [], options = {}) {
    const schoolId = await resolveSchoolId(options.schoolId);
    let processed = 0;

    for (const entry of Array.isArray(classifiedRows) ? classifiedRows : []) {
      if (entry.existingId) {
        await updateCandidateRowById(entry.existingId, entry.row, { schoolId });
      } else {
        await insertCandidateWorkbookRow(entry.row, "xlsx", { schoolId });
      }

      processed += 1;
    }

    return { processed };
  }

  async function previewCandidateImport(payload = {}) {
    if (!payload.fileContentBase64) {
      throw createHttpError(400, "XLSX 파일 데이터가 없습니다.", "CANDIDATE_IMPORT_FILE_EMPTY");
    }

    const workbookRows = await parseCandidateWorkbook(payload.fileContentBase64);
    const schoolId = await resolveSchoolId(payload.schoolId);
    const normalizedRows = prepareCandidateImportRows(workbookRows);
    const existingRowMap = await getExistingCandidateImportRowsByNos(normalizedRows.map((row) => row.examineeNo), schoolId);
    const classifiedRows = classifyCandidateImportRows(normalizedRows, existingRowMap);
    const previewRows = [];
    let insertCount = 0;
    let unchangedCount = 0;
    let updateCount = 0;

    classifiedRows.forEach(({ operation, row, rowNumber }) => {
      if (operation === "insert") {
        insertCount += 1;
      } else if (operation === "update") {
        updateCount += 1;
      } else {
        unchangedCount += 1;
      }

      if (previewRows.length < CANDIDATE_IMPORT_PREVIEW_ROW_LIMIT) {
        previewRows.push({
          admission: row.admission,
          admissionYear: row.admissionYear,
          birth: row.birth,
          campus: row.campus,
          date: row.date,
          designatedSort: row.designatedSort,
          examineeNo: row.examineeNo,
          group: row.group,
          name: row.name,
          operation,
          period: row.period,
          room: row.room,
          rowNumber,
          series: row.series,
          temporaryNo: row.temporaryNo,
          time: row.time,
          endTime: row.endTime,
          track: row.track,
          unit: row.unit,
        });
      }
    });

    return {
      fileName: String(payload.fileName || "").trim(),
      insertCount,
      previewRows,
      totalRows: normalizedRows.length,
      unchangedCount,
      updateCount,
    };
  }

  async function importCandidates(payload = {}) {
    const sourceRows = await parseCandidateWorkbook(payload.fileContentBase64);
    const schoolId = await resolveSchoolId(payload.schoolId);
    const normalizedRows = prepareCandidateImportRows(sourceRows);
    const existingDataPolicy = normalizeCandidateImportExistingDataPolicy(payload.existingDataPolicy);
    const existingRowMap = await getExistingCandidateImportRowsByNos(normalizedRows.map((row) => row.examineeNo), schoolId);
    const selectedRows = classifyCandidateImportRows(normalizedRows, existingRowMap).filter((entry) =>
      shouldProcessCandidateImportOperation(entry.operation, existingDataPolicy),
    );

    if (!selectedRows.length) {
      throw createHttpError(400, "선택한 기존 데이터 처리 방식에 따라 반영할 수험생 데이터가 없습니다.", "CANDIDATE_IMPORT_NOTHING_SELECTED");
    }

    return saveCandidateRows(selectedRows, { schoolId });
  }

  return Object.freeze({
    importCandidates,
    previewCandidateImport,
  });
}

module.exports = {
  createCandidateImportService,
};
