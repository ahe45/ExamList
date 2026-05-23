function buildPdfGenerationBatchRequestJson({
  chunkCount,
  chunkSize,
  generationUnit,
  schoolId,
  targetCount,
  templateId,
  totalCandidateCount,
  totalRequested,
}) {
  const payload = {
    generationUnit,
    schoolId,
    templateId: String(templateId || ""),
  };

  if (Number.isFinite(Number(targetCount))) {
    payload.targetCount = Number(targetCount);
  }

  if (Number.isFinite(Number(chunkCount))) {
    payload.chunkCount = Number(chunkCount);
  }

  if (Number.isFinite(Number(chunkSize))) {
    payload.chunkSize = Number(chunkSize);
  }

  if (Number.isFinite(Number(totalCandidateCount))) {
    payload.totalCandidateCount = Number(totalCandidateCount);
  }

  if (Number.isFinite(Number(totalRequested))) {
    payload.totalRequested = Number(totalRequested);
  }

  return JSON.stringify(payload);
}

function buildQueuedPdfGenerationBatchRow({
  batchId,
  generationUnit,
  queuedCount,
  requestJson,
  resolvedTemplate,
  schoolId,
  totalRequested,
}) {
  return {
    archiveFileName: "",
    archiveFilePath: "",
    archiveId: "",
    completedAt: null,
    errorMessage: "",
    failedCount: 0,
    generationUnit,
    id: batchId,
    schoolId,
    progressPercent: 0,
    queuedCount,
    requestJson,
    runningCount: 0,
    status: "queued",
    succeededCount: 0,
    templateId: String(resolvedTemplate.id || ""),
    templateName: resolvedTemplate.name,
    totalRequested,
  };
}

module.exports = {
  buildPdfGenerationBatchRequestJson,
  buildQueuedPdfGenerationBatchRow,
};
