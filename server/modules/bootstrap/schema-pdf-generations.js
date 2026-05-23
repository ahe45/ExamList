async function ensurePdfGenerationHistoryColumns(connection, { defaultSchoolId, ensureColumn, ensureIndex }) {
  await ensureColumn(connection, {
    columnName: "school_id",
    definition: `school_id VARCHAR(64) NOT NULL DEFAULT '${defaultSchoolId}' COMMENT '학교 식별자' AFTER id`,
    tableName: "pdf_generation_histories",
  });
  await connection.query(
    `
      ALTER TABLE \`pdf_generation_histories\`
      MODIFY COLUMN status ENUM('queued', 'running', 'completed', 'failed') NOT NULL DEFAULT 'completed' COMMENT '생성 작업 상태'
    `,
  );
  await connection.query(
    `
      ALTER TABLE \`pdf_generation_histories\`
      MODIFY COLUMN \`generation_unit\` ENUM('all', 'admission', 'admissionCode', 'exam', 'examDate', 'seriesCode', 'periodCode', 'room', 'roomCode', 'group', 'unit', 'unitCode', 'buildingCode', 'custom') NOT NULL DEFAULT 'roomCode' COMMENT 'PDF 생성 단위'
    `,
  );
  await ensureColumn(connection, {
    columnName: "target_name",
    definition: "target_name VARCHAR(120) NOT NULL DEFAULT '' COMMENT '생성 대상명' AFTER generation_unit",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "progress_percent",
    definition: "progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 COMMENT '생성 진행률' AFTER status",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "job_id",
    definition: "job_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '큐 작업 식별자' AFTER progress_percent",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "batch_id",
    definition: "batch_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '일괄 생성 식별자' AFTER job_id",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "attempt_count",
    definition: "attempt_count INT NOT NULL DEFAULT 1 COMMENT '현재 시도 횟수' AFTER batch_id",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "max_attempts",
    definition: "max_attempts INT NOT NULL DEFAULT 1 COMMENT '최대 시도 횟수' AFTER attempt_count",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "request_json",
    definition: "request_json LONGTEXT NULL COMMENT 'PDF 생성 요청 JSON' AFTER error_message",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "expires_at",
    definition: "expires_at DATETIME NULL COMMENT '보관 만료 일시' AFTER request_json",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "purged_at",
    definition: "purged_at DATETIME NULL COMMENT '파일 정리 일시' AFTER expires_at",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "started_at",
    definition: "started_at DATETIME NULL COMMENT '생성 시작 일시' AFTER purged_at",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "completed_at",
    definition: "completed_at DATETIME NULL COMMENT '생성 완료 일시' AFTER started_at",
    tableName: "pdf_generation_histories",
  });
  await ensureColumn(connection, {
    columnName: "updated_at",
    definition: "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '이력 수정 일시' AFTER created_at",
    tableName: "pdf_generation_histories",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_pdf_generation_histories_school_created_at (school_id, created_at)",
    indexName: "idx_pdf_generation_histories_school_created_at",
    tableName: "pdf_generation_histories",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_pdf_generation_histories_job (job_id)",
    indexName: "idx_pdf_generation_histories_job",
    tableName: "pdf_generation_histories",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_pdf_generation_histories_batch (batch_id, status)",
    indexName: "idx_pdf_generation_histories_batch",
    tableName: "pdf_generation_histories",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_pdf_generation_histories_expires_at (expires_at, purged_at)",
    indexName: "idx_pdf_generation_histories_expires_at",
    tableName: "pdf_generation_histories",
  });
}

async function ensurePdfGenerationBatchColumns(connection, { defaultSchoolId, ensureColumn, ensureIndex }) {
  await connection.query(
    `
      ALTER TABLE \`pdf_generation_batches\`
      MODIFY COLUMN \`generation_unit\` ENUM('all', 'admission', 'admissionCode', 'exam', 'examDate', 'seriesCode', 'periodCode', 'room', 'roomCode', 'group', 'unit', 'unitCode', 'buildingCode', 'custom') NOT NULL DEFAULT 'roomCode' COMMENT 'PDF 생성 단위'
    `,
  );
  await ensureColumn(connection, {
    columnName: "school_id",
    definition: `school_id VARCHAR(64) NOT NULL DEFAULT '${defaultSchoolId}' COMMENT '학교 식별자' AFTER id`,
    tableName: "pdf_generation_batches",
  });
  await ensureIndex(connection, {
    definition: "KEY idx_pdf_generation_batches_school (school_id, created_at)",
    indexName: "idx_pdf_generation_batches_school",
    tableName: "pdf_generation_batches",
  });
}

module.exports = {
  ensurePdfGenerationBatchColumns,
  ensurePdfGenerationHistoryColumns,
};
