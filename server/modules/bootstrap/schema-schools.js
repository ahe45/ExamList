async function ensureSchoolColumns(connection, { ensureColumn }) {
  await ensureColumn(connection, {
    columnName: "deletion_password_hash",
    definition: "deletion_password_hash VARCHAR(255) NOT NULL DEFAULT '' COMMENT '학교 삭제 비밀번호 해시' AFTER description",
    tableName: "schools",
  });
}

async function ensureSchoolSettingsColumns(connection, { defaultSchoolId, ensureColumn, ensureIndex }) {
  await connection.query(
    `
      ALTER TABLE \`school_settings\`
      MODIFY COLUMN \`id\` VARCHAR(64) NOT NULL COMMENT '학교 설정 식별자'
    `,
  );
  await ensureColumn(connection, {
    columnName: "school_id",
    definition: `school_id VARCHAR(64) NOT NULL DEFAULT '${defaultSchoolId}' COMMENT '학교 식별자' AFTER id`,
    tableName: "school_settings",
  });
  await ensureColumn(connection, {
    columnName: "academic_year",
    definition: "academic_year VARCHAR(20) NOT NULL DEFAULT '' COMMENT '모집년도' AFTER school_name",
    tableName: "school_settings",
  });
  await ensureIndex(connection, {
    definition: "UNIQUE KEY uniq_school_settings_school (school_id)",
    indexName: "uniq_school_settings_school",
    tableName: "school_settings",
  });
}

async function ensurePdfTemplateSchoolColumns(connection, { defaultSchoolId, ensureColumn, ensureIndex }) {
  await connection.query(
    `
      ALTER TABLE \`pdf_templates\`
      MODIFY COLUMN \`generation_unit\` ENUM('all', 'admission', 'admissionCode', 'exam', 'examDate', 'seriesCode', 'periodCode', 'room', 'roomCode', 'group', 'unit', 'unitCode', 'buildingCode', 'custom') NOT NULL DEFAULT 'roomCode' COMMENT 'PDF 생성 단위'
    `,
  );
  await ensureColumn(connection, {
    columnName: "school_id",
    definition: `school_id VARCHAR(64) NOT NULL DEFAULT '${defaultSchoolId}' COMMENT '학교 식별자' AFTER id`,
    tableName: "pdf_templates",
  });
  await connection.query(
    `
      UPDATE \`pdf_templates\`
      SET \`school_id\` = ?
      WHERE \`school_id\` = ''
    `,
    [defaultSchoolId],
  );
  await ensureIndex(connection, {
    definition: "KEY idx_pdf_templates_school_active (school_id, is_active, deleted_at)",
    indexName: "idx_pdf_templates_school_active",
    tableName: "pdf_templates",
  });
}

async function backfillSchoolScopedRows(connection, { defaultSchoolId }) {
  await connection.query(`UPDATE \`pdf_templates\` SET \`school_id\` = ? WHERE \`school_id\` = ''`, [defaultSchoolId]);
  await connection.query(`UPDATE \`candidate_records\` SET \`school_id\` = ? WHERE \`school_id\` = ''`, [defaultSchoolId]);
  await connection.query(`UPDATE \`pdf_generation_histories\` SET \`school_id\` = ? WHERE \`school_id\` = ''`, [defaultSchoolId]);
  await connection.query(`UPDATE \`pdf_generation_batches\` SET \`school_id\` = ? WHERE \`school_id\` = ''`, [defaultSchoolId]);
  await connection.query(
    `
      UPDATE \`school_settings\`
      SET \`school_id\` = ?
      WHERE \`school_id\` = '' OR \`id\` = 'default'
    `,
    [defaultSchoolId],
  );
}

module.exports = {
  backfillSchoolScopedRows,
  ensurePdfTemplateSchoolColumns,
  ensureSchoolColumns,
  ensureSchoolSettingsColumns,
};
