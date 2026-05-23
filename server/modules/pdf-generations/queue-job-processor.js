const { parseJsonColumn } = require("./filters");
const {
  createPdfGenerationCanceledError,
  isPdfGenerationCanceledError,
  pdfGenerationCancelMessage,
} = require("./cancellation");
const {
  normalizeRetryAttempts,
  resolveQueueDriver,
} = require("./queue-options");

function createPdfGenerationQueueJobProcessor({
  createPdfGeneration,
  queueHistoryStore,
  refreshPdfGenerationBatch,
  resolveQueueRetryDelayMs,
  scheduleQueuedGeneration,
  updateHistoryProgress,
  writeAuditLog,
}) {
  async function processQueuedPdfGeneration(generationId) {
    const normalizedGenerationId = String(generationId || "").trim();

    if (!normalizedGenerationId) {
      return;
    }

    const queueRow = await queueHistoryStore.getGenerationQueueRow(normalizedGenerationId);

    if (!queueRow || String(queueRow.status || "") !== "queued") {
      return;
    }

    const requestSnapshot = parseJsonColumn(queueRow.requestJson, null);

    if (!requestSnapshot || typeof requestSnapshot !== "object" || Array.isArray(requestSnapshot)) {
      await queueHistoryStore.markQueuedGenerationInvalidRequest(normalizedGenerationId);
      return;
    }

    const attemptCount = Number(queueRow.attemptCount) || 1;
    const maxAttempts = normalizeRetryAttempts(queueRow.maxAttempts, normalizeRetryAttempts(process.env.PDF_QUEUE_MAX_ATTEMPTS, 2));
    const startedAt = new Date();
    const assertNotCanceled = async () => {
      const latestQueueRow = await queueHistoryStore.getGenerationQueueRow(normalizedGenerationId);

      if (
        String(latestQueueRow?.status || "").trim() === "failed" &&
        String(latestQueueRow?.errorMessage || "").trim() === pdfGenerationCancelMessage
      ) {
        throw createPdfGenerationCanceledError();
      }
    };
    const updateRunningProgress = async (progressPercent) => {
      await assertNotCanceled();
      await updateHistoryProgress(normalizedGenerationId, progressPercent, "running");
    };

    try {
      await updateRunningProgress(5);
      await writeAuditLog({
        action: "pdf_generation_job_started",
        entityId: normalizedGenerationId,
        metadata: {
          attemptCount,
          maxAttempts,
          queueDriver: resolveQueueDriver(),
        },
        status: "running",
      });
      await createPdfGeneration(requestSnapshot, {
        attemptCount,
        batchId: String(queueRow.batchId || ""),
        generationId: normalizedGenerationId,
        jobId: String(queueRow.jobId || normalizedGenerationId),
        maxAttempts,
        onProgress: updateRunningProgress,
        shouldCancel: async () => {
          await assertNotCanceled();
          return false;
        },
        startedAt,
        updateExistingHistory: true,
      });
    } catch (error) {
      if (isPdfGenerationCanceledError(error)) {
        await queueHistoryStore.markQueuedGenerationFailed(normalizedGenerationId, pdfGenerationCancelMessage);
        if (queueRow.batchId) {
          await refreshPdfGenerationBatch(String(queueRow.batchId || ""));
        }
        await writeAuditLog({
          action: "pdf_generation_job_cancelled",
          entityId: normalizedGenerationId,
          metadata: {
            attemptCount,
            maxAttempts,
          },
          status: "failed",
        });
        return;
      }

      if (attemptCount < maxAttempts) {
        const nextAttemptCount = attemptCount + 1;

        await queueHistoryStore.markQueuedGenerationForRetry(normalizedGenerationId, {
          attemptCount: nextAttemptCount,
          errorMessage: error.message,
          maxAttempts,
        });
        if (queueRow.batchId) {
          await refreshPdfGenerationBatch(String(queueRow.batchId || ""));
        }
        await writeAuditLog({
          action: "pdf_generation_job_retry_scheduled",
          entityId: normalizedGenerationId,
          metadata: {
            attemptCount: nextAttemptCount,
            maxAttempts,
          },
          status: "queued",
        });
        await scheduleQueuedGeneration(normalizedGenerationId, resolveQueueRetryDelayMs());
        return;
      }

      await queueHistoryStore.markQueuedGenerationFailed(normalizedGenerationId, error.message);
      if (queueRow.batchId) {
        await refreshPdfGenerationBatch(String(queueRow.batchId || ""));
      }
      await writeAuditLog({
        action: "pdf_generation_job_failed",
        entityId: normalizedGenerationId,
        metadata: {
          attemptCount,
          maxAttempts,
        },
        status: "failed",
      });
    }
  }

  return Object.freeze({
    processQueuedPdfGeneration,
  });
}

module.exports = {
  createPdfGenerationQueueJobProcessor,
};
