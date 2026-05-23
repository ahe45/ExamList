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
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;

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

  async function fetchCandidateListPage({ page = 1, schoolId = "" } = {}) {
    const queryString = toQueryString({
      limit: candidateListPageFetchLimit,
      page,
      schoolId,
    });

    return getJson(`/api/candidates?${queryString}`);
  }

  async function fetchAllCandidateRows(schoolId = "") {
    const firstPayload = await fetchCandidateListPage({ page: 1, schoolId });
    const firstItems = Array.isArray(firstPayload.items) ? firstPayload.items : [];
    const total = Number(firstPayload.total) || firstItems.length;
    const pageLimit = Math.max(1, Number(firstPayload.limit) || candidateListPageFetchLimit);
    const totalPages = Math.max(1, Math.ceil(total / pageLimit));

    if (totalPages <= 1) {
      return {
        ...firstPayload,
        items: firstItems,
        total,
      };
    }

    const remainingPayloads = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        fetchCandidateListPage({ page: index + 2, schoolId }),
      ),
    );
    const remainingItems = remainingPayloads.flatMap((payload) =>
      Array.isArray(payload.items) ? payload.items : [],
    );

    return {
      ...firstPayload,
      items: [...firstItems, ...remainingItems],
      total,
    };
  }

  async function loadCandidates() {
    appState.candidates.loading = true;

    try {
      const payload = await fetchAllCandidateRows(getCurrentSchoolId());

      appState.candidates.items = payload.items || [];
      appState.candidates.total = payload.total || 0;
      appState.candidates.errorMessage = "";
      appState.candidates.successMessage = "";
      clampCandidatePage();
    } catch (error) {
      appState.candidates.items = [];
      appState.candidates.errorMessage = error.message;
      appState.candidates.successMessage = "";
      showToast(appState.candidates.errorMessage, { tone: "error" });
    } finally {
      appState.candidates.loading = false;
      await onStateChange();
    }
  }

  return Object.freeze({
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
