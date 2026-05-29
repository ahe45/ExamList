export const candidateGridColumns = Object.freeze([
  Object.freeze({ key: "designatedSort", label: "지정정렬", filterable: true, sortable: true }),
  Object.freeze({ key: "track", label: "모집시기", filterable: true, sortable: true }),
  Object.freeze({ key: "campus", label: "캠퍼스명", filterable: true, sortable: true }),
  Object.freeze({ key: "campusCode", label: "캠퍼스코드", filterable: true, sortable: true }),
  Object.freeze({ key: "admission", label: "전형명", filterable: true, sortable: true }),
  Object.freeze({ key: "admissionCode", label: "전형코드", filterable: true, sortable: true }),
  Object.freeze({ key: "series", label: "계열명", filterable: true, sortable: true }),
  Object.freeze({ key: "seriesCode", label: "계열코드", filterable: true, sortable: true }),
  Object.freeze({ key: "unit", label: "모집단위명", filterable: true, sortable: true }),
  Object.freeze({ key: "unitCode", label: "모집단위코드", filterable: true, sortable: true }),
  Object.freeze({ key: "major", label: "전공명", filterable: true, sortable: true }),
  Object.freeze({ key: "majorCode", label: "전공코드", filterable: true, sortable: true }),
  Object.freeze({ key: "date", label: "시험날짜", filterable: true, sortable: true }),
  Object.freeze({ key: "time", label: "시작시간", filterable: true, sortable: true }),
  Object.freeze({ key: "endTime", label: "종료시간", filterable: true, sortable: true }),
  Object.freeze({ key: "period", label: "교시명", filterable: true, sortable: true }),
  Object.freeze({ key: "periodCode", label: "교시코드", filterable: true, sortable: true }),
  Object.freeze({ key: "building", label: "고사건물명", filterable: true, sortable: true }),
  Object.freeze({ key: "buildingCode", label: "고사건물코드", filterable: true, sortable: true }),
  Object.freeze({ key: "room", label: "고사실명", filterable: true, sortable: true }),
  Object.freeze({ key: "roomCode", label: "고사실코드", filterable: true, sortable: true }),
  Object.freeze({ key: "examineeNo", label: "수험번호", filterable: true, sortable: true }),
  Object.freeze({ key: "temporaryNo", label: "가번호", filterable: true, sortable: true }),
  Object.freeze({ key: "name", label: "이름", filterable: true, sortable: true }),
  Object.freeze({ key: "birth", label: "생년월일", filterable: true, sortable: true }),
  Object.freeze({ key: "group", label: "조", filterable: true, sortable: true }),
  Object.freeze({ key: "opt1", label: "OPT1", filterable: true, sortable: true }),
  Object.freeze({ key: "opt2", label: "OPT2", filterable: true, sortable: true }),
  Object.freeze({ key: "opt3", label: "OPT3", filterable: true, sortable: true }),
  Object.freeze({ key: "opt4", label: "OPT4", filterable: true, sortable: true }),
  Object.freeze({ key: "opt5", label: "OPT5", filterable: true, sortable: true }),
]);

export const candidateDetailFields = Object.freeze([
  Object.freeze({ key: "designatedSort", label: "지정정렬", type: "text" }),
  Object.freeze({ key: "track", label: "모집시기", type: "text" }),
  Object.freeze({ key: "campus", label: "캠퍼스명", type: "text" }),
  Object.freeze({ key: "campusCode", label: "캠퍼스코드", type: "text" }),
  Object.freeze({ key: "admission", label: "전형명", type: "text" }),
  Object.freeze({ key: "admissionCode", label: "전형코드", type: "text" }),
  Object.freeze({ key: "series", label: "계열명", type: "text" }),
  Object.freeze({ key: "seriesCode", label: "계열코드", type: "text" }),
  Object.freeze({ key: "unit", label: "모집단위명", type: "text" }),
  Object.freeze({ key: "unitCode", label: "모집단위코드", type: "text" }),
  Object.freeze({ key: "major", label: "전공명", type: "text" }),
  Object.freeze({ key: "majorCode", label: "전공코드", type: "text" }),
  Object.freeze({ key: "date", label: "시험날짜", type: "text" }),
  Object.freeze({ key: "time", label: "시작시간", type: "time" }),
  Object.freeze({ key: "endTime", label: "종료시간", type: "time" }),
  Object.freeze({ key: "period", label: "교시명", type: "text" }),
  Object.freeze({ key: "periodCode", label: "교시코드", type: "text" }),
  Object.freeze({ key: "building", label: "고사건물명", type: "text" }),
  Object.freeze({ key: "buildingCode", label: "고사건물코드", type: "text" }),
  Object.freeze({ key: "room", label: "고사실명", type: "text" }),
  Object.freeze({ key: "roomCode", label: "고사실코드", type: "text" }),
  Object.freeze({ key: "examineeNo", label: "수험번호", type: "text" }),
  Object.freeze({ key: "temporaryNo", label: "가번호", type: "text" }),
  Object.freeze({ key: "name", label: "이름", type: "text" }),
  Object.freeze({ key: "birth", label: "생년월일", type: "text" }),
  Object.freeze({ key: "group", label: "조", type: "text" }),
  Object.freeze({ key: "opt1", label: "OPT1", type: "text" }),
  Object.freeze({ key: "opt2", label: "OPT2", type: "text" }),
  Object.freeze({ key: "opt3", label: "OPT3", type: "text" }),
  Object.freeze({ key: "opt4", label: "OPT4", type: "text" }),
  Object.freeze({ key: "opt5", label: "OPT5", type: "text" }),
]);

export const pageSizeOptions = Object.freeze([10, 30, 50, 100, 500, 1000, 2000, 0]);
export const uploadPolicyOptions = Object.freeze([
  Object.freeze({ description: "기존 데이터 수정건과 동일 데이터는 건너뜁니다.", label: "신규만 반영", value: "insert-only" }),
  Object.freeze({ description: "동일 데이터는 건너뛰고 신규와 수정건만 반영합니다.", label: "신규 + 수정 반영", value: "insert-update" }),
  Object.freeze({ description: "동일 데이터까지 포함해 업로드 파일 전체를 다시 반영합니다.", label: "전체 반영", value: "all" }),
]);

export function getCandidateTableState(candidates = {}) {
  return {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [],
    ...(candidates.table || {}),
  };
}

export function getCandidateGridColumns() {
  return candidateGridColumns;
}

export function normalizeCandidateValue(item = {}, key = "") {
  if (key === "hasPhoto") {
    return item.hasPhoto || item.photoFileId ? "O" : "X";
  }

  const valueMap = {
    admissionCode: item.admissionCode || item.admissionTypeCode,
    campus: item.campus || item.campusName,
    birth: item.birth || item.birthDate,
    date: item.date || item.examDate,
    designatedSort: item.designatedSort,
    group: item.group || item.groupName,
    period: item.period || item.periodName,
    roomCode: item.roomCode || item.roomId,
    temporaryNo: item.temporaryNo,
    time: item.time || item.examStartTime,
    endTime: item.endTime || item.examEndTime,
  };

  return String(valueMap[key] ?? item[key] ?? "").trim();
}

export function getCandidateFilterOptionValues(candidates = {}, key = "") {
  return Array.from(
    new Set(
      (Array.isArray(candidates.items) ? candidates.items : [])
        .map((item) => normalizeCandidateValue(item, key))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ko"));
}

export function filterCandidateFilterOptionValues(optionValues = [], searchTerm = "") {
  const normalizedSearchTerm = String(searchTerm || "").trim().toLowerCase();

  if (!normalizedSearchTerm) {
    return optionValues;
  }

  return optionValues.filter((value) => String(value || "").toLowerCase().includes(normalizedSearchTerm));
}

export function getActiveFilterEntries(candidates = {}) {
  const tableState = getCandidateTableState(candidates);
  const columnsByKey = new Map(candidateGridColumns.map((column) => [column.key, column]));

  return Object.entries(tableState.filters || {}).flatMap(([key, values]) =>
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .map((value) => ({ key, label: columnsByKey.get(key)?.label || key, value })),
  );
}

export function getFilteredCandidateRows(candidates = {}) {
  const tableState = getCandidateTableState(candidates);
  const filterEntries = Object.entries(tableState.filters || {});
  const rows = (Array.isArray(candidates.items) ? candidates.items : []).filter((item) =>
    filterEntries.every(([key, values]) => {
      const selectedValues = (Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean);
      return !selectedValues.length || selectedValues.includes(normalizeCandidateValue(item, key));
    }),
  );
  const [sortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];

  if (!sortRule?.key) {
    return rows;
  }

  const direction = sortRule.direction === "desc" ? -1 : 1;

  return [...rows].sort(
    (left, right) =>
      normalizeCandidateValue(left, sortRule.key).localeCompare(normalizeCandidateValue(right, sortRule.key), "ko", {
        numeric: true,
        sensitivity: "base",
      }) * direction,
  );
}

export function getCandidateVisibleRows(candidates = {}) {
  const tableState = getCandidateTableState(candidates);
  const rows = getFilteredCandidateRows(candidates);
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
