const {
  dataDeletionResultFilterKeys,
  generationScopeFilterFallbackMap,
  hasDataDeletionFilters,
  normalizeDataDeletionFilters,
} = require("./filters");
const {
  createUniqueValueList,
  parseJsonColumn,
} = require("./utils");

function normalizeGenerationRequestFilters(filters = {}) {
  return normalizeDataDeletionFilters(filters);
}

function getGenerationScopeValue({ filters = {}, resultScope = {} } = {}, key = "") {
  const normalizedKey = String(key || "").trim();
  const fallbackKey = generationScopeFilterFallbackMap[normalizedKey] || "";

  return String(
    resultScope?.[normalizedKey] ||
      filters?.[normalizedKey] ||
      (fallbackKey ? filters?.[fallbackKey] : "") ||
      "",
  ).trim();
}

function generationRowMatchesDataDeletionFilters(row = {}, filters = {}) {
  const normalizedFilters = normalizeDataDeletionFilters(filters);
  const filterEntries = Object.entries(normalizedFilters);

  if (!filterEntries.length) {
    return true;
  }

  const requestSnapshot = parseJsonColumn(row.requestJson, null);
  const requestFilters = normalizeGenerationRequestFilters(requestSnapshot?.filters);
  const resultScope = normalizeGenerationRequestFilters(requestSnapshot?.resultScope);
  const scope = {
    filters: requestFilters,
    resultScope,
  };

  return filterEntries.every(([key, value]) => {
    if (!dataDeletionResultFilterKeys.includes(key)) {
      return getGenerationScopeValue(scope, key) === value || requestFilters[key] === value;
    }

    return getGenerationScopeValue(scope, key) === value;
  });
}

function selectPdfGenerationRowsForDeletion(generationRows = [], filters = {}) {
  return (Array.isArray(generationRows) ? generationRows : []).filter((row) =>
    generationRowMatchesDataDeletionFilters(row, filters),
  );
}

function selectPdfGenerationBatchRowsForDeletion(batchRows = [], generationRows = [], selectedGenerationRows = [], filters = {}) {
  if (!hasDataDeletionFilters(filters)) {
    return Array.isArray(batchRows) ? batchRows : [];
  }

  const selectedGenerationIdSet = new Set(selectedGenerationRows.map((row) => String(row.id || "")).filter(Boolean));
  const generationRowsByBatchId = new Map();

  (Array.isArray(generationRows) ? generationRows : []).forEach((row) => {
    const batchId = String(row.batchId || "").trim();

    if (!batchId) {
      return;
    }

    generationRowsByBatchId.set(batchId, [...(generationRowsByBatchId.get(batchId) || []), row]);
  });

  return (Array.isArray(batchRows) ? batchRows : []).filter((batchRow) => {
    const batchId = String(batchRow.id || "").trim();
    const batchGenerationRows = generationRowsByBatchId.get(batchId) || [];

    return (
      batchGenerationRows.length > 0 &&
      batchGenerationRows.every((row) => selectedGenerationIdSet.has(String(row.id || "")))
    );
  });
}

function createPdfGenerationSelection({ batchRows = [], filters = {}, generationRows = [] } = {}) {
  const selectedGenerationRows = selectPdfGenerationRowsForDeletion(generationRows, filters);
  const selectedBatchRows = selectPdfGenerationBatchRowsForDeletion(
    batchRows,
    generationRows,
    selectedGenerationRows,
    filters,
  );
  const generationIds = createUniqueValueList(selectedGenerationRows.map((row) => row.id));
  const batchIds = createUniqueValueList(selectedBatchRows.map((row) => row.id));
  const archiveIds = createUniqueValueList(selectedBatchRows.map((row) => row.archiveId));
  const auditEntityIds = createUniqueValueList([...generationIds, ...batchIds, ...archiveIds]);
  const pdfFilePaths = createUniqueValueList([
    ...selectedGenerationRows.map((row) => row.filePath),
    ...selectedBatchRows.map((row) => row.archiveFilePath),
  ]);

  return {
    archiveIds,
    auditEntityIds,
    batchIds,
    generationIds,
    pdfFilePaths,
    selectedBatchRows,
    selectedGenerationRows,
  };
}

module.exports = {
  createPdfGenerationSelection,
  generationRowMatchesDataDeletionFilters,
  getGenerationScopeValue,
  normalizeGenerationRequestFilters,
  selectPdfGenerationBatchRowsForDeletion,
  selectPdfGenerationRowsForDeletion,
};
