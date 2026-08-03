const crypto = require("crypto");

const CANDIDATE_WORKBOOK_INSERT_COLUMNS = Object.freeze([
  "id",
  "school_id",
  "source_type",
  "source_id",
  "designated_sort",
  "admission_year",
  "exam_date",
  "time",
  "end_time",
  "track",
  "admission",
  "admission_code",
  "series",
  "series_code",
  "unit",
  "unit_code",
  "major",
  "major_code",
  "building",
  "building_code",
  "room",
  "room_code",
  "group_name",
  "period",
  "period_code",
  "examinee_no",
  "temporary_no",
  "name",
  "birth_date",
  "opt1",
  "opt2",
  "opt3",
  "opt4",
  "opt5",
  "opt6",
  "opt7",
  "opt8",
  "opt9",
  "opt10",
  "photo_name",
  "photo_mime",
]);

const CANDIDATE_WORKBOOK_UPDATE_COLUMNS = Object.freeze([
  "source_id",
  "designated_sort",
  "admission_year",
  "exam_date",
  "time",
  "end_time",
  "track",
  "admission",
  "admission_code",
  "series",
  "series_code",
  "unit",
  "unit_code",
  "major",
  "major_code",
  "building",
  "building_code",
  "room",
  "room_code",
  "group_name",
  "period",
  "period_code",
  "examinee_no",
  "temporary_no",
  "name",
  "birth_date",
  "opt1",
  "opt2",
  "opt3",
  "opt4",
  "opt5",
  "opt6",
  "opt7",
  "opt8",
  "opt9",
  "opt10",
]);

function createCandidateRecordSourceId(row = {}) {
  const examineeNo = String(row.examineeNo || "").trim();
  const periodCode = String(row.periodCode || "").trim();

  return `${examineeNo}|${periodCode}`;
}

function createCandidateRecordId({ row = {}, schoolId, sourceType }) {
  const sourceId = createCandidateRecordSourceId(row);
  return `candidate-${crypto
    .createHash("sha256")
    .update(`${schoolId}:${sourceType}:${sourceId}`, "utf8")
    .digest("hex")
    .slice(0, 32)}`;
}

function createCandidateWorkbookInsertValues(row = {}, sourceType, schoolId) {
  const sourceId = createCandidateRecordSourceId(row);
  const id = createCandidateRecordId({ row, schoolId, sourceType });

  return [
    id,
    schoolId,
    sourceType,
    sourceId,
    row.designatedSort,
    row.admissionYear,
    row.date,
    row.time,
    row.endTime,
    row.track,
    row.admission,
    row.admissionCode,
    row.series,
    row.seriesCode,
    row.unit,
    row.unitCode,
    row.major,
    row.majorCode,
    row.building,
    row.buildingCode,
    row.room,
    row.roomCode,
    row.group,
    row.period,
    row.periodCode,
    row.examineeNo,
    row.temporaryNo,
    row.name,
    row.birth,
    row.opt1,
    row.opt2,
    row.opt3,
    row.opt4,
    row.opt5,
    row.opt6,
    row.opt7,
    row.opt8,
    row.opt9,
    row.opt10,
    "",
    "",
  ];
}

function createCandidateWriteRepository({ query, resolveSchoolId }) {
  async function updateCandidateRowById(candidateId, row = {}, options = {}) {
    const schoolId = String(options.schoolId || "").trim();
    const sourceId = createCandidateRecordSourceId(row);

    await query(
      `
        UPDATE candidate_records
        SET
          source_id = ?,
          designated_sort = ?,
          admission_year = ?,
          exam_date = ?,
          time = ?,
          end_time = ?,
          track = ?,
          admission = ?,
          admission_code = ?,
          series = ?,
          series_code = ?,
          unit = ?,
          unit_code = ?,
          major = ?,
          major_code = ?,
          building = ?,
          building_code = ?,
          room = ?,
          room_code = ?,
          group_name = ?,
          period = ?,
          period_code = ?,
          examinee_no = ?,
          temporary_no = ?,
          name = ?,
          birth_date = ?,
          opt1 = ?,
          opt2 = ?,
          opt3 = ?,
          opt4 = ?,
          opt5 = ?,
          opt6 = ?,
          opt7 = ?,
          opt8 = ?,
          opt9 = ?,
          opt10 = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ${schoolId ? "AND school_id = ?" : ""}
      `,
      [
        sourceId,
        row.designatedSort,
        row.admissionYear,
        row.date,
        row.time,
        row.endTime,
        row.track,
        row.admission,
        row.admissionCode,
        row.series,
        row.seriesCode,
        row.unit,
        row.unitCode,
        row.major,
        row.majorCode,
        row.building,
        row.buildingCode,
        row.room,
        row.roomCode,
        row.group,
        row.period,
        row.periodCode,
        row.examineeNo,
        row.temporaryNo,
        row.name,
        row.birth,
        row.opt1,
        row.opt2,
        row.opt3,
        row.opt4,
        row.opt5,
        row.opt6,
        row.opt7,
        row.opt8,
        row.opt9,
        row.opt10,
        candidateId,
        ...(schoolId ? [schoolId] : []),
      ],
    );
  }

  async function upsertCandidateWorkbookRows(rows = [], sourceType = "xlsx", options = {}) {
    const candidateRows = Array.isArray(rows) ? rows : [];

    if (!candidateRows.length) {
      return { processed: 0 };
    }

    const schoolId = await resolveSchoolId(options.schoolId);
    const normalizedSourceType = String(sourceType || "xlsx").trim() || "xlsx";
    const valuePlaceholders = candidateRows
      .map(() => `(${CANDIDATE_WORKBOOK_INSERT_COLUMNS.map(() => "?").join(", ")})`)
      .join(",\n          ");
    const params = candidateRows.flatMap((row) =>
      createCandidateWorkbookInsertValues(row, normalizedSourceType, schoolId),
    );
    const executeQuery = options.connection?.query
      ? (sql, values) => options.connection.query(sql, values)
      : query;

    await executeQuery(
      `
        INSERT INTO candidate_records (
          ${CANDIDATE_WORKBOOK_INSERT_COLUMNS.join(",\n          ")}
        ) VALUES
          ${valuePlaceholders}
        ON DUPLICATE KEY UPDATE
          ${CANDIDATE_WORKBOOK_UPDATE_COLUMNS.map((column) => `${column} = VALUES(${column})`).join(",\n          ")},
          updated_at = CURRENT_TIMESTAMP
      `,
      params,
    );

    return { processed: candidateRows.length };
  }

  async function insertCandidateWorkbookRow(row = {}, sourceType = "xlsx", options = {}) {
    await upsertCandidateWorkbookRows([row], sourceType, options);
  }

  return Object.freeze({
    insertCandidateWorkbookRow,
    upsertCandidateWorkbookRows,
    updateCandidateRowById,
  });
}

module.exports = {
  createCandidateRecordId,
  createCandidateRecordSourceId,
  createCandidateWriteRepository,
};
