const { resolveQueueDriver } = require("./queue-options");

function createPdfGenerationQueueRecoveryController({
  createHttpError,
  getBullQueueState,
  getPdfGenerationDetail,
  queueHistoryStore,
  refreshPdfGenerationBatch,
  scheduleQueuedGeneration,
  writeAuditLog,
}) {
  async function retryPdfGeneration(generationId) {
    const normalizedGenerationId = String(generationId || "").trim();
    const queueRow = await queueHistoryStore.getGenerationQueueRow(normalizedGenerationId);

    if (!queueRow) {
      throw createHttpError(404, "재시도할 PDF 생성 작업을 찾을 수 없습니다.", "PDF_GENERATION_RETRY_NOT_FOUND");
    }

    if (String(queueRow.status || "") !== "failed") {
      throw createHttpError(409, "실패한 PDF 생성 작업만 재시도할 수 있습니다.", "PDF_GENERATION_RETRY_STATUS_INVALID");
    }

    await queueHistoryStore.resetFailedGenerationForRetry(normalizedGenerationId);

    const queueDriver = await scheduleQueuedGeneration(normalizedGenerationId);

    if (queueRow.batchId) {
      await refreshPdfGenerationBatch(String(queueRow.batchId || ""));
    }

    await writeAuditLog({
      action: "pdf_generation_job_retry_requested",
      entityId: normalizedGenerationId,
      metadata: {
        queueDriver,
      },
      status: "queued",
    });

    return getPdfGenerationDetail(normalizedGenerationId);
  }

  async function recoverQueuedPdfGenerations() {
    await queueHistoryStore.requeueRunningGenerations();

    const generationIds = await queueHistoryStore.listQueuedGenerationIds(100);

    for (const generationId of generationIds) {
      await scheduleQueuedGeneration(generationId);
    }

    return {
      queuedCount: generationIds.length,
      queueDriver: resolveQueueDriver(),
    };
  }

  async function startPdfGenerationQueue() {
    const queueDriver = resolveQueueDriver();

    if (queueDriver === "bullmq") {
      const bullState = getBullQueueState();

      if (!bullState?.queue) {
        throw createHttpError(
          500,
          "BullMQ 큐를 시작할 수 없습니다. REDIS_URL과 BullMQ 의존성을 확인해주세요.",
          "PDF_QUEUE_BULLMQ_UNAVAILABLE",
        );
      }
    }

    return recoverQueuedPdfGenerations();
  }

  return Object.freeze({
    retryPdfGeneration,
    startPdfGenerationQueue,
  });
}

module.exports = {
  createPdfGenerationQueueRecoveryController,
};
