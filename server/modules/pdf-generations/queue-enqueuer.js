const { randomUUID } = require("crypto");

const { normalizeRetryAttempts } = require("./queue-options");
const { buildGenerationRequestSnapshot } = require("./snapshots");

function createPdfGenerationQueueEnqueuer({
  ensureStorageDirectories,
  getPdfGenerationDetail,
  insertHistoryRow,
  pdfPreviewService,
  scheduleQueuedGeneration,
  writeAuditLog,
}) {
  async function enqueuePdfGeneration(request = {}, options = {}) {
    await ensureStorageDirectories();

    const generationId = `pdf-generation-${randomUUID()}`;
    const jobId = `pdf-job-${randomUUID()}`;
    const batchId = String(options.batchId || request.batchId || "");
    const maxAttempts = normalizeRetryAttempts(request.maxAttempts, normalizeRetryAttempts(process.env.PDF_QUEUE_MAX_ATTEMPTS, 2));
    const resolvedTemplate = await pdfPreviewService.resolvePreviewTemplate(request);
    const schoolId = String(request.schoolId || resolvedTemplate.schoolId || "school-default").trim() || "school-default";
    const requestSnapshot = buildGenerationRequestSnapshot({
      candidates: [],
      request: {
        ...request,
        schoolId,
      },
      template: resolvedTemplate,
    });

    await insertHistoryRow({
      attemptCount: 1,
      candidateCount: 0,
      completedAt: null,
      errorMessage: "",
      expiresAt: null,
      fileName: "",
      filePath: "",
      fileSizeBytes: 0,
      generationUnit: resolvedTemplate.generationUnit,
      id: generationId,
      schoolId,
      batchId,
      jobId,
      maxAttempts,
      pageCount: 0,
      progressPercent: 0,
      purgedAt: null,
      requestJson: JSON.stringify(requestSnapshot),
      startedAt: null,
      status: "queued",
      targetName: requestSnapshot.targetName,
      templateId: String(resolvedTemplate.id || ""),
      templateName: resolvedTemplate.name,
      warnings: [],
    });

    const queueDriver = await scheduleQueuedGeneration(generationId);

    await writeAuditLog({
      action: "pdf_generation_job_queued",
      entityId: generationId,
      metadata: {
        generationUnit: resolvedTemplate.generationUnit,
        maxAttempts,
        queueDriver,
        schoolId,
        templateId: String(resolvedTemplate.id || ""),
      },
      status: "queued",
    });

    return getPdfGenerationDetail(generationId);
  }

  return Object.freeze({
    enqueuePdfGeneration,
  });
}

module.exports = {
  createPdfGenerationQueueEnqueuer,
};
