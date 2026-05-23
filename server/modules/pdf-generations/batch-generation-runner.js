const { buildPdfGenerationTargetFilters } = require("./batch-target-resolution");

function buildPdfGenerationChunkMetadata(chunkPlan = {}) {
  return {
    candidateOffset: Number(chunkPlan.candidateOffset) || 0,
    candidatePage: Number(chunkPlan.candidatePage) || 1,
    chunkCount: Number(chunkPlan.chunkCount) || 1,
    chunkIndex: Number(chunkPlan.chunkIndex) || 1,
    chunkSize: Number(chunkPlan.chunkSize) || 500,
    requestedCandidateCount: Number(chunkPlan.requestedCandidateCount) || 0,
    targetCandidateCount: Number(chunkPlan.targetCandidateCount) || 0,
    targetIndex: Number(chunkPlan.targetIndex) || 1,
    targetName: String(chunkPlan.targetName || "").trim(),
  };
}

function buildPdfGenerationChunkRequest({
  chunkPlan,
  request = {},
  strategy,
  templateRequest = {},
}) {
  const targetName = String(chunkPlan.targetName || "").trim();
  const displayTargetName = String(chunkPlan.displayTargetName || targetName || "전체").trim() || "전체";
  const filters = strategy
    ? buildPdfGenerationTargetFilters(request, strategy, targetName, chunkPlan.targetFilters)
    : {
        ...(request.filters && typeof request.filters === "object" ? request.filters : {}),
      };

  return {
    ...templateRequest,
    candidatePage: Number(chunkPlan.candidatePage) || 1,
    chunk: buildPdfGenerationChunkMetadata(chunkPlan),
    filters,
    sampleLimit: Number(chunkPlan.sampleLimit || chunkPlan.chunkSize) || 500,
    targetName: displayTargetName,
  };
}

async function enqueueSinglePdfGenerationBatchItem({
  batchId,
  chunkPlan,
  enqueuePdfGeneration,
  request = {},
  templateRequest,
}) {
  const queuedResult = await enqueuePdfGeneration(
    buildPdfGenerationChunkRequest({
      chunkPlan: chunkPlan || {
        candidatePage: 1,
        chunkCount: 1,
        chunkIndex: 1,
        chunkSize: Number(templateRequest.sampleLimit) || 5000,
        displayTargetName: "전체",
        sampleLimit: Number(templateRequest.sampleLimit) || 5000,
        targetName: "전체",
      },
      request,
      strategy: null,
      templateRequest,
    }),
    { batchId },
  );

  return {
    ...queuedResult,
    targetName: queuedResult.targetName || "전체",
  };
}

async function enqueuePdfGenerationChunkBatchItems({
  batchId,
  chunkPlans,
  enqueuePdfGeneration,
  request,
  strategy,
  templateRequest,
}) {
  const items = [];

  for (const chunkPlan of Array.isArray(chunkPlans) ? chunkPlans : []) {
    const displayTargetName = String(chunkPlan.displayTargetName || chunkPlan.targetName || "").trim();

    if (!displayTargetName) {
      items.push({
        errorMessage: "생성 대상명이 없습니다.",
        status: "failed",
        targetName: "",
      });
      continue;
    }

    try {
      const queuedResult = await enqueuePdfGeneration(
        buildPdfGenerationChunkRequest({
          chunkPlan,
          request,
          strategy,
          templateRequest,
        }),
        { batchId },
      );

      items.push({
        ...queuedResult,
        targetName: displayTargetName,
      });
    } catch (error) {
      items.push({
        errorMessage: String(error.message || "PDF 생성 작업 등록 실패"),
        status: "failed",
        targetName: displayTargetName,
      });
    }
  }

  return items;
}

async function enqueueTargetedPdfGenerationBatchItems({
  batchId,
  chunkPlans,
  enqueuePdfGeneration,
  request,
  strategy,
  targetPayload,
  templateRequest,
}) {
  if (Array.isArray(chunkPlans)) {
    return enqueuePdfGenerationChunkBatchItems({
      batchId,
      chunkPlans,
      enqueuePdfGeneration,
      request,
      strategy,
      templateRequest,
    });
  }

  const items = [];

  for (const target of targetPayload.items) {
    const targetName = String(target.name || "").trim();

    if (!targetName) {
      items.push({
        errorMessage: "생성 대상명이 없습니다.",
        status: "failed",
        targetName: "",
      });
      continue;
    }

    try {
      const queuedResult = await enqueuePdfGeneration(
        {
          ...templateRequest,
          filters: buildPdfGenerationTargetFilters(request, strategy, targetName, target.filters),
          targetName,
        },
        { batchId },
      );

      items.push({
        ...queuedResult,
        targetName,
      });
    } catch (error) {
      items.push({
        errorMessage: String(error.message || "PDF 생성 작업 등록 실패"),
        status: "failed",
        targetName,
      });
    }
  }

  return items;
}

async function createTargetedPdfGenerationBatchItems({
  chunkPlans,
  createPdfGeneration,
  request,
  resolvedTemplate,
  schoolId,
  strategy,
  targetPayload,
  templateRequest = null,
}) {
  if (Array.isArray(chunkPlans)) {
    const items = [];

    for (const chunkPlan of chunkPlans) {
      const displayTargetName = String(chunkPlan.displayTargetName || chunkPlan.targetName || "").trim();

      try {
        const result = await createPdfGeneration(
          buildPdfGenerationChunkRequest({
            chunkPlan,
            request,
            strategy,
            templateRequest: {
              ...(templateRequest || request),
              schoolId,
              template: request.template || resolvedTemplate,
              templateId: request.templateId || resolvedTemplate.id,
            },
          }),
        );

        items.push({
          ...result,
          targetName: displayTargetName,
        });
      } catch (error) {
        items.push({
          errorMessage: String(error.message || "PDF 생성 실패"),
          status: "failed",
          targetName: displayTargetName,
        });
      }
    }

    return items;
  }

  const items = [];

  for (const target of targetPayload.items) {
    const targetName = String(target.name || "").trim();

    try {
      const result = await createPdfGeneration({
        ...request,
        schoolId,
        filters: buildPdfGenerationTargetFilters(request, strategy, targetName, target.filters),
        template: request.template || resolvedTemplate,
        templateId: request.templateId || resolvedTemplate.id,
      });

      items.push({
        ...result,
        targetName,
      });
    } catch (error) {
      items.push({
        errorMessage: String(error.message || "PDF 생성 실패"),
        status: "failed",
        targetName,
      });
    }
  }

  return items;
}

module.exports = {
  buildPdfGenerationChunkRequest,
  createTargetedPdfGenerationBatchItems,
  enqueuePdfGenerationChunkBatchItems,
  enqueueSinglePdfGenerationBatchItem,
  enqueueTargetedPdfGenerationBatchItems,
};
