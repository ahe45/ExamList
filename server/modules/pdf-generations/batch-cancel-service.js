const { pdfGenerationCancelMessage } = require("./cancellation");

function createPdfGenerationBatchCancelService({
  cancelBatchGenerationRows,
  createHttpError,
  getBatchRow,
  markBatchCancelRequested,
  refreshPdfGenerationBatch,
  writeAuditLog,
}) {
  async function cancelPdfGenerationBatch(batchId) {
    const normalizedBatchId = String(batchId || "").trim();

    if (!normalizedBatchId) {
      throw createHttpError(400, "중단할 PDF 배치 작업이 없습니다.", "PDF_GENERATION_BATCH_ID_REQUIRED");
    }

    const batchRow = await getBatchRow(normalizedBatchId);

    if (!batchRow) {
      throw createHttpError(404, "PDF 배치 생성 작업을 찾을 수 없습니다.", "PDF_GENERATION_BATCH_NOT_FOUND");
    }

    const status = String(batchRow.status || "").trim();

    if (status === "completed" || status === "failed") {
      return refreshPdfGenerationBatch(normalizedBatchId);
    }

    await markBatchCancelRequested(normalizedBatchId, pdfGenerationCancelMessage);
    await cancelBatchGenerationRows(normalizedBatchId, pdfGenerationCancelMessage);
    const refreshedBatch = await refreshPdfGenerationBatch(normalizedBatchId);

    await writeAuditLog({
      action: "pdf_generation_batch_cancelled",
      entityId: normalizedBatchId,
      entityType: "pdf_generation_batch",
      metadata: {
        failedCount: Number(refreshedBatch?.failedCount) || 0,
        succeededCount: Number(refreshedBatch?.succeededCount) || 0,
        totalRequested: Number(refreshedBatch?.totalRequested) || 0,
      },
      status: "failed",
    });

    return refreshedBatch;
  }

  return Object.freeze({
    cancelPdfGenerationBatch,
  });
}

module.exports = {
  createPdfGenerationBatchCancelService,
};
