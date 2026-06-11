const { summarizePdfGenerationBatchStatus } = require("./batch-status");

function createPdfGenerationBatchStatusService({
  getBatchGenerationRows,
  getBatchRow,
  getPdfGenerationBatch,
  query,
  writeAuditLog,
}) {
  async function refreshPdfGenerationBatch(batchId) {
    const normalizedBatchId = String(batchId || "").trim();

    if (!normalizedBatchId) {
      return null;
    }

    const batchRow = await getBatchRow(normalizedBatchId);

    if (!batchRow) {
      return null;
    }

    const generationRows = await getBatchGenerationRows(normalizedBatchId);
    const statusSummary = summarizePdfGenerationBatchStatus(batchRow, generationRows);

    await query(
      `
        UPDATE pdf_generation_batches
        SET
          status = ?,
          total_requested = ?,
          queued_count = ?,
          running_count = ?,
          succeeded_count = ?,
          failed_count = ?,
          progress_percent = ?,
          error_message = ?,
          completed_at = CASE WHEN ? THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        LIMIT 1
      `,
      [
        statusSummary.status,
        statusSummary.totalRequested,
        statusSummary.queuedCount,
        statusSummary.runningCount,
        statusSummary.succeededCount,
        statusSummary.failedCount,
        statusSummary.progressPercent,
        String(batchRow.errorMessage || ""),
        statusSummary.isTerminal,
        normalizedBatchId,
      ],
    );

    if (statusSummary.isTerminal) {
      await writeAuditLog({
        action: "pdf_generation_batch_completed",
        entityId: normalizedBatchId,
        entityType: "pdf_generation_batch",
        metadata: {
          failedCount: statusSummary.failedCount,
          succeededCount: statusSummary.succeededCount,
          totalRequested: statusSummary.totalRequested,
        },
        status: statusSummary.status,
      });
    }

    return getPdfGenerationBatch(normalizedBatchId);
  }

  return {
    refreshPdfGenerationBatch,
  };
}

module.exports = {
  createPdfGenerationBatchStatusService,
};
