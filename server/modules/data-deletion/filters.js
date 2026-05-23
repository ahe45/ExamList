const { createUniqueValueList } = require("./utils");

const dataDeletionScopeDefinitions = Object.freeze({
  all: Object.freeze({ label: "전체 데이터" }),
  candidates: Object.freeze({ label: "수험생 데이터" }),
  photos: Object.freeze({ label: "사진 데이터" }),
  "pdf-generations": Object.freeze({ label: "생성 PDF 데이터" }),
  templates: Object.freeze({ label: "양식 데이터" }),
});

const dataDeletionFilterColumns = Object.freeze({
  admission: "admission",
  admissionCode: "admission_code",
  building: "building",
  buildingCode: "building_code",
  campus: "campus",
  campusCode: "campus_code",
  examDate: "exam_date",
  group: "group_name",
  major: "major",
  majorCode: "major_code",
  period: "period",
  periodCode: "period_code",
  room: "room",
  roomCode: "room_code",
  series: "series",
  seriesCode: "series_code",
  time: "time",
  endTime: "end_time",
  track: "track",
  unit: "unit",
  unitCode: "unit_code",
});

const dataDeletionResultFilterKeys = Object.freeze([
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

const dataDeletionFilterAliases = Object.freeze({
  date: "examDate",
  groupName: "group",
});

const generationScopeFilterFallbackMap = Object.freeze({
  admission: "admissionCode",
  building: "buildingCode",
  examDate: "date",
  group: "groupName",
  period: "periodCode",
  room: "roomCode",
  series: "seriesCode",
  unit: "unitCode",
});

function normalizeDataDeletionScope(scope = "") {
  const normalizedScope = String(scope || "").trim().toLowerCase();

  if (normalizedScope === "candidate-photos") {
    return "photos";
  }

  return dataDeletionScopeDefinitions[normalizedScope] ? normalizedScope : "";
}

function normalizeTemplateIds(values = []) {
  const rawValues = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map((value) => value.trim());

  return createUniqueValueList(rawValues);
}

function hasExplicitTemplateIdSelection(request = {}) {
  return Object.prototype.hasOwnProperty.call(request || {}, "templateIds");
}

function normalizeDataDeletionFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [dataDeletionFilterAliases[String(key || "").trim()] || String(key || "").trim(), value])
      .filter(([key]) => Object.prototype.hasOwnProperty.call(dataDeletionFilterColumns, key))
      .map(([key, value]) => [key, String(value ?? "").trim()])
      .filter(([, value]) => value),
  );
}

function hasDataDeletionFilters(filters = {}) {
  return Object.keys(normalizeDataDeletionFilters(filters)).length > 0;
}

function createCandidateFilterWhereClause(schoolId, filters = {}, options = {}) {
  const tableAlias = String(options.tableAlias || "").trim();
  const columnPrefix = tableAlias ? `${tableAlias}.` : "";
  const normalizedFilters = normalizeDataDeletionFilters(filters);
  const conditions = [`${columnPrefix}school_id = ?`];
  const params = [schoolId];

  Object.entries(normalizedFilters).forEach(([key, value]) => {
    const columnName = dataDeletionFilterColumns[key];

    if (!columnName) {
      return;
    }

    conditions.push(`${columnPrefix}${columnName} = ?`);
    params.push(value);
  });

  return {
    params,
    whereClause: `WHERE ${conditions.join(" AND ")}`,
  };
}

module.exports = {
  createCandidateFilterWhereClause,
  dataDeletionFilterAliases,
  dataDeletionFilterColumns,
  dataDeletionResultFilterKeys,
  dataDeletionScopeDefinitions,
  generationScopeFilterFallbackMap,
  hasDataDeletionFilters,
  hasExplicitTemplateIdSelection,
  normalizeDataDeletionFilters,
  normalizeDataDeletionScope,
  normalizeTemplateIds,
};
