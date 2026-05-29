const { randomUUID } = require("crypto");

const { buildPdfGenerationFileName } = require("./file-name");
const { createPdfGenerationCanceledError } = require("./cancellation");
const { calculateExpiryDate, normalizeProgressPercent, normalizeRetentionDays, normalizeRetryAttempts } = require("./queue-options");
const { buildGenerationRequestSnapshot } = require("./snapshots");
const { renderHtmlToPdf, resolveBrowserExecutable } = require("./browser-renderer");
const { normalizePdfGenerationWarnings } = require("./mappers");
const { renderPreviewDocument } = require("../pdf-preview/renderer");

function appendChunkSuffixToFileName(fileName, chunk = {}) {
  const chunkIndex = Number(chunk?.chunkIndex) || 0;
  const chunkCount = Number(chunk?.chunkCount) || 0;

  if (chunkIndex <= 0 || chunkCount <= 1) {
    return fileName;
  }

  const suffix = `_${String(chunkIndex).padStart(3, "0")}-${String(chunkCount).padStart(3, "0")}`;
  const normalizedFileName = String(fileName || "pdf.pdf");
  const extensionIndex = normalizedFileName.toLowerCase().endsWith(".pdf")
    ? normalizedFileName.length - 4
    : normalizedFileName.length;

  return `${normalizedFileName.slice(0, extensionIndex)}${suffix}.pdf`;
}

function createPdfGenerationRunner({
  createHttpError,
  ensureStorageDirectories,
  fs,
  insertHistoryRow,
  path,
  pdfPreviewService,
  refreshPdfGenerationBatch,
  resolvePdfStorageRootForSchool,
  updateHistoryRow,
  writeAuditLog,
}) {
  async function createPdfGeneration(request = {}, options = {}) {
    const generationId = String(options.generationId || `pdf-generation-${randomUUID()}`);
    const startedAt = options.startedAt || new Date();
    const maxAttempts = normalizeRetryAttempts(options.maxAttempts, normalizeRetryAttempts(process.env.PDF_QUEUE_MAX_ATTEMPTS, 2));
    const attemptCount = Number(options.attemptCount) || 1;
    const jobId = String(options.jobId || "");
    const batchId = String(options.batchId || request.batchId || "");
    const retentionDays = normalizeRetentionDays(process.env.PDF_RETENTION_DAYS, 30);
    const persistHistory = options.updateExistingHistory ? updateHistoryRow : insertHistoryRow;
    const assertNotCanceled = async () => {
      if (typeof options.shouldCancel !== "function") {
        return;
      }

      const shouldCancel = await options.shouldCancel();

      if (shouldCancel) {
        throw createPdfGenerationCanceledError();
      }
    };
    const reportProgress = async (progressPercent) => {
      await assertNotCanceled();
      if (typeof options.onProgress === "function") {
        await options.onProgress(normalizeProgressPercent(progressPercent));
      }
    };

    await assertNotCanceled();
    await reportProgress(5);
    const previewPayload = await pdfPreviewService.resolvePreviewPayload({
      ...request,
      candidatePage: request.candidatePage || request.chunk?.candidatePage || 1,
      candidateSort: request.candidateSort,
      sampleLimit: request.sampleLimit || request.chunk?.chunkSize || 5000,
    });
    const schoolId = String(request.schoolId || previewPayload.template.schoolId || "school-default").trim() || "school-default";
    const storageRoot = typeof resolvePdfStorageRootForSchool === "function"
      ? await resolvePdfStorageRootForSchool(schoolId)
      : "";

    await ensureStorageDirectories(storageRoot);
    await reportProgress(25);

    if (!previewPayload.candidates.length) {
      throw createHttpError(400, "PDF를 생성할 수험생 데이터가 없습니다.", "PDF_GENERATION_CANDIDATES_REQUIRED");
    }

    const requestSnapshot = buildGenerationRequestSnapshot({
      candidates: previewPayload.candidates,
      request,
      template: previewPayload.template,
    });
    const previewDocument = renderPreviewDocument({
      candidates: previewPayload.candidates,
      emptyValueData: previewPayload.emptyValueData,
      generatedAt: previewPayload.generatedAt,
      sampleData: {},
      schoolSettings: previewPayload.schoolSettings,
      template: previewPayload.template,
    });
    const generationWarnings = normalizePdfGenerationWarnings(previewPayload.warnings);
    const fileName = appendChunkSuffixToFileName(
      buildPdfGenerationFileName({
        candidates: previewPayload.candidates,
        generatedAt: previewPayload.generatedAt,
        schoolSettings: previewPayload.schoolSettings,
        template: previewPayload.template,
      }),
      request.chunk,
    );
    const workDir = path.join(storageRoot, "tmp", generationId);
    const browserProfileDir = path.join(workDir, "browser-profile");
    const htmlFilePath = path.join(workDir, "document.html");
    const pdfFilePath = path.join(storageRoot, "files", `${generationId}.pdf`);

    await fs.promises.mkdir(browserProfileDir, { recursive: true });
    await fs.promises.writeFile(htmlFilePath, previewDocument.html, "utf8");
    await reportProgress(45);

    try {
      const browserExecutable = await resolveBrowserExecutable(fs, createHttpError);

      await renderHtmlToPdf({
        browserExecutable,
        browserProfileDir,
        htmlFilePath,
        pdfFilePath,
        shouldCancel: options.shouldCancel,
      });
      await reportProgress(85);

      const fileStat = await fs.promises.stat(pdfFilePath);

      if (!fileStat.size) {
        throw new Error("생성된 PDF 파일이 비어 있습니다.");
      }

      const completedAt = new Date();

      await persistHistory({
        candidateCount: previewPayload.candidates.length,
        completedAt,
        errorMessage: "",
        expiresAt: calculateExpiryDate(completedAt, retentionDays),
        fileName,
        filePath: pdfFilePath,
        fileSizeBytes: fileStat.size,
        generationUnit: previewPayload.template.generationUnit,
        id: generationId,
        schoolId,
        attemptCount,
        batchId,
        jobId,
        maxAttempts,
        pageCount: previewDocument.pageCount,
        progressPercent: 100,
        purgedAt: null,
        requestJson: JSON.stringify(requestSnapshot),
        startedAt,
        status: "completed",
        targetName: requestSnapshot.targetName,
        templateId: String(previewPayload.template.id || ""),
        templateName: previewPayload.template.name,
        warnings: generationWarnings,
      });
      await writeAuditLog({
        action: options.updateExistingHistory ? "pdf_generation_job_completed" : "pdf_generation_completed",
        entityId: generationId,
        metadata: {
          generationUnit: previewPayload.template.generationUnit,
          pageCount: previewDocument.pageCount,
          schoolId,
          templateId: String(previewPayload.template.id || ""),
        },
        status: "completed",
      });
      if (batchId) {
        await refreshPdfGenerationBatch(batchId);
      }

      return {
        candidateCount: previewPayload.candidates.length,
        createdAt: new Date().toISOString(),
        downloadUrl: `/api/pdf-generations/${encodeURIComponent(generationId)}/download`,
        fileName,
        fileSizeBytes: fileStat.size,
        generationUnit: previewPayload.template.generationUnit,
        id: generationId,
        progressPercent: 100,
        pageCount: previewDocument.pageCount,
        status: "completed",
        targetName: requestSnapshot.targetName,
        templateId: String(previewPayload.template.id || ""),
        templateName: previewPayload.template.name,
        warnings: generationWarnings,
      };
    } catch (error) {
      await persistHistory({
        candidateCount: previewPayload.candidates.length,
        completedAt: new Date(),
        errorMessage: String(error.message || "PDF 생성 실패").slice(0, 255),
        expiresAt: null,
        fileName,
        filePath: "",
        fileSizeBytes: 0,
        generationUnit: previewPayload.template.generationUnit,
        id: generationId,
        schoolId,
        attemptCount,
        batchId,
        jobId,
        maxAttempts,
        pageCount: previewDocument.pageCount,
        progressPercent: 100,
        purgedAt: null,
        requestJson: JSON.stringify(requestSnapshot),
        startedAt,
        status: "failed",
        targetName: requestSnapshot.targetName,
        templateId: String(previewPayload.template.id || ""),
        templateName: previewPayload.template.name,
        warnings: generationWarnings,
      }).catch(() => {});
      await writeAuditLog({
        action: options.updateExistingHistory ? "pdf_generation_job_failed" : "pdf_generation_failed",
        entityId: generationId,
        metadata: {
          generationUnit: previewPayload.template.generationUnit,
          schoolId,
          templateId: String(previewPayload.template.id || ""),
        },
        status: "failed",
      });
      if (batchId) {
        await refreshPdfGenerationBatch(batchId);
      }

      throw error;
    } finally {
      await fs.promises.rm(workDir, { force: true, recursive: true }).catch(() => {});
    }
  }

  return createPdfGeneration;
}

module.exports = {
  createPdfGenerationRunner,
};
