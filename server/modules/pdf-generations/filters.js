const generationStatuses = Object.freeze(["queued", "running", "completed", "failed"]);
const terminalGenerationStatuses = Object.freeze(["completed", "failed"]);

function parseJsonColumn(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeListLimit(value, fallback = 10, minimum = 1, maximum = 50) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function normalizeGenerationListFilter(rawFilter = {}) {
  const status = String(rawFilter.status || "").trim();
  const schoolId = String(rawFilter.schoolId || "").trim();
  const page = normalizeListLimit(rawFilter.page, 1, 1, 100000);
  const filter = {
    generationUnit: String(rawFilter.generationUnit || "").trim(),
    keyword: String(rawFilter.keyword || "").trim(),
    limit: normalizeListLimit(rawFilter.limit, 20, 1, 100),
    page,
    status: generationStatuses.includes(status) ? status : "",
    templateId: String(rawFilter.templateId || "").trim(),
  };

  if (schoolId) {
    filter.schoolId = schoolId;
  }

  return filter;
}

function normalizeGenerationRequestFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [String(key || "").trim(), value])
      .filter(([key]) => key)
      .flatMap(([key, value]) => {
        if (value === null || typeof value === "undefined") {
          return [];
        }

        const normalizedValue = String(value).trim();

        return normalizedValue ? [[key, normalizedValue]] : [];
      }),
  );
}

module.exports = {
  generationStatuses,
  normalizeGenerationListFilter,
  normalizeGenerationRequestFilters,
  normalizeListLimit,
  parseJsonColumn,
  terminalGenerationStatuses,
};
