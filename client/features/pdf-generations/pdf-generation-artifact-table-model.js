import { formatCount } from "../../app/number-format.js";
import {
  formatDateTime,
  formatFileSize,
} from "./pdf-generation-render-helpers.js";

export const pdfGenerationArtifactGridColumns = Object.freeze([
  Object.freeze({ key: "kind", label: "유형", filterable: true, sortable: true }),
  Object.freeze({ key: "fileName", label: "파일명", filterable: true, sortable: true }),
  Object.freeze({ key: "content", label: "파일 내용", filterable: true, sortable: true }),
  Object.freeze({ key: "fileSizeBytes", label: "파일 크기", filterable: true, sortable: true }),
  Object.freeze({ key: "createdAt", label: "생성일시", filterable: true, sortable: true }),
]);

export const pdfGenerationArtifactPageSizeOptions = Object.freeze([10, 30, 50, 100, 500, 1000, 2000, 0]);

export function getPdfGenerationArtifactTableState(pdfGenerations = {}) {
  return {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [{ key: "createdAt", direction: "desc" }],
    ...(pdfGenerations.artifactTable || {}),
  };
}

export function formatPdfGenerationArtifactKind(kind = "") {
  if (kind === "merged") {
    return "병합 PDF";
  }

  if (kind === "archive") {
    return "ZIP";
  }

  return "파일";
}

function toPositiveCount(value) {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? count : 0;
}

function getArtifactContentCount(artifact = {}) {
  if (artifact.kind === "archive") {
    return toPositiveCount(artifact.generationCount);
  }

  if (artifact.kind === "merged") {
    return toPositiveCount(artifact.pageCount);
  }

  return 0;
}

export function formatPdfGenerationArtifactContent(artifact = {}) {
  const contentCount = getArtifactContentCount(artifact);

  if (!contentCount) {
    return "-";
  }

  if (artifact.kind === "archive") {
    return `PDF ${formatCount(contentCount)}개`;
  }

  if (artifact.kind === "merged") {
    return `${formatCount(contentCount)}페이지`;
  }

  return "-";
}

export function normalizePdfGenerationArtifactGridValue(item = {}, key = "") {
  const valueMap = {
    content: formatPdfGenerationArtifactContent(item),
    createdAt: formatDateTime(item.createdAt),
    fileName: item.fileName,
    fileSizeBytes: formatFileSize(item.fileSizeBytes),
    kind: formatPdfGenerationArtifactKind(item.kind),
  };

  return String(valueMap[key] ?? item[key] ?? "").trim();
}

export function getPdfGenerationArtifactFilterOptionValues(pdfGenerations = {}, key = "") {
  return Array.from(
    new Set(
      (Array.isArray(pdfGenerations.artifactItems) ? pdfGenerations.artifactItems : [])
        .map((item) => normalizePdfGenerationArtifactGridValue(item, key))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" }));
}

export function filterPdfGenerationArtifactFilterOptionValues(optionValues = [], searchTerm = "") {
  const normalizedSearchTerm = String(searchTerm || "").trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return optionValues;
  }

  return optionValues.filter((value) => String(value || "").toLowerCase().includes(normalizedSearchTerm));
}

export function getFilteredPdfGenerationArtifactRows(pdfGenerations = {}) {
  const tableState = getPdfGenerationArtifactTableState(pdfGenerations);
  const filterColumnKeys = new Set(
    pdfGenerationArtifactGridColumns.filter((column) => column.filterable !== false).map((column) => column.key),
  );
  const sortableColumnKeys = new Set(
    pdfGenerationArtifactGridColumns.filter((column) => column.sortable !== false).map((column) => column.key),
  );
  const filterEntries = Object.entries(tableState.filters || {}).filter(([key]) => filterColumnKeys.has(key));
  const rows = (Array.isArray(pdfGenerations.artifactItems) ? pdfGenerations.artifactItems : []).filter((item) =>
    filterEntries.every(([key, values]) => {
      const selectedValues = (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean);
      return !selectedValues.length || selectedValues.includes(normalizePdfGenerationArtifactGridValue(item, key));
    }),
  );
  const [sortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];

  if (!sortRule?.key || !sortableColumnKeys.has(sortRule.key)) {
    return rows;
  }

  const direction = sortRule.direction === "desc" ? -1 : 1;

  return [...rows].sort((left, right) => {
    if (sortRule.key === "createdAt") {
      const leftTime = Date.parse(String(left.createdAt || ""));
      const rightTime = Date.parse(String(right.createdAt || ""));
      const safeLeftTime = Number.isFinite(leftTime) ? leftTime : 0;
      const safeRightTime = Number.isFinite(rightTime) ? rightTime : 0;

      return (safeLeftTime - safeRightTime) * direction;
    }

    if (sortRule.key === "content") {
      return (getArtifactContentCount(left) - getArtifactContentCount(right)) * direction;
    }

    if (sortRule.key === "fileSizeBytes") {
      return ((Number(left.fileSizeBytes) || 0) - (Number(right.fileSizeBytes) || 0)) * direction;
    }

    return normalizePdfGenerationArtifactGridValue(left, sortRule.key).localeCompare(
      normalizePdfGenerationArtifactGridValue(right, sortRule.key),
      "ko",
      { numeric: true, sensitivity: "base" },
    ) * direction;
  });
}

export function getPdfGenerationArtifactVisibleRows(pdfGenerations = {}) {
  const tableState = getPdfGenerationArtifactTableState(pdfGenerations);
  const rows = getFilteredPdfGenerationArtifactRows(pdfGenerations);
  const pageSize = Math.max(0, Number(tableState.pageSize) || 0);
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = pageSize > 0 ? Math.min(Math.max(1, Number(tableState.page) || 1), totalPages) : 1;
  const startIndex = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
  const visibleRows = pageSize > 0 ? rows.slice(startIndex, startIndex + pageSize) : rows;

  return {
    currentPage,
    endRowNumber: rows.length === 0 ? 0 : startIndex + visibleRows.length,
    rows,
    startRowNumber: rows.length === 0 ? 0 : startIndex + 1,
    totalPages,
    visibleRows,
  };
}
