const { createPdfGenerationQueueEnqueuer } = require("./queue-enqueuer");
const { createPdfGenerationQueueHistoryStore } = require("./queue-history-store");
const { createPdfGenerationQueueJobProcessor } = require("./queue-job-processor");
const { createPdfGenerationQueueRecoveryController } = require("./queue-recovery");

function createPdfGenerationQueueLifecycle({
  createHttpError,
  createPdfGeneration,
  getBullQueueState,
  getPdfGenerationDetail,
  insertHistoryRow,
  pdfPreviewService,
  query,
  refreshPdfGenerationBatch,
  resolveQueueRetryDelayMs,
  scheduleQueuedGeneration,
  updateHistoryProgress,
  writeAuditLog,
}) {
  const queueHistoryStore = createPdfGenerationQueueHistoryStore({ query });
  const { enqueuePdfGeneration } = createPdfGenerationQueueEnqueuer({
    getPdfGenerationDetail,
    insertHistoryRow,
    pdfPreviewService,
    scheduleQueuedGeneration,
    writeAuditLog,
  });
  const { processQueuedPdfGeneration } = createPdfGenerationQueueJobProcessor({
    createPdfGeneration,
    queueHistoryStore,
    refreshPdfGenerationBatch,
    resolveQueueRetryDelayMs,
    scheduleQueuedGeneration,
    updateHistoryProgress,
    writeAuditLog,
  });
  const {
    retryPdfGeneration,
    startPdfGenerationQueue,
  } = createPdfGenerationQueueRecoveryController({
    createHttpError,
    getBullQueueState,
    getPdfGenerationDetail,
    queueHistoryStore,
    refreshPdfGenerationBatch,
    scheduleQueuedGeneration,
    writeAuditLog,
  });

  return Object.freeze({
    enqueuePdfGeneration,
    processQueuedPdfGeneration,
    retryPdfGeneration,
    startPdfGenerationQueue,
  });
}

module.exports = {
  createPdfGenerationQueueLifecycle,
};
