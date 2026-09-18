const { summarizePdfGenerationBatchStatus } = require("./batch-status");

function createPdfGenerationBatchStatusService({
  getBatchGenerationRows,
  getBatchRow,
  getPdfGenerationBatch,
  query,
  writeAuditLog,
}) {
  const pendingRefreshes = new Map();
  async function refreshPdfGenerationBatch(batchId) {
    const key = String(batchId || "").trim();
    const previous = pendingRefreshes.get(key) || Promise.resolve();
    const pending = previous.catch(() => {}).then(() => refreshBatch(key));
    pendingRefreshes.set(key, pending);
    try { return await pending; }
    finally { if (pendingRefreshes.get(key) === pending) pendingRefreshes.delete(key); }
  }

  async function refreshBatch(batchId) {
    const normalizedBatchId = String(batchId || "").trim();

    if (!normalizedBatchId) {
      return null;
    }

    const batchRow = await getBatchRow(normalizedBatchId);

    if (!batchRow) {
      return null;
    }

    const generationRows = await getBatchGenerationRows(normalizedBatchId, { statusOnly: true });
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
        statusSummary.isTerminal,
        normalizedBatchId,
      ],
    );

    if (statusSummary.isTerminal && !batchRow.completedAt) {
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

    return getPdfGenerationBatch(normalizedBatchId, { includeItems: false });
  }

  return {
    refreshPdfGenerationBatch,
  };
}

module.exports = {
  createPdfGenerationBatchStatusService,
};
