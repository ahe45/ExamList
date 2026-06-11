const { randomUUID } = require("crypto");

const { buildPdfGenerationFileName, formatTimestamp, sanitizeFileName } = require("./file-name");
const {
  normalizeArchiveFileName,
  normalizeArchiveGenerationIds,
} = require("./archives");
const { createPdfGenerationArchiveService } = require("./archive-service");
const {
  generationStatuses,
  normalizeGenerationListFilter,
  normalizeGenerationRequestFilters,
} = require("./filters");
const {
  buildGenerationRequestSummary,
  buildGenerationRequestSnapshot,
  restoreGenerationRequestFromHistory,
} = require("./snapshots");
const {
  getGenerationTargetStrategy,
  normalizeTargetNames,
  resolveGenerationRequestTargetName,
  resolveGenerationTargets,
} = require("./targets");
const { getTemplateGenerationUnitFields } = require("./generation-unit-fields");
const {
  calculateExpiryDate,
  normalizeGenerationChunkSize,
  normalizeProgressPercent,
  normalizeRetentionDays,
  normalizeRetryAttempts,
} = require("./queue-options");
const { createPdfGenerationQueueService } = require("./queue-service");
const { createPdfGenerationQueueLifecycle } = require("./queue-lifecycle");
const { createPdfGenerationRepository } = require("./repository");
const { createPdfGenerationBatchOrchestrator } = require("./batch-orchestrator");
const { createPdfGenerationBatchCancelService } = require("./batch-cancel-service");
const { createPdfGenerationBatchStatusService } = require("./batch-status-service");
const { createPdfGenerationRunner } = require("./generation-runner");
const {
  defaultBrowserPaths,
  renderHtmlToPdf,
  resolveBrowserExecutable,
} = require("./browser-renderer");
const { createPdfGenerationHistoryService } = require("./history-service");
const { renderPreviewDocument } = require("../pdf-preview/renderer");
const {
  buildPreviewSampleCandidates,
  previewSampleCandidateCount,
} = require("../pdf-preview/sample-candidates");
const {
  resolveLegacyPdfStorageRoot,
  resolveSchoolPdfStorageRoot,
} = require("../storage-paths");

function createPdfGenerationService({
  candidateService,
  createHttpError,
  fs,
  getSchoolById = null,
  path,
  pdfPreviewService,
  query,
  root,
}) {
  const legacyStorageRoot = resolveLegacyPdfStorageRoot(path, root);
  const schoolStorageCodeCache = new Map();
  const pdfGenerationRepository = createPdfGenerationRepository({ query });
  const {
    cancelBatchGenerationRows,
    getBatchGenerationRows,
    getBatchRow,
    insertBatchRow,
    insertHistoryRow,
    markBatchCancelRequested,
    updateHistoryProgress,
    updateHistoryRow,
    writeAuditLog,
  } = pdfGenerationRepository;
  let runPdfGeneration = null;
  const pdfGenerationArchiveService = createPdfGenerationArchiveService({
    createHttpError,
    ensureStorageDirectories,
    fs,
    legacyStorageRoot,
    path,
    query,
    resolvePdfStorageRootForSchool,
    writeAuditLog,
  });
  const {
    createPdfGenerationArchive,
    createPdfGenerationMergedFile,
    getPdfGenerationArchiveFile,
    getPdfGenerationMergedFile,
    listPdfGenerationArtifacts,
  } = pdfGenerationArchiveService;
  let pdfGenerationQueueLifecycle = null;
  const pdfGenerationQueueService = createPdfGenerationQueueService({
    createHttpError,
    processQueuedPdfGeneration: (...args) => pdfGenerationQueueLifecycle.processQueuedPdfGeneration(...args),
    writeAuditLog,
  });
  const {
    getBullQueueState,
    resolveQueueRetryDelayMs,
    scheduleQueuedGeneration,
  } = pdfGenerationQueueService;
  const pdfGenerationHistoryService = createPdfGenerationHistoryService({
    createHttpError,
    createPdfGeneration,
    fs,
    getBatchGenerationRows,
    getBatchRow,
    query,
    writeAuditLog,
  });
  const {
    cleanupExpiredPdfGenerations,
    deletePdfGenerations,
    getPdfGenerationBatch,
    getPdfGenerationDetail,
    getPdfGenerationFile,
    listPdfAuditLogs,
    listPdfGenerations,
    rerunPdfGeneration,
    rerunPdfGenerationBatch,
  } = pdfGenerationHistoryService;

  async function resolveSchoolStorageCode(schoolId = "") {
    const normalizedSchoolId = String(schoolId || "").trim() || "school-default";

    if (!schoolStorageCodeCache.has(normalizedSchoolId)) {
      schoolStorageCodeCache.set(
        normalizedSchoolId,
        (async () => {
          if (typeof getSchoolById === "function") {
            const school = await getSchoolById(normalizedSchoolId).catch(() => null);
            const schoolCode = String(school?.code || "").trim();

            if (schoolCode) {
              return schoolCode;
            }
          }

          return normalizedSchoolId;
        })(),
      );
    }

    return schoolStorageCodeCache.get(normalizedSchoolId);
  }

  async function resolvePdfStorageRootForSchool(schoolId = "", schoolCode = "") {
    return resolveSchoolPdfStorageRoot(
      path,
      root,
      String(schoolCode || "").trim() || await resolveSchoolStorageCode(schoolId),
    );
  }

  async function ensureStorageDirectories(storageRoot = "") {
    const normalizedStorageRoot = String(storageRoot || "").trim();

    if (!normalizedStorageRoot) {
      return false;
    }

    await fs.promises.mkdir(path.join(normalizedStorageRoot, "archives"), { recursive: true });
    await fs.promises.mkdir(path.join(normalizedStorageRoot, "files"), { recursive: true });
    await fs.promises.mkdir(path.join(normalizedStorageRoot, "merged"), { recursive: true });
    await fs.promises.mkdir(path.join(normalizedStorageRoot, "tmp"), { recursive: true });
    return true;
  }

  async function createPdfGeneration(request = {}, options = {}) {
    return runPdfGeneration(request, options);
  }

  function shouldResolveFirstPreviewTarget(request = {}) {
    return request.previewFirstTarget === true || String(request.previewMode || "").trim() === "first-target";
  }

  function shouldRenderActualPreviewCandidates(request = {}) {
    return (
      request.renderActualCandidates === true ||
      String(request.previewMode || "").trim() === "generation" ||
      shouldResolveFirstPreviewTarget(request)
    );
  }

  async function resolveFirstPreviewTargetRequest(request = {}) {
    if (!shouldResolveFirstPreviewTarget(request)) {
      return request;
    }

    const resolvedTemplate = await pdfPreviewService.resolvePreviewTemplate({
      generationUnit: request.generationUnit,
      schoolId: request.schoolId,
      template: request.template,
      templateId: request.templateId,
    });
    const schoolId = String(request.schoolId || resolvedTemplate.schoolId || "").trim();
    const generationUnit = String(request.generationUnit || resolvedTemplate.generationUnit || "").trim();
    const generationUnitFields = getTemplateGenerationUnitFields(resolvedTemplate, []);
    const baseFilters = normalizeGenerationRequestFilters(request.filters);
    const targetPayload = await resolveGenerationTargets({
      candidateService,
      createHttpError,
      filters: {
        ...baseFilters,
        schoolId,
      },
      generationUnit,
      generationUnitFields,
    });
    const targets = Array.isArray(targetPayload?.items) ? targetPayload.items : [];
    const firstTarget = targets.find((target) => Number(target?.candidateCount) > 0) || targets[0] || null;

    if (!firstTarget || Number(firstTarget?.candidateCount) <= 0) {
      throw createHttpError(400, "미리보기할 PDF 생성 대상이 없습니다.", "PDF_PREVIEW_TARGET_REQUIRED");
    }

    return {
      ...request,
      filters: {
        ...baseFilters,
        ...normalizeGenerationRequestFilters(firstTarget.filters),
      },
      generationUnit,
      schoolId,
      targetName: String(request.targetName || firstTarget.name || "").trim(),
      template: request.template || resolvedTemplate,
      templateId: String(request.templateId || resolvedTemplate.id || "").trim(),
    };
  }

  function normalizePreviewId(value = "") {
    const previewId = String(value || "").trim();

    return /^pdf-generation-preview-[a-f0-9-]+$/i.test(previewId) ? previewId : "";
  }

  async function cleanupExpiredPdfGenerationPreviews(maxAgeMs = 2 * 60 * 60 * 1000, storageRoot = legacyStorageRoot) {
    const previewDir = path.join(storageRoot, "previews");
    const entries = await fs.promises.readdir(previewDir, { withFileTypes: true }).catch(() => []);
    const cutoffMs = Date.now() - maxAgeMs;

    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && /^pdf-generation-preview-[a-f0-9-]+\.pdf$/i.test(entry.name))
        .map(async (entry) => {
          const filePath = path.join(previewDir, entry.name);
          const stat = await fs.promises.stat(filePath).catch(() => null);

          if (stat && stat.mtimeMs <= cutoffMs) {
            await fs.promises.rm(filePath, { force: true }).catch(() => {});
          }
        }),
    );
  }

  async function createPdfGenerationPreview(request = {}) {
    const previewRequest = await resolveFirstPreviewTargetRequest(request);
    const renderActualCandidates = shouldRenderActualPreviewCandidates(previewRequest);
    const previewId = `pdf-generation-preview-${randomUUID()}`;
    const generatedAt = new Date();
    const previewPayload = await pdfPreviewService.resolvePreviewPayload({
      ...previewRequest,
      candidatePage: previewRequest.candidatePage || previewRequest.page || 1,
      candidateSort: previewRequest.candidateSort,
      sampleLimit: previewRequest.sampleLimit || previewRequest.chunk?.chunkSize || 500,
    });
    const renderCandidates = renderActualCandidates
      ? previewPayload.candidates
      : buildPreviewSampleCandidates(previewPayload.sampleData, previewSampleCandidateCount);

    if (renderActualCandidates && !renderCandidates.length) {
      throw createHttpError(400, "PDF 미리보기를 생성할 수험생 데이터가 없습니다.", "PDF_PREVIEW_CANDIDATES_REQUIRED");
    }

    const previewSchoolId = String(previewRequest.schoolId || previewPayload.template.schoolId || "school-default").trim() || "school-default";
    const storageRoot = await resolvePdfStorageRootForSchool(previewSchoolId);

    await ensureStorageDirectories(storageRoot);
    await fs.promises.mkdir(path.join(storageRoot, "previews"), { recursive: true });
    await cleanupExpiredPdfGenerationPreviews(2 * 60 * 60 * 1000, storageRoot);

    const previewDocument = renderPreviewDocument({
      candidates: renderCandidates,
      emptyValueData: previewPayload.emptyValueData,
      generatedAt,
      sampleData: renderActualCandidates ? {} : previewPayload.sampleData,
      schoolSettings: previewPayload.schoolSettings,
      template: previewPayload.template,
    });
    const fileName = buildPdfGenerationFileName({
      candidates: renderCandidates,
      generatedAt,
      schoolSettings: previewPayload.schoolSettings,
      template: previewPayload.template,
    });
    const workDir = path.join(storageRoot, "tmp", previewId);
    const browserProfileDir = path.join(workDir, "browser-profile");
    const htmlFilePath = path.join(workDir, "document.html");
    const pdfFilePath = path.join(storageRoot, "previews", `${previewId}.pdf`);

    await fs.promises.mkdir(browserProfileDir, { recursive: true });
    await fs.promises.writeFile(htmlFilePath, previewDocument.html, "utf8");

    try {
      const browserExecutable = await resolveBrowserExecutable(fs, createHttpError);

      await renderHtmlToPdf({
        browserExecutable,
        browserProfileDir,
        htmlFilePath,
        pdfFilePath,
      });

      const fileStat = await fs.promises.stat(pdfFilePath);

      if (!fileStat.size) {
        throw new Error("생성된 PDF 미리보기 파일이 비어 있습니다.");
      }

      await writeAuditLog({
        action: "pdf_generation_preview_created",
        entityId: previewId,
        metadata: {
          candidateCount: renderCandidates.length,
          filePath: pdfFilePath,
          pageCount: previewDocument.pageCount,
          schoolId: previewSchoolId,
          templateId: String(previewPayload.template.id || ""),
        },
        status: "completed",
      });

      return {
        candidateCount: renderCandidates.length,
        createdAt: generatedAt.toISOString(),
        fileName,
        fileSizeBytes: fileStat.size,
        id: previewId,
        pageCount: previewDocument.pageCount,
        pdfUrl: `/api/pdf-generations/previews/${encodeURIComponent(previewId)}?name=${encodeURIComponent(fileName)}`,
        templateId: String(previewPayload.template.id || ""),
        templateName: previewPayload.template.name,
      };
    } finally {
      await fs.promises.rm(workDir, { force: true, recursive: true }).catch(() => {});
    }
  }

  async function getPdfGenerationPreviewFile(previewId, fileName = "") {
    const normalizedPreviewId = normalizePreviewId(previewId);

    if (!normalizedPreviewId) {
      throw createHttpError(404, "PDF 미리보기 파일을 찾을 수 없습니다.", "PDF_PREVIEW_NOT_FOUND");
    }

    const auditRows = normalizedPreviewId
      ? await query(
          `
            SELECT metadata_json AS metadataJson
            FROM pdf_audit_logs
            WHERE entity_id = ?
              AND entity_type = 'pdf_generation'
              AND action = 'pdf_generation_preview_created'
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [normalizedPreviewId],
        ).catch(() => [])
      : [];
    const metadata = parseJsonObject(auditRows[0]?.metadataJson);
    const filePath = String(metadata.filePath || "").trim() ||
      path.join(legacyStorageRoot, "previews", `${normalizedPreviewId}.pdf`);

    if (!fs.existsSync(filePath)) {
      throw createHttpError(404, "PDF 미리보기 파일이 존재하지 않습니다.", "PDF_PREVIEW_FILE_MISSING");
    }

    return {
      fileName: sanitizeFileName(fileName) || "pdf-preview.pdf",
      filePath,
      id: normalizedPreviewId,
    };
  }

  const { refreshPdfGenerationBatch } = createPdfGenerationBatchStatusService({
    getBatchGenerationRows,
    getBatchRow,
    getPdfGenerationBatch,
    query,
    writeAuditLog,
  });
  const { cancelPdfGenerationBatch } = createPdfGenerationBatchCancelService({
    cancelBatchGenerationRows,
    createHttpError,
    getBatchRow,
    markBatchCancelRequested,
    refreshPdfGenerationBatch,
    writeAuditLog,
  });
  runPdfGeneration = createPdfGenerationRunner({
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
  });
  pdfGenerationQueueLifecycle = createPdfGenerationQueueLifecycle({
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
  });
  const {
    enqueuePdfGeneration,
    retryPdfGeneration,
    startPdfGenerationQueue,
  } = pdfGenerationQueueLifecycle;

  const {
    createPdfGenerationBatch,
    enqueuePdfGenerationBatch,
    listPdfGenerationTargets,
  } = createPdfGenerationBatchOrchestrator({
    candidateService,
    createHttpError,
    createPdfGeneration,
    enqueuePdfGeneration,
    insertBatchRow,
    pdfPreviewService,
    refreshPdfGenerationBatch,
    writeAuditLog,
  });

  return Object.freeze({
    buildGenerationRequestSnapshot,
    cancelPdfGenerationBatch,
    cleanupExpiredPdfGenerations,
    deletePdfGenerations,
    createPdfGenerationArchive,
    createPdfGenerationMergedFile,
    createPdfGenerationBatch,
    createPdfGeneration,
    createPdfGenerationPreview,
    enqueuePdfGenerationBatch,
    enqueuePdfGeneration,
    getPdfGenerationDetail,
    getPdfGenerationBatch,
    getPdfGenerationArchiveFile,
    getPdfGenerationMergedFile,
    getPdfGenerationFile,
    getPdfGenerationPreviewFile,
    listPdfGenerationArtifacts,
    listPdfGenerationTargets,
    listPdfAuditLogs,
    listPdfGenerations,
    retryPdfGeneration,
    rerunPdfGenerationBatch,
    rerunPdfGeneration,
    startPdfGenerationQueue,
  });
}

module.exports = {
  buildGenerationRequestSummary,
  buildGenerationRequestSnapshot,
  buildPdfGenerationFileName,
  calculateExpiryDate,
  createPdfGenerationService,
  defaultBrowserPaths,
  formatTimestamp,
  generationStatuses,
  getGenerationTargetStrategy,
  normalizeArchiveFileName,
  normalizeArchiveGenerationIds,
  normalizeGenerationChunkSize,
  normalizeGenerationListFilter,
  normalizeGenerationRequestFilters,
  normalizeProgressPercent,
  normalizeRetentionDays,
  normalizeRetryAttempts,
  normalizeTargetNames,
  resolveGenerationRequestTargetName,
  resolveGenerationTargets,
  restoreGenerationRequestFromHistory,
  sanitizeFileName,
};
  function parseJsonObject(value = "") {
    try {
      const parsedValue = JSON.parse(String(value || "{}"));

      return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue) ? parsedValue : {};
    } catch (_error) {
      return {};
    }
  }
