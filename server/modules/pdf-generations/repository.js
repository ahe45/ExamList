const { randomUUID } = require("crypto");

const { normalizeProgressPercent } = require("./queue-options");

function createPdfGenerationRepository({ query }) {
  async function insertHistoryRow(historyRow) {
    await query(
      `
        INSERT INTO pdf_generation_histories (
          id,
          school_id,
          template_id,
          template_name,
          file_name,
          file_path,
          generation_unit,
          target_name,
        candidate_count,
        page_count,
        file_size_bytes,
        status,
        progress_percent,
        job_id,
        batch_id,
        attempt_count,
        max_attempts,
        warning_json,
        error_message,
        request_json,
        expires_at,
        purged_at,
        started_at,
        completed_at
      )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        historyRow.id,
        historyRow.schoolId || "",
        historyRow.templateId,
        historyRow.templateName,
        historyRow.fileName,
        historyRow.filePath,
        historyRow.generationUnit,
        historyRow.targetName,
        historyRow.candidateCount,
        historyRow.pageCount,
        historyRow.fileSizeBytes,
        historyRow.status,
        normalizeProgressPercent(historyRow.progressPercent, historyRow.status === "completed" ? 100 : 0),
        historyRow.jobId || "",
        historyRow.batchId || "",
        Number(historyRow.attemptCount) || 1,
        Number(historyRow.maxAttempts) || 1,
        JSON.stringify(historyRow.warnings || []),
        historyRow.errorMessage,
        historyRow.requestJson,
        historyRow.expiresAt || null,
        historyRow.purgedAt || null,
        historyRow.startedAt || null,
        historyRow.completedAt || null,
      ],
    );
  }

  async function updateHistoryRow(historyRow) {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          template_id = ?,
          school_id = ?,
          template_name = ?,
          file_name = ?,
          file_path = ?,
          generation_unit = ?,
          target_name = ?,
          candidate_count = ?,
          page_count = ?,
          file_size_bytes = ?,
          status = ?,
          progress_percent = ?,
          job_id = ?,
          batch_id = ?,
          attempt_count = ?,
          max_attempts = ?,
          warning_json = ?,
          error_message = ?,
          request_json = ?,
          expires_at = ?,
          purged_at = ?,
          started_at = COALESCE(started_at, ?),
          completed_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [
        historyRow.templateId,
        historyRow.schoolId || "",
        historyRow.templateName,
        historyRow.fileName,
        historyRow.filePath,
        historyRow.generationUnit,
        historyRow.targetName,
        historyRow.candidateCount,
        historyRow.pageCount,
        historyRow.fileSizeBytes,
        historyRow.status,
        normalizeProgressPercent(historyRow.progressPercent, historyRow.status === "completed" ? 100 : 0),
        historyRow.jobId || "",
        historyRow.batchId || "",
        Number(historyRow.attemptCount) || 1,
        Number(historyRow.maxAttempts) || 1,
        JSON.stringify(historyRow.warnings || []),
        historyRow.errorMessage,
        historyRow.requestJson,
        historyRow.expiresAt || null,
        historyRow.purgedAt || null,
        historyRow.startedAt || null,
        historyRow.completedAt || null,
        historyRow.id,
      ],
    );
  }

  async function updateHistoryProgress(generationId, progressPercent, status = "running") {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = ?,
          progress_percent = ?,
          started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [status, normalizeProgressPercent(progressPercent), generationId],
    );
  }

  async function cancelBatchGenerationRows(batchId, errorMessage = "") {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = 'failed',
          progress_percent = 100,
          error_message = ?,
          completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = ?
          AND status IN ('queued', 'running')
      `,
      [String(errorMessage || "PDF 생성 중단").slice(0, 255), batchId],
    );
  }

  async function markBatchCancelRequested(batchId, errorMessage = "") {
    await query(
      `
        UPDATE pdf_generation_batches
        SET
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [String(errorMessage || "PDF 생성 중단").slice(0, 255), batchId],
    );
  }

  async function writeAuditLog({ action, entityId = "", entityType = "pdf_generation", metadata = {}, status = "" }) {
    await query(
      `
        INSERT INTO pdf_audit_logs (
          id,
          action,
          entity_type,
          entity_id,
          status,
          metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        `pdf-audit-${randomUUID()}`,
        String(action || "").slice(0, 80),
        String(entityType || "pdf_generation").slice(0, 80),
        String(entityId || "").slice(0, 64),
        String(status || "").slice(0, 32),
        JSON.stringify(metadata && typeof metadata === "object" ? metadata : {}),
      ],
    ).catch(() => {});
  }

  async function insertBatchRow(batchRow) {
    await query(
      `
        INSERT INTO pdf_generation_batches (
          id,
          school_id,
          template_id,
          template_name,
          generation_unit,
          status,
          total_requested,
          queued_count,
          running_count,
          succeeded_count,
          failed_count,
          progress_percent,
          archive_id,
          archive_file_name,
          archive_file_path,
          request_json,
          error_message,
          completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        batchRow.id,
        batchRow.schoolId || "",
        batchRow.templateId,
        batchRow.templateName,
        batchRow.generationUnit,
        batchRow.status,
        Number(batchRow.totalRequested) || 0,
        Number(batchRow.queuedCount) || 0,
        Number(batchRow.runningCount) || 0,
        Number(batchRow.succeededCount) || 0,
        Number(batchRow.failedCount) || 0,
        normalizeProgressPercent(batchRow.progressPercent),
        batchRow.archiveId || "",
        batchRow.archiveFileName || "",
        batchRow.archiveFilePath || "",
        batchRow.requestJson || null,
        batchRow.errorMessage || "",
        batchRow.completedAt || null,
      ],
    );
  }

  async function getBatchRow(batchId) {
    const rows = await query(
      `
        SELECT
          id,
          id AS batchId,
          school_id AS schoolId,
          template_id AS templateId,
          template_name AS templateName,
          generation_unit AS generationUnit,
          status,
          total_requested AS totalRequested,
          queued_count AS queuedCount,
          running_count AS runningCount,
          succeeded_count AS succeededCount,
          failed_count AS failedCount,
          progress_percent AS progressPercent,
          archive_id AS archiveId,
          archive_file_name AS archiveFileName,
          archive_file_path AS archiveFilePath,
          request_json AS requestJson,
          error_message AS errorMessage,
          completed_at AS completedAt,
          GREATEST(
            0,
            TIMESTAMPDIFF(SECOND, created_at, COALESCE(completed_at, CURRENT_TIMESTAMP))
          ) AS elapsedSeconds,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM pdf_generation_batches
        WHERE id = ?
        LIMIT 1
      `,
      [batchId],
    );

    return rows[0] || null;
  }

  async function getBatchGenerationRows(batchId) {
    return query(
      `
        SELECT
          id,
          school_id AS schoolId,
          batch_id AS batchId,
          template_id AS templateId,
          template_name AS templateName,
          file_name AS fileName,
          generation_unit AS generationUnit,
          target_name AS targetName,
          candidate_count AS candidateCount,
          page_count AS pageCount,
          file_size_bytes AS fileSizeBytes,
          status,
          progress_percent AS progressPercent,
          job_id AS jobId,
          attempt_count AS attemptCount,
          max_attempts AS maxAttempts,
          warning_json AS warningJson,
          error_message AS errorMessage,
          request_json AS requestJson,
          expires_at AS expiresAt,
          purged_at AS purgedAt,
          started_at AS startedAt,
          completed_at AS completedAt,
          updated_at AS updatedAt,
          created_at AS createdAt
        FROM pdf_generation_histories
        WHERE batch_id = ?
        ORDER BY created_at ASC
      `,
      [batchId],
    );
  }


  return {
    cancelBatchGenerationRows,
    getBatchGenerationRows,
    getBatchRow,
    insertBatchRow,
    insertHistoryRow,
    markBatchCancelRequested,
    updateHistoryProgress,
    updateHistoryRow,
    writeAuditLog,
  };
}

module.exports = {
  createPdfGenerationRepository,
};
