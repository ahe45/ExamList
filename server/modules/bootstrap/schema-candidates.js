async function ensureCandidateRecordColumns(
  connection,
  { defaultSchoolId, dropIndexIfExists, ensureColumn, ensureIndex },
) {
  await ensureColumn(connection, {
    columnName: "school_id",
    definition: `school_id VARCHAR(64) NOT NULL DEFAULT '${defaultSchoolId}' COMMENT '학교 식별자' AFTER id`,
    tableName: "candidate_records",
  });
  await connection.query(
    `
      ALTER TABLE \`candidate_records\`
      MODIFY COLUMN \`source_type\` ENUM('manual', 'csv', 'xlsx') NOT NULL DEFAULT 'manual' COMMENT '데이터 입력 원본 유형',
      MODIFY COLUMN \`source_id\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '원본 시스템의 데이터 식별자'
    `,
  );
  await ensureColumn(connection, {
    columnName: "designated_sort",
    definition: "designated_sort VARCHAR(120) NOT NULL DEFAULT '' COMMENT '지정정렬' AFTER source_id",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "admission_year",
    definition: "admission_year VARCHAR(20) NOT NULL DEFAULT '' COMMENT '학년도' AFTER designated_sort",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "end_time",
    definition: "end_time VARCHAR(40) NOT NULL DEFAULT '' COMMENT '종료시간' AFTER time",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "admission_code",
    definition: "admission_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전형 코드' AFTER admission",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "series_code",
    definition: "series_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계열 코드' AFTER series",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "unit_code",
    definition: "unit_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '모집단위 코드' AFTER unit",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "major_code",
    definition: "major_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전공 코드' AFTER major",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "building_code",
    definition: "building_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사 건물 코드' AFTER building",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "period",
    definition: "period VARCHAR(120) NOT NULL DEFAULT '' COMMENT '교시명' AFTER room_code",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "period_code",
    definition: "period_code VARCHAR(120) NOT NULL DEFAULT '' COMMENT '교시 코드' AFTER period",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "temporary_no",
    definition: "temporary_no VARCHAR(120) NOT NULL DEFAULT '' COMMENT '가번호' AFTER examinee_no",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "opt1",
    definition: "opt1 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 1' AFTER birth_date",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "opt2",
    definition: "opt2 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 2' AFTER opt1",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "opt3",
    definition: "opt3 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 3' AFTER opt2",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "opt4",
    definition: "opt4 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 4' AFTER opt3",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "opt5",
    definition: "opt5 VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 5' AFTER opt4",
    tableName: "candidate_records",
  });
  await ensureColumn(connection, {
    columnName: "photo_mime",
    definition: "photo_mime VARCHAR(120) NOT NULL DEFAULT '' COMMENT '수험생 사진 MIME 타입' AFTER photo_name",
    tableName: "candidate_records",
  });
  await connection.query(
    `
      ALTER TABLE \`candidate_records\`
      MODIFY COLUMN \`exam_date\` VARCHAR(120) NULL COMMENT '시험일',
      MODIFY COLUMN \`designated_sort\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '지정정렬',
      MODIFY COLUMN \`admission_year\` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '학년도',
      MODIFY COLUMN \`time\` VARCHAR(40) NOT NULL DEFAULT '' COMMENT '시작시간',
      MODIFY COLUMN \`end_time\` VARCHAR(40) NOT NULL DEFAULT '' COMMENT '종료시간',
      MODIFY COLUMN \`admission_code\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전형 코드',
      MODIFY COLUMN \`series\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계열명',
      MODIFY COLUMN \`series_code\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '계열 코드',
      MODIFY COLUMN \`unit\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '모집단위명',
      MODIFY COLUMN \`unit_code\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '모집단위 코드',
      MODIFY COLUMN \`major\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전공명',
      MODIFY COLUMN \`major_code\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '전공 코드',
      MODIFY COLUMN \`building\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사건물명',
      MODIFY COLUMN \`building_code\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사 건물 코드',
      MODIFY COLUMN \`room\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '고사실명',
      MODIFY COLUMN \`period\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '교시명',
      MODIFY COLUMN \`period_code\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '교시 코드',
      MODIFY COLUMN \`temporary_no\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '가번호',
      MODIFY COLUMN \`birth_date\` VARCHAR(120) NULL COMMENT '수험생 생년월일',
      MODIFY COLUMN \`opt1\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 1',
      MODIFY COLUMN \`opt2\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 2',
      MODIFY COLUMN \`opt3\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 3',
      MODIFY COLUMN \`opt4\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 4',
      MODIFY COLUMN \`opt5\` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '사용자 옵션 5',
      MODIFY COLUMN \`photo_mime\` VARCHAR(120) NOT NULL DEFAULT '' COMMENT '수험생 사진 MIME 타입'
    `,
  );
  await ensureIndex(connection, {
    definition: "KEY idx_candidate_records_school_lookup (school_id, exam_date, room, examinee_no)",
    indexName: "idx_candidate_records_school_lookup",
    tableName: "candidate_records",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_candidate_records_school_admission (school_id, admission, exam_date)",
    indexName: "idx_candidate_records_school_admission",
    tableName: "candidate_records",
  });
  await dropIndexIfExists(connection, {
    indexName: "uniq_candidate_records_source",
    tableName: "candidate_records",
  });
  await ensureIndex(connection, {
    definition: "UNIQUE KEY uniq_candidate_records_school_source (school_id, source_type, source_id)",
    indexName: "uniq_candidate_records_school_source",
    tableName: "candidate_records",
  });
  await ensureIndex(connection, {
    definition: "UNIQUE KEY uniq_candidate_records_school_examinee_period (school_id, examinee_no, period_code)",
    indexName: "uniq_candidate_records_school_examinee_period",
    tableName: "candidate_records",
  });
}

module.exports = {
  ensureCandidateRecordColumns,
};
