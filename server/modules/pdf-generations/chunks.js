const { normalizeGenerationChunkSize } = require("./queue-options");

function normalizeCandidateCount(value) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.max(parsedValue, 0);
}

function normalizeTargetFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [String(key || "").trim(), String(value ?? "").trim()])
      .filter(([key, value]) => key && value),
  );
}

function createChunkDisplayName(targetName, chunkIndex, chunkCount) {
  const normalizedTargetName = String(targetName || "전체").trim() || "전체";

  if (chunkCount <= 1) {
    return normalizedTargetName;
  }

  const suffix = ` (${chunkIndex}/${chunkCount})`;

  return `${normalizedTargetName.slice(0, Math.max(1, 120 - suffix.length))}${suffix}`;
}

function createPdfGenerationChunksForTarget(target = {}, options = {}) {
  const targetName = String(target.name || target.targetName || "전체").trim() || "전체";
  const targetCandidateCount = normalizeCandidateCount(target.candidateCount);
  const targetFilters = normalizeTargetFilters(target.filters);
  const chunkSize = normalizeGenerationChunkSize(options.chunkSize, 500);
  const chunkCount = Math.max(1, Math.ceil(targetCandidateCount / chunkSize));
  const targetIndex = Math.max(1, Math.round(Number(options.targetIndex) || 1));
  const chunks = [];

  for (let index = 0; index < chunkCount; index += 1) {
    const chunkIndex = index + 1;
    const candidateOffset = index * chunkSize;
    const remainingCandidateCount = Math.max(targetCandidateCount - candidateOffset, 0);
    const requestedCandidateCount = targetCandidateCount
      ? Math.min(chunkSize, remainingCandidateCount)
      : 0;

    chunks.push({
      candidateOffset,
      candidatePage: chunkIndex,
      chunkCount,
      chunkIndex,
      chunkSize,
      displayTargetName: createChunkDisplayName(targetName, chunkIndex, chunkCount),
      requestedCandidateCount,
      sampleLimit: chunkSize,
      targetCandidateCount,
      targetFilters,
      targetIndex,
      targetName,
    });
  }

  return chunks;
}

function createPdfGenerationChunkPlans(targets = [], options = {}) {
  const normalizedTargets = Array.isArray(targets) && targets.length
    ? targets
    : [{ candidateCount: 0, name: "전체" }];
  const chunkSize = normalizeGenerationChunkSize(options.chunkSize || process.env.PDF_GENERATION_CHUNK_SIZE, 500);

  return normalizedTargets.flatMap((target, index) =>
    createPdfGenerationChunksForTarget(target, {
      chunkSize,
      targetIndex: index + 1,
    }),
  );
}

function getChunkPlanSummary(chunkPlans = []) {
  const plans = Array.isArray(chunkPlans) ? chunkPlans : [];
  const targetNames = new Set(plans.map((plan) => String(plan.targetName || "").trim()).filter(Boolean));
  const totalCandidateCount = plans.reduce((total, plan) => total + normalizeCandidateCount(plan.requestedCandidateCount), 0);
  const chunkSize = plans.length ? normalizeGenerationChunkSize(plans[0].chunkSize, 500) : normalizeGenerationChunkSize(process.env.PDF_GENERATION_CHUNK_SIZE, 500);

  return {
    chunkCount: plans.length,
    chunkSize,
    targetCount: targetNames.size || (plans.length ? 1 : 0),
    totalCandidateCount,
  };
}

module.exports = {
  createChunkDisplayName,
  createPdfGenerationChunkPlans,
  createPdfGenerationChunksForTarget,
  getChunkPlanSummary,
};
