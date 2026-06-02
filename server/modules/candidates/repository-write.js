const crypto = require("crypto");

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
        candidateId,
        ...(schoolId ? [schoolId] : []),
      ],
    );
  }

  async function insertCandidateWorkbookRow(row = {}, sourceType = "xlsx", options = {}) {
    const schoolId = await resolveSchoolId(options.schoolId);
    const sourceId = createCandidateRecordSourceId(row);
    const id = createCandidateRecordId({ row, schoolId, sourceType });

    await query(
      `
        INSERT INTO candidate_records (
          id,
          school_id,
          source_type,
          source_id,
          designated_sort,
          admission_year,
          exam_date,
          time,
          end_time,
          track,
          admission,
          admission_code,
          series,
          series_code,
          unit,
          unit_code,
          major,
          major_code,
          building,
          building_code,
          room,
          room_code,
          group_name,
          period,
          period_code,
          examinee_no,
          temporary_no,
          name,
          birth_date,
          opt1,
          opt2,
          opt3,
          opt4,
          opt5,
          photo_name,
          photo_mime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '')
        ON DUPLICATE KEY UPDATE
          designated_sort = VALUES(designated_sort),
          admission_year = VALUES(admission_year),
          exam_date = VALUES(exam_date),
          time = VALUES(time),
          end_time = VALUES(end_time),
          track = VALUES(track),
          admission = VALUES(admission),
          admission_code = VALUES(admission_code),
          series = VALUES(series),
          series_code = VALUES(series_code),
          unit = VALUES(unit),
          unit_code = VALUES(unit_code),
          major = VALUES(major),
          major_code = VALUES(major_code),
          building = VALUES(building),
          building_code = VALUES(building_code),
          room = VALUES(room),
          room_code = VALUES(room_code),
          group_name = VALUES(group_name),
          period = VALUES(period),
          period_code = VALUES(period_code),
          examinee_no = VALUES(examinee_no),
          temporary_no = VALUES(temporary_no),
          name = VALUES(name),
          birth_date = VALUES(birth_date),
          opt1 = VALUES(opt1),
          opt2 = VALUES(opt2),
          opt3 = VALUES(opt3),
          opt4 = VALUES(opt4),
          opt5 = VALUES(opt5),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
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
      ],
    );
  }

  return Object.freeze({
    insertCandidateWorkbookRow,
    updateCandidateRowById,
  });
}

module.exports = {
  createCandidateRecordId,
  createCandidateRecordSourceId,
  createCandidateWriteRepository,
};
