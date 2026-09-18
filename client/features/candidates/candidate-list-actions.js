import { getJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toQueryString } from "./candidate-action-utils.js";
import {
  filterCandidateFilterOptionValues,
  getCandidateFilterOptionValues,
  getFilteredCandidateRows,
} from "./renderers.js";

const candidateListPageFetchLimit = 5000;

function captureCandidateGridScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }

  const tableScrollElement = document.querySelector("[data-candidate-table-scroll]");

  return {
    tableLeft: Number(tableScrollElement?.scrollLeft || 0),
    tableTop: Number(tableScrollElement?.scrollTop || 0),
    windowLeft: Number(window.scrollX || 0),
    windowTop: Number(window.scrollY || 0),
  };
}

function restoreCandidateGridScroll(snapshot = null) {
  if (!snapshot || typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const tableScrollElement = document.querySelector("[data-candidate-table-scroll]");

  if (tableScrollElement) {
    tableScrollElement.scrollLeft = snapshot.tableLeft;
    tableScrollElement.scrollTop = snapshot.tableTop;
  }

  window.scrollTo(snapshot.windowLeft, snapshot.windowTop);
}

export function createCandidateListActions({ appState, getCurrentSchoolId, onStateChange }) {
  function getCandidateTableState() {
    appState.candidates.table = {
      filterMenuKey: "",
      filterMenuPosition: null,
      filterMenuSearch: "",
      filters: {},
      page: 1,
      pageSize: 30,
      pageSizeMenuOpen: false,
      sortRules: [],
      ...(appState.candidates.table || {}),
    };

    return appState.candidates.table;
  }

  function clampCandidatePage() {
    const tableState = getCandidateTableState();
    const rows = getFilteredCandidateRows(appState.candidates);
    const pageSize = Math.max(0, Number(tableState.pageSize) || 0);
    const total = appState.candidates.serverPaged ? appState.candidates.total : rows.length;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    tableState.page = pageSize > 0 ? Math.min(Math.max(1, Number(tableState.page) || 1), totalPages) : 1;
    return totalPages;
  }

  function closeCandidateFilterMenu() {
    const tableState = getCandidateTableState();

    tableState.filterMenuKey = "";
    tableState.filterMenuPosition = null;
    tableState.filterMenuSearch = "";
  }

  function closeCandidatePageSizeMenu() {
    getCandidateTableState().pageSizeMenuOpen = false;
  }

  async function onStateChangePreservingCandidateGridScroll() {
    const scrollSnapshot = captureCandidateGridScroll();

    await onStateChange();
    restoreCandidateGridScroll(scrollSnapshot);

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => restoreCandidateGridScroll(scrollSnapshot));
    }
  }

  function toggleCandidateSort(columnKey = "") {
    const tableState = getCandidateTableState();
    const [currentSortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];

    if (currentSortRule?.key !== columnKey) {
      tableState.sortRules = [{ direction: "asc", key: columnKey }];
    } else if (currentSortRule.direction === "asc") {
      tableState.sortRules = [{ direction: "desc", key: columnKey }];
    } else {
      tableState.sortRules = [];
    }

    tableState.page = 1;
  }

  function setCandidateFilterValues(columnKey = "", values = []) {
    const tableState = getCandidateTableState();
    const nextValues = Array.from(
      new Set(
        (Array.isArray(values) ? values : [values])
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    tableState.filters = { ...(tableState.filters || {}) };

    if (nextValues.length) {
      tableState.filters[columnKey] = nextValues;
    } else {
      delete tableState.filters[columnKey];
    }

    tableState.page = 1;
    clampCandidatePage();
  }

  function getVisibleCandidateFilterOptions(columnKey = "") {
    const tableState = getCandidateTableState();

    return filterCandidateFilterOptionValues(
      getCandidateFilterOptionValues(appState.candidates, columnKey),
      tableState.filterMenuSearch,
    );
  }

  let requestVersion = 0;
  let optionsVersion = 0;
  function buildCandidateQuery() {
    const state = getCandidateTableState();
    const sort = state.sortRules[0] || {};
    return { schoolId: getCurrentSchoolId(), gridFilters: JSON.stringify(state.filters), sortKey: sort.key || "", sortDirection: sort.direction || "", limit: state.pageSize || candidateListPageFetchLimit, page: state.pageSize ? state.page : 1 };
  }
  async function loadCandidateGridOptions(field) {
    const schoolId = getCurrentSchoolId();
    const version = ++optionsVersion;
    let payload;
    try { payload = await getJson(`/api/candidates/grid-options?${toQueryString({ schoolId, field })}`); }
    catch (error) { if (version === optionsVersion && schoolId === getCurrentSchoolId()) showToast(error.message, { tone: "error" }); return; }
    if (version !== optionsVersion || schoolId !== getCurrentSchoolId()) return;
    appState.candidates.gridOptions = { ...(appState.candidates.gridOptions || {}), [field]: payload.values || [] };
    await onStateChangePreservingCandidateGridScroll();
  }
  async function loadCandidates() {
    const version = ++requestVersion;
    const query = buildCandidateQuery();
    if (appState.candidates.gridOptionsSchoolId !== query.schoolId) {
      appState.candidates.gridOptions = {};
      appState.candidates.gridOptionsSchoolId = query.schoolId;
    }
    const current = () => version === requestVersion && query.schoolId === getCurrentSchoolId();
    const scroll = captureCandidateGridScroll();
    appState.candidates.loading = true;
    try {
      const payload = await getJson(`/api/candidates?${toQueryString(query)}`);
      if (!current()) return;
      const items = [...(payload.items || [])];
      if (!getCandidateTableState().pageSize) {
        for (let page = 2; page <= Math.ceil(payload.total / payload.limit); page++) {
          const next = await getJson(`/api/candidates?${toQueryString({ ...query, page })}`);
          if (!current()) return;
          items.push(...(next.items || []));
        }
      }
      appState.candidates.serverPaged = true;
      appState.candidates.items = items;
      appState.candidates.total = payload.total || 0;
      appState.candidates.errorMessage = "";
      appState.candidates.successMessage = "";
      const requestedPage = getCandidateTableState().page;
      clampCandidatePage();
      if (query.page > 1 && requestedPage !== getCandidateTableState().page) return await loadCandidates();
    } catch (error) {
      if (!current()) return;
      appState.candidates.items = [];
      appState.candidates.errorMessage = error.message;
      showToast(error.message, { tone: "error" });
    } finally {
      if (current()) { appState.candidates.loading = false; await onStateChange(); restoreCandidateGridScroll(scroll); }
    }
  }

  return Object.freeze({
    buildCandidateQuery,
    loadCandidateGridOptions,
    reloadCandidatePage: loadCandidates,
    clampCandidatePage,
    closeCandidateFilterMenu,
    closeCandidatePageSizeMenu,
    getCandidateTableState,
    getVisibleCandidateFilterOptions,
    loadCandidates,
    onStateChangePreservingCandidateGridScroll,
    setCandidateFilterValues,
    toggleCandidateSort,
  });
}
