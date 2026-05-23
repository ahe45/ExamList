const { randomUUID } = require("crypto");

const {
  createTargetedPdfGenerationBatchItems,
  enqueueSinglePdfGenerationBatchItem,
  enqueueTargetedPdfGenerationBatchItems,
} = require("./batch-generation-runner");
const {
  buildPdfGenerationBatchRequestJson,
  buildQueuedPdfGenerationBatchRow,
} = require("./batch-rows");
const { createPdfGenerationBatchTargetResolver } = require("./batch-target-resolution");
const {
  createPdfGenerationChunkPlans,
  getChunkPlanSummary,
} = require("./chunks");

function createPdfGenerationBatchOrchestrator({
  candidateService,
  createHttpError,
  createPdfGeneration,
  createPdfGenerationArchive,
  enqueuePdfGeneration,
  insertBatchRow,
  pdfPreviewService,
  refreshPdfGenerationBatch,
  writeAuditLog,
}) {
  const batchTargetResolver = createPdfGenerationBatchTargetResolver({
    candidateService,
    createHttpError,
    pdfPreviewService,
  });

  async function writeBatchQueuedAuditLog({
    batchId,
    failedCount = 0,
    generationUnit,
    queuedCount,
    resolvedTemplate,
    schoolId,
    status = "queued",
    totalRequested,
  }) {
    await writeAuditLog({
      action: "pdf_generation_batch_queued",
      entityId: batchId,
      entityType: "pdf_generation_batch",
      metadata: {
        failedCount,
        generationUnit,
        queuedCount,
        schoolId,
        templateId: String(resolvedTemplate.id || ""),
        totalRequested,
      },
      status,
    });
  }

  async function insertQueuedBatchRow({
    batchId,
    generationUnit,
    queuedCount,
    requestJson,
    resolvedTemplate,
    schoolId,
    totalRequested,
  }) {
    await insertBatchRow(buildQueuedPdfGenerationBatchRow({
      batchId,
      generationUnit,
      queuedCount,
      requestJson,
      resolvedTemplate,
      schoolId,
      totalRequested,
    }));
  }

  async function enqueueSinglePdfGenerationBatch({
    batchId,
    generationUnit,
    request,
    resolvedTemplate,
    schoolId,
    targetPayload,
    templateRequest,
  }) {
    const normalizedGenerationUnit = generationUnit || "all";
    const chunkPlans = createPdfGenerationChunkPlans(targetPayload?.items || [{ candidateCount: 0, name: "전체" }], {
      chunkSize: request?.chunkSize || request?.sampleLimit,
    });
    const chunkSummary = getChunkPlanSummary(chunkPlans);

    await insertQueuedBatchRow({
      batchId,
      generationUnit: normalizedGenerationUnit,
      queuedCount: chunkSummary.chunkCount,
      requestJson: buildPdfGenerationBatchRequestJson({
        chunkCount: chunkSummary.chunkCount,
        chunkSize: chunkSummary.chunkSize,
        generationUnit: normalizedGenerationUnit,
        schoolId,
        templateId: resolvedTemplate.id,
        totalCandidateCount: chunkSummary.totalCandidateCount,
        totalRequested: chunkSummary.chunkCount,
      }),
      resolvedTemplate,
      schoolId,
      totalRequested: chunkSummary.chunkCount,
    });

    const items = [];

    for (const chunkPlan of chunkPlans) {
      try {
        items.push(await enqueueSinglePdfGenerationBatchItem({
          batchId,
          chunkPlan,
          enqueuePdfGeneration,
          request,
          templateRequest,
        }));
      } catch (error) {
        items.push({
          errorMessage: String(error.message || "PDF 생성 작업 등록 실패"),
          status: "failed",
          targetName: chunkPlan.displayTargetName || "전체",
        });
      }
    }

    const queuedCount = items.filter((item) => item.status === "queued").length;
    const failedCount = items.filter((item) => item.status === "failed").length;
    const batchPayload = await refreshPdfGenerationBatch(batchId);

    await writeBatchQueuedAuditLog({
      batchId,
      failedCount,
      generationUnit: normalizedGenerationUnit,
      queuedCount,
      resolvedTemplate,
      schoolId,
      status: failedCount && !queuedCount ? "failed" : "queued",
      totalRequested: items.length,
    });

    return {
      ...batchPayload,
      failedCount,
      generationUnit: normalizedGenerationUnit,
      items,
      queuedCount,
      status: queuedCount ? "queued" : "failed",
      succeededCount: 0,
      totalRequested: items.length,
    };
  }

  async function enqueueTargetedPdfGenerationBatch({
    batchId,
    generationUnit,
    request,
    resolvedTemplate,
    schoolId,
    strategy,
    targetPayload,
    templateRequest,
  }) {
    const chunkPlans = createPdfGenerationChunkPlans(targetPayload.items, {
      chunkSize: request?.chunkSize || request?.sampleLimit,
    });
    const chunkSummary = getChunkPlanSummary(chunkPlans);

    await insertQueuedBatchRow({
      batchId,
      generationUnit,
      queuedCount: chunkSummary.chunkCount,
      requestJson: buildPdfGenerationBatchRequestJson({
        chunkCount: chunkSummary.chunkCount,
        chunkSize: chunkSummary.chunkSize,
        generationUnit,
        schoolId,
        targetCount: chunkSummary.targetCount,
        templateId: resolvedTemplate.id,
        totalCandidateCount: chunkSummary.totalCandidateCount,
        totalRequested: chunkSummary.chunkCount,
      }),
      resolvedTemplate,
      schoolId,
      totalRequested: chunkSummary.chunkCount,
    });

    const items = await enqueueTargetedPdfGenerationBatchItems({
      batchId,
      chunkPlans,
      enqueuePdfGeneration,
      request,
      strategy,
      targetPayload,
      templateRequest,
    });
    const queuedCount = items.filter((item) => item.status === "queued").length;
    const failedCount = items.filter((item) => item.status === "failed").length;
    const batchPayload = await refreshPdfGenerationBatch(batchId);

    await writeBatchQueuedAuditLog({
      batchId,
      failedCount,
      generationUnit,
      queuedCount,
      resolvedTemplate,
      schoolId,
      status: failedCount && !queuedCount ? "failed" : "queued",
      totalRequested: items.length,
    });

    return {
      ...batchPayload,
      failedCount,
      generationUnit,
      items,
      queuedCount,
      status: queuedCount ? "queued" : "failed",
      succeededCount: 0,
      totalRequested: items.length,
    };
  }

  async function enqueuePdfGenerationBatch(request = {}) {
    const {
      generationUnit,
      generationUnitFields,
      resolvedTemplate,
      schoolId,
      strategy,
      templateRequest,
    } = await batchTargetResolver.resolvePdfGenerationBatchTemplate(request);
    const batchId = `pdf-batch-${randomUUID()}`;

    if (!strategy) {
      const targetPayload = await batchTargetResolver.resolvePdfGenerationBatchTargets({
        generationUnit: generationUnit || "all",
        generationUnitFields,
        request,
        schoolId,
      });

      return enqueueSinglePdfGenerationBatch({
        batchId,
        generationUnit,
        request,
        resolvedTemplate,
        schoolId,
        targetPayload,
        templateRequest,
      });
    }

    const targetPayload = await batchTargetResolver.resolvePdfGenerationBatchTargets({
      generationUnit,
      generationUnitFields,
      request,
      schoolId,
    });

    return enqueueTargetedPdfGenerationBatch({
      batchId,
      generationUnit,
      request,
      resolvedTemplate,
      schoolId,
      strategy,
      targetPayload,
      templateRequest,
    });
  }

  async function createPdfGenerationBatch(request = {}) {
    const {
      generationUnit,
      generationUnitFields,
      resolvedTemplate,
      schoolId,
      strategy,
      templateRequest,
    } = await batchTargetResolver.resolvePdfGenerationBatchTemplate(request);

    if (!strategy) {
      const targetPayload = await batchTargetResolver.resolvePdfGenerationBatchTargets({
        generationUnit: generationUnit || "all",
        generationUnitFields,
        request,
        schoolId,
      });
      const chunkPlans = createPdfGenerationChunkPlans(targetPayload.items, {
        chunkSize: request?.chunkSize || request?.sampleLimit,
      });
      const items = await createTargetedPdfGenerationBatchItems({
        chunkPlans,
        createPdfGeneration,
        request,
        resolvedTemplate,
        schoolId,
        strategy: null,
        targetPayload,
        templateRequest,
      });
      const succeededGenerationIds = items
        .filter((item) => item.status === "completed" && item.id)
        .map((item) => item.id);
      const archivePayload =
        succeededGenerationIds.length > 0
          ? await createPdfGenerationArchive({
              archiveName: `${resolvedTemplate.name || generationUnit || "pdf-generations"}_${generationUnit || "batch"}`,
              generationIds: succeededGenerationIds,
            })
          : null;

      return {
        archiveDownloadUrl: archivePayload?.downloadUrl || "",
        archiveFileName: archivePayload?.archiveFileName || "",
        archiveGenerationCount: archivePayload?.generationCount || 0,
        archiveId: archivePayload?.archiveId || "",
        failedCount: items.filter((item) => item.status === "failed").length,
        generationUnit: generationUnit || "all",
        items,
        succeededCount: items.filter((item) => item.status === "completed").length,
        totalRequested: items.length,
      };
    }

    const targetPayload = await batchTargetResolver.resolvePdfGenerationBatchTargets({
      generationUnit,
      generationUnitFields,
      request,
      schoolId,
    });
    const chunkPlans = createPdfGenerationChunkPlans(targetPayload.items, {
      chunkSize: request?.chunkSize || request?.sampleLimit,
    });
    const items = await createTargetedPdfGenerationBatchItems({
      chunkPlans,
      createPdfGeneration,
      request,
      resolvedTemplate,
      schoolId,
      strategy,
      targetPayload,
      templateRequest,
    });
    const succeededGenerationIds = items
      .filter((item) => item.status === "completed" && item.id)
      .map((item) => item.id);
    const archivePayload =
      succeededGenerationIds.length > 0
        ? await createPdfGenerationArchive({
            archiveName: `${resolvedTemplate.name || generationUnit || "pdf-generations"}_${generationUnit || "batch"}`,
            generationIds: succeededGenerationIds,
          })
        : null;

    return {
      archiveDownloadUrl: archivePayload?.downloadUrl || "",
      archiveFileName: archivePayload?.archiveFileName || "",
      archiveGenerationCount: archivePayload?.generationCount || 0,
      archiveId: archivePayload?.archiveId || "",
      failedCount: items.filter((item) => item.status === "failed").length,
      generationUnit,
      items,
      succeededCount: items.filter((item) => item.status === "completed").length,
      totalRequested: items.length,
    };
  }

  return Object.freeze({
    createPdfGenerationBatch,
    enqueuePdfGenerationBatch,
    listPdfGenerationTargets: batchTargetResolver.listPdfGenerationTargets,
  });
}

module.exports = {
  createPdfGenerationBatchOrchestrator,
};
