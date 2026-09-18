import { getGridVisibleRows, gridPageSizeOptions } from "../../app/data-grid-model.js";
import {
  formatAuditActionLabel,
  formatDateTime,
  renderAuditMetadata,
} from "./pdf-generation-render-helpers.js";

export const pdfAuditLogGridColumns = Object.freeze([
  Object.freeze({ key: "action", label: "작업 내용", filterable: true, sortable: true }),
  Object.freeze({ key: "target", label: "대상", filterable: true, sortable: true }),
  Object.freeze({ key: "status", label: "상태", filterable: true, sortable: true }),
  Object.freeze({ key: "metadata", label: "처리 내역", filterable: true, sortable: true }),
  Object.freeze({ key: "createdAt", label: "일시", filterable: true, sortable: true }),
]);

export const pdfAuditLogPageSizeOptions = gridPageSizeOptions;

export function formatPdfAuditEntityType(value = "") {
  const labelMap = {
    pdf_generation: "PDF 생성",
    pdf_generation_archive: "ZIP",
    pdf_generation_batch: "일괄 생성",
    pdf_generation_merged: "병합 PDF",
    pdf_generation_preview: "미리보기",
    pdf_generation_retention: "보관 정리",
    pdf_generation_queue: "PDF 처리 대기열",
  };

  return labelMap[value] || (value ? "기타 PDF 작업" : "-");
}

export function formatPdfAuditStatusLabel(status = "") {
  const normalizedStatus = String(status || "").trim();
  const labelMap = {
    cancelled: "취소",
    completed: "완료",
    failed: "실패",
    queued: "대기",
    running: "진행",
  };

  return labelMap[normalizedStatus] || normalizedStatus || "-";
}

export function getPdfAuditLogTableState(pdfGenerations = {}) {
  return {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [{ key: "createdAt", direction: "desc" }],
    ...(pdfGenerations.auditTable || {}),
  };
}

export function normalizePdfAuditLogGridValue(item = {}, key = "") {
  const valueMap = {
    action: formatAuditActionLabel(item.action),
    createdAt: formatDateTime(item.createdAt),
    metadata: renderAuditMetadata(item.metadata) || "-",
    status: formatPdfAuditStatusLabel(item.status),
    target: formatPdfAuditEntityType(item.entityType),
  };

  return String(valueMap[key] ?? item[key] ?? "").trim();
}

export function getPdfAuditLogFilterOptionValues(pdfGenerations = {}, key = "") {
  return Array.from(
    new Set(
      (Array.isArray(pdfGenerations.auditLogs) ? pdfGenerations.auditLogs : [])
        .map((item) => normalizePdfAuditLogGridValue(item, key))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" }));
}

export function filterPdfAuditLogFilterOptionValues(optionValues = [], searchTerm = "") {
  const normalizedSearchTerm = String(searchTerm || "").trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return optionValues;
  }

  return optionValues.filter((value) => String(value || "").toLowerCase().includes(normalizedSearchTerm));
}

export function getFilteredPdfAuditLogRows(pdfGenerations = {}) {
  const tableState = getPdfAuditLogTableState(pdfGenerations);
  const filterColumnKeys = new Set(
    pdfAuditLogGridColumns.filter((column) => column.filterable !== false).map((column) => column.key),
  );
  const sortableColumnKeys = new Set(
    pdfAuditLogGridColumns.filter((column) => column.sortable !== false).map((column) => column.key),
  );
  const filterEntries = Object.entries(tableState.filters || {}).filter(([key]) => filterColumnKeys.has(key));
  const rows = (Array.isArray(pdfGenerations.auditLogs) ? pdfGenerations.auditLogs : []).filter((item) =>
    filterEntries.every(([key, values]) => {
      const selectedValues = (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean);
      return !selectedValues.length || selectedValues.includes(normalizePdfAuditLogGridValue(item, key));
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

    return normalizePdfAuditLogGridValue(left, sortRule.key).localeCompare(
      normalizePdfAuditLogGridValue(right, sortRule.key),
      "ko",
      { numeric: true, sensitivity: "base" },
    ) * direction;
  });
}

export function getPdfAuditLogVisibleRows(pdfGenerations = {}) {
  return getGridVisibleRows(getFilteredPdfAuditLogRows(pdfGenerations), getPdfAuditLogTableState(pdfGenerations));
}
