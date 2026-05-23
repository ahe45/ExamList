const { normalizeProgressPercent } = require("./queue-options");
const { normalizeGenerationRequestFilters } = require("./filters");
const { buildGenerationRequestSummary } = require("./snapshots");
const { parseJsonColumn, terminalGenerationStatuses } = require("./filters");

const generationResultScopeKeys = Object.freeze([
  "campus",
  "track",
  "admission",
  "series",
  "unit",
  "major",
  "examDate",
  "time",
  "endTime",
  "period",
  "building",
  "room",
  "group",
]);
const generationUnitScopeKeyMap = Object.freeze({
  admission: "admission",
  admissionCode: "admission",
  buildingCode: "building",
  exam: "examDate",
  examDate: "examDate",
  group: "group",
  periodCode: "period",
  room: "room",
  roomCode: "room",
  seriesCode: "series",
  unit: "unit",
  unitCode: "unit",
});
const generationScopeFilterFallbackMap = Object.freeze({
  admission: "admissionCode",
  building: "buildingCode",
  examDate: "date",
  period: "periodCode",
  room: "roomCode",
  series: "seriesCode",
  unit: "unitCode",
});

function buildGenerationResultScope(row = {}) {
  const requestSnapshot = parseJsonColumn(row.requestJson, null);
  const filters = normalizeGenerationRequestFilters(requestSnapshot?.filters);
  const resultScope = normalizeGenerationRequestFilters(requestSnapshot?.resultScope);
  const generationUnit = String(
    requestSnapshot?.generationUnit || row.generationUnit || "",
  ).trim();
  const targetScopeKey = generationUnitScopeKeyMap[generationUnit] || "";
  const targetBoundaryIndex = targetScopeKey ? generationResultScopeKeys.indexOf(targetScopeKey) : -1;
  const targetName = String(requestSnapshot?.targetName || row.targetName || "").trim();
  const scope = {};

  for (const key of generationResultScopeKeys) {
    const keyIndex = generationResultScopeKeys.indexOf(key);
    const fallbackFilterKey = generationScopeFilterFallbackMap[key] || "";
    let value = String(resultScope[key] || filters[key] || (fallbackFilterKey ? filters[fallbackFilterKey] : "") || "").trim();

    if (key === "examDate") {
      value = String(filters.examDate || filters.date || value).trim();
    }

    if (key === targetScopeKey && targetName && !value) {
      value = targetName;
    }

    if (targetBoundaryIndex >= 0 && keyIndex > targetBoundaryIndex) {
      value = "";
    }

    scope[key] = value || "-";
  }

  return scope;
}

function mapGenerationRow(row) {
  const status = String(row.status || "completed");
  const purgedAt = row.purgedAt instanceof Date ? row.purgedAt.toISOString() : String(row.purgedAt || "");

  return {
    batchId: String(row.batchId || ""),
    canRetry: status === "failed" && Boolean(String(row.requestJson || "").trim()),
    canRerun: terminalGenerationStatuses.includes(status) && Boolean(String(row.requestJson || "").trim()),
    id: String(row.id || ""),
    jobId: String(row.jobId || ""),
    schoolId: String(row.schoolId || ""),
    templateId: String(row.templateId || ""),
    templateName: String(row.templateName || ""),
    fileName: String(row.fileName || ""),
    generationUnit: String(row.generationUnit || "roomCode"),
    targetName: String(row.targetName || ""),
    candidateCount: Number(row.candidateCount) || 0,
    pageCount: Number(row.pageCount) || 0,
    fileSizeBytes: Number(row.fileSizeBytes) || 0,
    status,
    progressPercent: normalizeProgressPercent(row.progressPercent, status === "completed" ? 100 : 0),
    attemptCount: Number(row.attemptCount) || 1,
    maxAttempts: Number(row.maxAttempts) || 1,
    errorMessage: String(row.errorMessage || ""),
    resultScope: buildGenerationResultScope(row),
    warnings: parseJsonColumn(row.warningJson, []),
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : String(row.completedAt || ""),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : String(row.expiresAt || ""),
    purgedAt,
    startedAt: row.startedAt instanceof Date ? row.startedAt.toISOString() : String(row.startedAt || ""),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
    downloadUrl:
      status === "completed" && !purgedAt
        ? `/api/pdf-generations/${encodeURIComponent(String(row.id || ""))}/download`
        : "",
    printUrl:
      status === "completed" && !purgedAt
        ? `/api/pdf-generations/${encodeURIComponent(String(row.id || ""))}/download?disposition=inline`
        : "",
  };
}

function mapGenerationDetailRow(row) {
  return {
    ...mapGenerationRow(row),
    requestSummary: buildGenerationRequestSummary(row),
  };
}

function mapBatchRow(row = {}) {
  const batchId = String(row.id || "");
  const archiveId = String(row.archiveId || "");

  return {
    archiveDownloadUrl: archiveId
      ? `/api/pdf-generations/archives/${encodeURIComponent(archiveId)}/download?name=${encodeURIComponent(String(row.archiveFileName || "pdf-generations.zip"))}`
      : "",
    archiveFileName: String(row.archiveFileName || ""),
    archiveGenerationCount: Number(row.succeededCount) || 0,
    archiveId,
    batchId,
    completedAt: row.completedAt instanceof Date ? row.completedAt.toISOString() : String(row.completedAt || ""),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
    errorMessage: String(row.errorMessage || ""),
    failedCount: Number(row.failedCount) || 0,
    generationUnit: String(row.generationUnit || "roomCode"),
    progressPercent: normalizeProgressPercent(row.progressPercent),
    queuedCount: Number(row.queuedCount) || 0,
    runningCount: Number(row.runningCount) || 0,
    status: String(row.status || "queued"),
    schoolId: String(row.schoolId || ""),
    succeededCount: Number(row.succeededCount) || 0,
    templateId: String(row.templateId || ""),
    templateName: String(row.templateName || ""),
    totalRequested: Number(row.totalRequested) || 0,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
  };
}

function normalizePdfGenerationWarnings(warnings) {
  return (Array.isArray(warnings) ? warnings : []).map((warning) =>
    String(warning || "").replace(/^미리보기는\s/, "PDF 생성은 "),
  );
}

module.exports = {
  mapBatchRow,
  mapGenerationDetailRow,
  mapGenerationRow,
  normalizePdfGenerationWarnings,
};
