import { getGridVisibleRows, gridPageSizeOptions } from "../../app/data-grid-model.js";
import {
  formatDateTime,
} from "./pdf-generation-render-helpers.js";

export const pdfGenerationGridColumns = Object.freeze([
  Object.freeze({ key: "sequenceNumber", label: "순서", filterable: false, sortable: true }),
  Object.freeze({ key: "track", label: "모집시기", headerLines: ["모집", "시기"], filterable: true, sortable: true }),
  Object.freeze({ key: "admission", label: "전형", filterable: true, sortable: true }),
  Object.freeze({ key: "series", label: "계열", filterable: true, sortable: true }),
  Object.freeze({ key: "unit", label: "모집단위", filterable: true, sortable: true }),
  Object.freeze({ key: "major", label: "전공", filterable: true, sortable: true }),
  Object.freeze({ key: "examDate", label: "시험날짜", headerLines: ["시험", "날짜"], filterable: true, sortable: true }),
  Object.freeze({ key: "time", label: "시작시간", headerLines: ["시작", "시간"], filterable: true, sortable: true }),
  Object.freeze({ key: "endTime", label: "종료시간", headerLines: ["종료", "시간"], filterable: true, sortable: true }),
  Object.freeze({ key: "period", label: "교시", filterable: true, sortable: true }),
  Object.freeze({ key: "building", label: "고사건물", filterable: true, sortable: true }),
  Object.freeze({ key: "room", label: "고사실", filterable: true, sortable: true }),
  Object.freeze({ key: "group", label: "조", filterable: true, sortable: true }),
  Object.freeze({ key: "pageCount", label: "페이지", filterable: true, sortable: true }),
  Object.freeze({ key: "candidateCount", label: "수험생", filterable: true, sortable: true }),
  Object.freeze({ key: "createdAt", label: "생성일시", headerLines: ["생성", "일시"], filterable: true, sortable: true }),
]);

export const pdfGenerationPageSizeOptions = gridPageSizeOptions;

export function getPdfGenerationTableState(pdfGenerations = {}) {
  return {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [{ key: "sequenceNumber", direction: "asc" }],
    ...(pdfGenerations.table || {}),
  };
}

export function normalizePdfGenerationGridValue(item = {}, key = "") {
  const resultScope = item.resultScope || {};
  const valueMap = {
    admission: resultScope.admission,
    building: resultScope.building,
    candidateCount: String(Number(item.candidateCount) || 0),
    createdAt: formatDateTime(item.createdAt),
    endTime: resultScope.endTime,
    examDate: resultScope.examDate,
    group: resultScope.group,
    major: resultScope.major,
    pageCount: String(Number(item.pageCount) || 0),
    period: resultScope.period,
    room: resultScope.room,
    sequenceNumber: String(Number(item.sequenceNumber) || 0),
    series: resultScope.series,
    time: resultScope.time,
    track: resultScope.track,
    unit: resultScope.unit,
  };

  return String(valueMap[key] ?? item[key] ?? "").trim();
}

function getGenerationSequenceTimestamp(item = {}) {
  const completedAtMs = Date.parse(String(item.completedAt || ""));

  if (Number.isFinite(completedAtMs)) {
    return completedAtMs;
  }

  const createdAtMs = Date.parse(String(item.createdAt || ""));

  return Number.isFinite(createdAtMs) ? createdAtMs : Number.MAX_SAFE_INTEGER;
}

export function applyPdfGenerationSequenceNumbers(items = []) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const sequenceNumbersByIndex = new Map();

  normalizedItems
    .map((item, index) => ({
      id: String(item?.id || ""),
      index,
      item,
      timestamp: getGenerationSequenceTimestamp(item),
    }))
    .sort((left, right) => {
      const timestampDelta = left.timestamp - right.timestamp;

      if (timestampDelta) {
        return timestampDelta;
      }

      return left.id.localeCompare(right.id, "ko", { numeric: true, sensitivity: "base" });
    })
    .forEach((entry, index) => {
      sequenceNumbersByIndex.set(entry.index, index + 1);
    });

  return normalizedItems.map((item, index) => ({
    ...item,
    sequenceNumber: sequenceNumbersByIndex.get(index) || index + 1,
  }));
}

export function getPdfGenerationFilterOptionValues(pdfGenerations = {}, key = "") {
  return Array.from(
    new Set(
      (Array.isArray(pdfGenerations.items) ? pdfGenerations.items : [])
        .map((item) => normalizePdfGenerationGridValue(item, key))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" }));
}

export function filterPdfGenerationFilterOptionValues(optionValues = [], searchTerm = "") {
  const normalizedSearchTerm = String(searchTerm || "").trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return optionValues;
  }

  return optionValues.filter((value) => String(value || "").toLowerCase().includes(normalizedSearchTerm));
}

export function getActivePdfGenerationFilterEntries(pdfGenerations = {}) {
  const tableState = getPdfGenerationTableState(pdfGenerations);
  const columnsByKey = new Map(
    pdfGenerationGridColumns
      .filter((column) => column.filterable !== false)
      .map((column) => [column.key, column]),
  );

  return Object.entries(tableState.filters || {}).flatMap(([key, values]) =>
    columnsByKey.has(key)
      ? (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .map((value) => ({ key, label: columnsByKey.get(key)?.label || key, value }))
      : [],
  );
}

export function getFilteredPdfGenerationRows(pdfGenerations = {}) {
  const tableState = getPdfGenerationTableState(pdfGenerations);
  const columnKeys = new Set(pdfGenerationGridColumns.map((column) => column.key));
  const filterColumnKeys = new Set(
    pdfGenerationGridColumns.filter((column) => column.filterable !== false).map((column) => column.key),
  );
  const sortableColumnKeys = new Set(
    pdfGenerationGridColumns.filter((column) => column.sortable !== false).map((column) => column.key),
  );
  const filterEntries = Object.entries(tableState.filters || {}).filter(([key]) => filterColumnKeys.has(key));
  const rows = (Array.isArray(pdfGenerations.items) ? pdfGenerations.items : []).filter((item) =>
    filterEntries.every(([key, values]) => {
      const selectedValues = (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean);
      return !selectedValues.length || selectedValues.includes(normalizePdfGenerationGridValue(item, key));
    }),
  );
  const [sortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];

  if (!sortRule?.key || !columnKeys.has(sortRule.key) || !sortableColumnKeys.has(sortRule.key)) {
    return rows;
  }

  const direction = sortRule.direction === "desc" ? -1 : 1;
  const numericSortKeys = new Set(["candidateCount", "pageCount", "sequenceNumber"]);

  return [...rows].sort((left, right) => {
    if (numericSortKeys.has(sortRule.key)) {
      return ((Number(normalizePdfGenerationGridValue(left, sortRule.key)) || 0) -
        (Number(normalizePdfGenerationGridValue(right, sortRule.key)) || 0)) * direction;
    }

    return normalizePdfGenerationGridValue(left, sortRule.key).localeCompare(
      normalizePdfGenerationGridValue(right, sortRule.key),
      "ko",
      { numeric: true, sensitivity: "base" },
    ) * direction;
  });
}

export function getPdfGenerationVisibleRows(pdfGenerations = {}) {
  return getGridVisibleRows(getFilteredPdfGenerationRows(pdfGenerations), getPdfGenerationTableState(pdfGenerations));
}
