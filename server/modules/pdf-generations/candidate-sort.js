const {
  defaultCandidateBlockGridSortDirection,
  defaultCandidateBlockGridSortKey,
  normalizeCandidateBlockGridSortDirection,
  normalizeCandidateBlockGridSortKey,
} = require("../pdf-templates/candidate-block-grid-sort");

function normalizeGenerationCandidateSort(sort = {}) {
  const source = sort && typeof sort === "object" && !Array.isArray(sort) ? sort : {};

  return {
    sortDirection: normalizeCandidateBlockGridSortDirection(
      source.sortDirection ?? source.direction ?? source.order ?? defaultCandidateBlockGridSortDirection,
    ),
    sortKey: normalizeCandidateBlockGridSortKey(
      source.sortKey ?? source.key ?? source.field ?? defaultCandidateBlockGridSortKey,
    ),
  };
}

function resolveCandidateSortFromTemplate(template = {}) {
  const pages = Array.isArray(template?.layout?.pages)
    ? [...template.layout.pages]
        .filter((page) => page && page.enabled !== false && String(page.type || "") !== "cover")
        .sort((left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0))
    : [];

  for (const page of pages) {
    const config = page?.settings?.candidateBlockGrid;

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      continue;
    }

    if (config.enabled !== true && String(config.enabled || "").trim() !== "true") {
      continue;
    }

    return normalizeGenerationCandidateSort({
      sortDirection: config.sortDirection ?? config.sort?.direction,
      sortKey: config.sortKey ?? config.sortField ?? config.sort?.field,
    });
  }

  return normalizeGenerationCandidateSort();
}

function resolveGenerationCandidateSort({ request = {}, template = {} } = {}) {
  const requestSort = request.candidateSort || request.sort;

  if (requestSort && typeof requestSort === "object" && !Array.isArray(requestSort)) {
    return normalizeGenerationCandidateSort(requestSort);
  }

  return resolveCandidateSortFromTemplate(template);
}

module.exports = {
  normalizeGenerationCandidateSort,
  resolveCandidateSortFromTemplate,
  resolveGenerationCandidateSort,
};
