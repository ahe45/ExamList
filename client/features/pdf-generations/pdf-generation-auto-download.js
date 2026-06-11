function normalizeGenerationIdList(generationIds = []) {
  return [...new Set(generationIds.map((generationId) => String(generationId || "").trim()).filter(Boolean))];
}

export function getCompletedBatchGenerationIds(items = [], batchId = "") {
  const normalizedBatchId = String(batchId || "").trim();

  if (!normalizedBatchId) {
    return [];
  }

  return normalizeGenerationIdList(
    (Array.isArray(items) ? items : [])
      .filter((item) => String(item?.batchId || "").trim() === normalizedBatchId)
      .filter((item) => String(item?.status || "").trim() === "completed")
      .map((item) => item.id),
  );
}

export function prepareGeneratedBatchResultModalState({
  appState,
  batchId,
  canDownload = false,
  items = null,
  batch = null,
} = {}) {
  if (!canDownload || !appState?.pdfGenerations) {
    return false;
  }

  const sourceItems = Array.isArray(items) ? items : appState.pdfGenerations.items;
  const generationIds = getCompletedBatchGenerationIds(sourceItems, batchId);

  if (generationIds.length < 2) {
    return false;
  }

  appState.pdfGenerations.generatedResultModal = {
    ...(appState.pdfGenerations.generatedResultModal || {}),
    archiveDownloadUrl: "",
    archiveFileName: "",
    batchId: String(batchId || "").trim(),
    errorMessage: "",
    failedCount: Number(batch?.failedCount) || 0,
    generationIds,
    isOpen: true,
    isSubmitting: false,
    mode: "merge",
    succeededCount: Number(batch?.succeededCount) || generationIds.length,
    templateName: String(batch?.templateName || ""),
    totalRequested: Number(batch?.totalRequested) || generationIds.length,
  };

  return true;
}
