function createPdfGenerationQueueHistoryStore({ query }) {
  async function getGenerationQueueRow(generationId) {
    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          batch_id AS batchId,
          job_id AS jobId,
          request_json AS requestJson,
          status,
          attempt_count AS attemptCount,
          max_attempts AS maxAttempts,
          error_message AS errorMessage
        FROM pdf_generation_histories
        WHERE id = ?
        LIMIT 1
      `,
      [generationId],
    );

    return rows[0] || null;
  }

  async function markQueuedGenerationForRetry(generationId, { attemptCount, errorMessage, maxAttempts }) {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = 'queued',
          progress_percent = 0,
          attempt_count = ?,
          max_attempts = ?,
          error_message = ?,
          completed_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [
        attemptCount,
        maxAttempts,
        String(errorMessage || "PDF 생성 재시도 대기").slice(0, 255),
        generationId,
      ],
    );
  }

  async function markQueuedGenerationInvalidRequest(generationId) {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = 'failed',
          progress_percent = 100,
          error_message = 'PDF 생성 요청 정보가 없습니다.',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [generationId],
    );
  }

  async function markQueuedGenerationFailed(generationId, errorMessage) {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = 'failed',
          progress_percent = 100,
          error_message = ?,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [String(errorMessage || "PDF 생성 실패").slice(0, 255), generationId],
    );
  }

  async function resetFailedGenerationForRetry(generationId) {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = 'queued',
          progress_percent = 0,
          attempt_count = 1,
          error_message = '',
          completed_at = NULL,
          started_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [generationId],
    );
  }

  async function requeueRunningGenerations() {
    await query(
      `
        UPDATE pdf_generation_histories
        SET
          status = 'queued',
          progress_percent = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE status = 'running'
      `,
    );
  }

  async function listQueuedGenerationIds(limit = 100) {
    const rows = await query(
      `
        SELECT id
        FROM pdf_generation_histories
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT ?
      `,
      [limit],
    );

    return rows.map((row) => String(row.id || "")).filter(Boolean);
  }

  return Object.freeze({
    getGenerationQueueRow,
    listQueuedGenerationIds,
    markQueuedGenerationFailed,
    markQueuedGenerationForRetry,
    markQueuedGenerationInvalidRequest,
    requeueRunningGenerations,
    resetFailedGenerationForRetry,
  });
}

module.exports = {
  createPdfGenerationQueueHistoryStore,
};
