const { normalizeGenerationRequestFilters, parseJsonColumn } = require("./filters");
const { getGenerationTargetStrategy, resolveGenerationRequestTargetName } = require("./targets");
const { normalizeGenerationCandidateSort } = require("./candidate-sort");
const { getTemplateGenerationUnitFields } = require("./generation-unit-fields");

const generationResultScopeCandidateFields = Object.freeze({
  admission: Object.freeze(["admission", "admissionTypeName"]),
  building: Object.freeze(["building", "buildingName"]),
  endTime: Object.freeze(["endTime", "examEndTime"]),
  examDate: Object.freeze(["examDate", "date"]),
  group: Object.freeze(["group", "groupName"]),
  major: Object.freeze(["major", "majorName"]),
  period: Object.freeze(["period", "periodName"]),
  room: Object.freeze(["room", "roomName"]),
  series: Object.freeze(["series"]),
  time: Object.freeze(["time", "examStartTime"]),
  track: Object.freeze(["track", "examName", "admissionRoundName"]),
  unit: Object.freeze(["unit", "departmentName"]),
});

const generationRequestFilterLabels = Object.freeze({
  admission: "전형",
  admissionCode: "전형코드",
  building: "고사건물",
  buildingCode: "고사건물코드",
  date: "시험날짜",
  examDate: "시험날짜",
  group: "조",
  keyword: "검색어",
  major: "전공",
  period: "교시",
  periodCode: "교시코드",
  room: "고사실",
  roomCode: "고사실코드",
  series: "계열",
  seriesCode: "계열코드",
  time: "시작시간",
  endTime: "종료시간",
  track: "모집시기",
  unit: "모집단위",
  unitCode: "모집단위코드",
});

function normalizePositiveInteger(value, fallback = 1, minimum = 1, maximum = 5000) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function normalizeGenerationChunkSnapshot(chunk = {}) {
  if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) {
    return null;
  }

  const chunkIndex = normalizePositiveInteger(chunk.chunkIndex, 1, 1, 10000);
  const chunkCount = normalizePositiveInteger(chunk.chunkCount, 1, 1, 10000);
  const chunkSize = normalizePositiveInteger(chunk.chunkSize || chunk.sampleLimit, 500, 1, 5000);

  return {
    candidateOffset: Math.max(0, Math.round(Number(chunk.candidateOffset) || 0)),
    candidatePage: normalizePositiveInteger(chunk.candidatePage || chunkIndex, chunkIndex, 1, 10000),
    chunkCount,
    chunkIndex,
    chunkSize,
    requestedCandidateCount: Math.max(0, Math.round(Number(chunk.requestedCandidateCount) || 0)),
    targetCandidateCount: Math.max(0, Math.round(Number(chunk.targetCandidateCount) || 0)),
    targetIndex: normalizePositiveInteger(chunk.targetIndex, 1, 1, 10000),
    targetName: String(chunk.targetName || "").trim(),
  };
}

function getCandidateScopeValue(candidate = {}, fieldAliases = []) {
  for (const fieldAlias of fieldAliases) {
    const value = String(candidate?.[fieldAlias] ?? "").trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function buildGenerationResultScopeSnapshot(candidates = []) {
  const candidateRows = Array.isArray(candidates) ? candidates : [];
  const scopeEntries = Object.entries(generationResultScopeCandidateFields).flatMap(([key, fieldAliases]) => {
    const values = [
      ...new Set(
        candidateRows
          .map((candidate) => getCandidateScopeValue(candidate, fieldAliases))
          .filter(Boolean),
      ),
    ];

    return values.length === 1 ? [[key, values[0]]] : [];
  });

  return Object.fromEntries(scopeEntries);
}

function buildGenerationRequestSnapshot({
  candidates = [],
  request = {},
  template = null,
}) {
  const normalizedTemplate =
    template && typeof template === "object"
      ? {
          description: String(template.description || ""),
          generationUnit: String(template.generationUnit || request.generationUnit || "roomCode"),
          id: String(template.id || request.templateId || ""),
          layout: template.layout,
          name: String(template.name || ""),
          orientation: String(template.orientation || "portrait"),
          paperPreset: String(template.paperPreset || "A4"),
          schoolId: String(template.schoolId || request.schoolId || ""),
        }
      : null;
  const generationUnit = String(request.generationUnit || normalizedTemplate?.generationUnit || "roomCode").trim() || "roomCode";
  const filters = normalizeGenerationRequestFilters(request.filters);
  const targetName = resolveGenerationRequestTargetName({
    candidates,
    filters,
    generationUnit,
    generationUnitFields: getTemplateGenerationUnitFields(normalizedTemplate, []),
    targetName: request.targetName,
  });
  const strategy = getGenerationTargetStrategy(generationUnit, getTemplateGenerationUnitFields(normalizedTemplate, []));

  if (strategy && targetName && !filters[strategy.filterKey]) {
    filters[strategy.filterKey] = targetName;
  }

  const chunk = normalizeGenerationChunkSnapshot(request.chunk);
  const resultScope = buildGenerationResultScopeSnapshot(candidates);
  const snapshot = {
    candidatePage: normalizePositiveInteger(request.candidatePage || chunk?.candidatePage, 1, 1, 10000),
    candidateSort: normalizeGenerationCandidateSort(request.candidateSort),
    filters,
    generationUnit,
    sampleLimit: normalizePositiveInteger(request.sampleLimit || chunk?.chunkSize, 5000, 1, 5000),
    targetName,
    template: normalizedTemplate,
    templateId: String(request.templateId || normalizedTemplate?.id || ""),
    schoolId: String(request.schoolId || normalizedTemplate?.schoolId || ""),
  };

  if (Object.keys(resultScope).length) {
    snapshot.resultScope = resultScope;
  }

  if (chunk) {
    snapshot.chunk = chunk;
  }

  return snapshot;
}

function restoreGenerationRequestFromHistory(row = {}, createHttpError) {
  const requestSnapshot = parseJsonColumn(row.requestJson, null);

  if (!requestSnapshot || typeof requestSnapshot !== "object" || Array.isArray(requestSnapshot)) {
    throw createHttpError(
      409,
      "재생성에 필요한 요청 정보가 없습니다. 새로 생성한 이력만 재생성할 수 있습니다.",
      "PDF_GENERATION_RERUN_NOT_SUPPORTED",
    );
  }

  const generationUnit = String(
    requestSnapshot.generationUnit ||
      requestSnapshot.template?.generationUnit ||
      row.generationUnit ||
      "roomCode",
  ).trim() || "roomCode";
  const filters = normalizeGenerationRequestFilters(requestSnapshot.filters);
  const targetName = String(requestSnapshot.targetName || row.targetName || "").trim();
  const strategy = getGenerationTargetStrategy(generationUnit, getTemplateGenerationUnitFields(requestSnapshot.template, []));

  if (strategy && targetName && !filters[strategy.filterKey]) {
    filters[strategy.filterKey] = targetName;
  }

  const restoredRequest = {
    candidatePage: normalizePositiveInteger(requestSnapshot.candidatePage || requestSnapshot.chunk?.candidatePage, 1, 1, 10000),
    candidateSort: normalizeGenerationCandidateSort(requestSnapshot.candidateSort),
    filters,
    generationUnit,
    sampleLimit: normalizePositiveInteger(requestSnapshot.sampleLimit || requestSnapshot.chunk?.chunkSize, 5000, 1, 5000),
    schoolId: String(requestSnapshot.schoolId || row.schoolId || ""),
    targetName,
  };
  const chunk = normalizeGenerationChunkSnapshot(requestSnapshot.chunk);

  if (chunk) {
    restoredRequest.chunk = chunk;
  }
  const storedTemplate =
    requestSnapshot.template &&
    typeof requestSnapshot.template === "object" &&
    !Array.isArray(requestSnapshot.template)
      ? requestSnapshot.template
      : null;
  const templateId = String(
    requestSnapshot.templateId || storedTemplate?.id || row.templateId || "",
  ).trim();

  if (storedTemplate?.layout) {
    restoredRequest.template = storedTemplate;
  }

  if (templateId) {
    restoredRequest.templateId = templateId;
  }

  if (!restoredRequest.template && !restoredRequest.templateId) {
    throw createHttpError(
      409,
      "재생성할 템플릿 정보를 찾을 수 없습니다.",
      "PDF_GENERATION_RERUN_TEMPLATE_REQUIRED",
    );
  }

  return restoredRequest;
}

function buildGenerationRequestSummary(row = {}) {
  const requestSnapshot = parseJsonColumn(row.requestJson, null);
  const filters = normalizeGenerationRequestFilters(requestSnapshot?.filters);
  const templateSnapshot =
    requestSnapshot?.template &&
    typeof requestSnapshot.template === "object" &&
    !Array.isArray(requestSnapshot.template)
      ? requestSnapshot.template
      : null;

  return {
    available: Boolean(requestSnapshot && typeof requestSnapshot === "object" && !Array.isArray(requestSnapshot)),
    filters: Object.entries(filters).map(([key, value]) => ({
      key,
      label: generationRequestFilterLabels[key] || key,
      value: String(value || ""),
    })),
    generationUnit: String(
      requestSnapshot?.generationUnit || templateSnapshot?.generationUnit || row.generationUnit || "roomCode",
    ),
    hasTemplateSnapshot: Boolean(templateSnapshot?.layout),
    targetName: String(requestSnapshot?.targetName || row.targetName || ""),
    template: templateSnapshot
      ? {
          description: String(templateSnapshot.description || ""),
          generationUnit: String(templateSnapshot.generationUnit || ""),
          id: String(templateSnapshot.id || ""),
          name: String(templateSnapshot.name || ""),
          orientation: String(templateSnapshot.orientation || ""),
          pageCount: Array.isArray(templateSnapshot.layout?.pages) ? templateSnapshot.layout.pages.length : 0,
          paperPreset: String(templateSnapshot.paperPreset || ""),
        }
      : null,
    templateId: String(requestSnapshot?.templateId || templateSnapshot?.id || row.templateId || ""),
  };
}

module.exports = {
  buildGenerationRequestSummary,
  buildGenerationRequestSnapshot,
  buildGenerationResultScopeSnapshot,
  restoreGenerationRequestFromHistory,
};
