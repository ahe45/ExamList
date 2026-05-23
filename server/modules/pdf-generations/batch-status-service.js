const { summarizePdfGenerationBatchStatus } = require("./batch-status");

function createPdfGenerationBatchStatusService({
  createPdfGenerationArchive,
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
    let archivePayload = null;
    let archiveErrorMessage = "";

    if (statusSummary.isTerminal && statusSummary.succeededCount > 0 && !String(batchRow.archiveId || "").trim()) {
      try {
        archivePayload = await createPdfGenerationArchive({
          archiveName: `${batchRow.templateName || normalizedBatchId}_${batchRow.generationUnit || "batch"}`,
          generationIds: generationRows
            .filter((row) => row.status === "completed")
            .map((row) => String(row.id || ""))
            .filter(Boolean),
        });
      } catch (error) {
        archiveErrorMessage = String(error.message || "ZIP 자동 생성 실패").slice(0, 255);
      }
    }

    const nextErrorMessage = archiveErrorMessage || String(batchRow.errorMessage || "");

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
          archive_id = CASE WHEN ? <> '' THEN ? ELSE archive_id END,
          archive_file_name = CASE WHEN ? <> '' THEN ? ELSE archive_file_name END,
          archive_file_path = CASE WHEN ? <> '' THEN ? ELSE archive_file_path END,
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
        archivePayload?.archiveId || "",
        archivePayload?.archiveId || "",
        archivePayload?.archiveFileName || "",
        archivePayload?.archiveFileName || "",
        archivePayload?.archivePath || "",
        archivePayload?.archivePath || "",
        nextErrorMessage,
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
