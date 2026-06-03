const { normalizeGenerationRequestFilters, parseJsonColumn } = require("./filters");
const { getTemplateGenerationUnitFields } = require("./generation-unit-fields");
const { getGenerationTargetStrategy } = require("./targets");

const collator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

const generationSortFieldAliases = Object.freeze({
  admission: Object.freeze(["admission", "admissionCode"]),
  admissionCode: Object.freeze(["admissionCode", "admission"]),
  building: Object.freeze(["building", "buildingCode"]),
  buildingCode: Object.freeze(["buildingCode", "building"]),
  date: Object.freeze(["date", "examDate"]),
  exam: Object.freeze(["examDate", "date", "exam"]),
  examDate: Object.freeze(["examDate", "date"]),
  period: Object.freeze(["period", "periodCode"]),
  periodCode: Object.freeze(["periodCode", "period"]),
  room: Object.freeze(["room", "roomCode"]),
  roomCode: Object.freeze(["roomCode", "room"]),
  series: Object.freeze(["series", "seriesCode"]),
  seriesCode: Object.freeze(["seriesCode", "series"]),
  unit: Object.freeze(["unit", "unitCode"]),
  unitCode: Object.freeze(["unitCode", "unit"]),
});

function normalizeSortValue(value) {
  return String(value ?? "").trim();
}

function getRequestSnapshot(row = {}) {
  const snapshot = parseJsonColumn(row.requestJson, null);

  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot : {};
}

function getSortFieldAliases(fieldKey = "") {
  const normalizedFieldKey = normalizeSortValue(fieldKey);

  return generationSortFieldAliases[normalizedFieldKey] || Object.freeze([normalizedFieldKey]);
}

function readSortFieldValue({ fieldKey, filters = {}, resultScope = {}, row = {} }) {
  for (const alias of getSortFieldAliases(fieldKey)) {
    const filterValue = normalizeSortValue(filters[alias]);

    if (filterValue) {
      return filterValue;
    }

    const scopeValue = normalizeSortValue(resultScope[alias]);

    if (scopeValue && scopeValue !== "-") {
      return scopeValue;
    }
  }

  return normalizeSortValue(row.targetName);
}

function getGenerationMergeSortFieldKeys(row = {}) {
  const snapshot = getRequestSnapshot(row);
  const generationUnit = normalizeSortValue(
    snapshot.generationUnit || snapshot.template?.generationUnit || row.generationUnit,
  );
  const generationUnitFields = generationUnit === "custom" ? getTemplateGenerationUnitFields(snapshot.template, []) : [];
  const strategy = getGenerationTargetStrategy(generationUnit, generationUnitFields);

  if (Array.isArray(strategy?.targetFields) && strategy.targetFields.length) {
    return strategy.targetFields.map((field) => normalizeSortValue(field.key)).filter(Boolean);
  }

  return strategy?.filterKey ? [strategy.filterKey] : [];
}

function normalizeIntegerSortValue(value, fallback = Number.MAX_SAFE_INTEGER) {
  const parsedValue = Math.round(Number(value));

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function buildGenerationMergeSortKey(row = {}, originalIndex = 0) {
  const snapshot = getRequestSnapshot(row);
  const filters = normalizeGenerationRequestFilters(snapshot.filters);
  const resultScope = normalizeGenerationRequestFilters(snapshot.resultScope);
  const fieldKeys = getGenerationMergeSortFieldKeys(row);

  return {
    chunkIndex: normalizeIntegerSortValue(snapshot.chunk?.chunkIndex, 1),
    fieldValues: fieldKeys.map((fieldKey) => readSortFieldValue({ fieldKey, filters, resultScope, row })),
    originalIndex,
    targetIndex: normalizeIntegerSortValue(snapshot.chunk?.targetIndex),
    targetName: normalizeSortValue(snapshot.targetName || row.targetName),
  };
}

function compareTextSortValue(leftValue = "", rightValue = "") {
  const leftText = normalizeSortValue(leftValue);
  const rightText = normalizeSortValue(rightValue);

  if (!leftText && !rightText) {
    return 0;
  }

  if (!leftText) {
    return 1;
  }

  if (!rightText) {
    return -1;
  }

  return collator.compare(leftText, rightText);
}

function compareGenerationMergeSortKeys(leftKey, rightKey) {
  const fieldCount = Math.max(leftKey.fieldValues.length, rightKey.fieldValues.length);

  for (let index = 0; index < fieldCount; index += 1) {
    const comparison = compareTextSortValue(leftKey.fieldValues[index], rightKey.fieldValues[index]);

    if (comparison !== 0) {
      return comparison;
    }
  }

  if (leftKey.targetIndex !== rightKey.targetIndex) {
    return leftKey.targetIndex - rightKey.targetIndex;
  }

  if (leftKey.chunkIndex !== rightKey.chunkIndex) {
    return leftKey.chunkIndex - rightKey.chunkIndex;
  }

  const targetNameComparison = compareTextSortValue(leftKey.targetName, rightKey.targetName);

  if (targetNameComparison !== 0) {
    return targetNameComparison;
  }

  return leftKey.originalIndex - rightKey.originalIndex;
}

function sortGenerationFilesForMergedDownload(generationFiles = []) {
  return (Array.isArray(generationFiles) ? generationFiles : [])
    .map((generationFile, index) => ({
      generationFile,
      sortKey: buildGenerationMergeSortKey(generationFile, index),
    }))
    .sort((leftItem, rightItem) => compareGenerationMergeSortKeys(leftItem.sortKey, rightItem.sortKey))
    .map((item) => item.generationFile);
}

module.exports = {
  buildGenerationMergeSortKey,
  getGenerationMergeSortFieldKeys,
  sortGenerationFilesForMergedDownload,
};
