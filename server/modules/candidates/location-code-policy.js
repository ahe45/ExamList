const LOCATION_KEY_BATCH_SIZE = 200;

async function lockCandidateSchool(connection, schoolId) {
  await connection.query("SELECT id FROM schools WHERE id = ? FOR UPDATE", [schoolId]);
}

async function assertUniqueCandidateLocationCodes(connection, schoolId, rows, createHttpError) {
  const locations = [
    { field: "buildingCode", column: "building_code", identity: "building", label: "고사건물코드" },
    { field: "roomCode", column: "room_code", identity: "building_code, room", label: "고사실코드" },
  ];

  for (const { field, column, identity, label } of locations) {
    const keys = new Map();
    for (const row of rows) {
      const key = [row.date, row.periodCode, row[field]];
      keys.set(JSON.stringify(key), key);
    }

    const locationKeys = Array.from(keys.values());
    for (let start = 0; start < locationKeys.length; start += LOCATION_KEY_BATCH_SIZE) {
      const batch = locationKeys.slice(start, start + LOCATION_KEY_BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?)").join(", ");
      const [[conflict]] = await connection.query(
        `SELECT exam_date AS examDate, period_code AS periodCode, ${column} AS code
         FROM candidate_records
         WHERE school_id = ? AND (exam_date, period_code, ${column}) IN (${placeholders})
         GROUP BY exam_date, period_code, ${column}
         HAVING COUNT(DISTINCT ${identity}) > 1
         LIMIT 1`,
        [schoolId, ...batch.flat()],
      );

      if (conflict) {
        throw createHttpError(
          409,
          `${conflict.examDate} / ${conflict.periodCode}에서 ${label} '${conflict.code}'이(가) 서로 다른 장소에 사용되었습니다.`,
          "CANDIDATE_LOCATION_CODE_CONFLICT",
        );
      }
    }
  }
}

module.exports = { assertUniqueCandidateLocationCodes, lockCandidateSchool };
