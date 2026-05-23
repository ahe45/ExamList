import { showToast } from "../../app/toast.js";
import { fetchBlob, triggerBlobDownload } from "./candidate-action-utils.js";
import { getFilteredCandidateRows } from "./renderers.js";

function resolveCandidateFilterMenuPosition(triggerElement) {
  if (!triggerElement || typeof window === "undefined") {
    return null;
  }

  const rect = triggerElement.getBoundingClientRect();
  const tableWrapRect = triggerElement.closest(".table-wrap")?.getBoundingClientRect();
  const viewportWidth = Number(window.innerWidth) || 0;
  const viewportHeight = Number(window.innerHeight) || 0;
  const menuWidth = Math.min(320, Math.max(0, viewportWidth - 24));
  const menuMaxHeight = Math.min(540, Math.max(0, viewportHeight - 24));
  const minimumLeft = Math.max(12, Number(tableWrapRect?.left || 0) || 12);
  const preferredLeft = rect.left + rect.width / 2 - menuWidth / 2;
  const left = Math.max(minimumLeft, Math.min(preferredLeft, Math.max(minimumLeft, viewportWidth - menuWidth - 12)));
  const preferredTop = rect.bottom + 8;
  const top = Math.max(12, Math.min(preferredTop, Math.max(12, viewportHeight - menuMaxHeight - 12)));

  return {
    left: Math.round(left),
    top: Math.round(top),
  };
}

function restoreCandidateFilterSearchFocus(selectionStart = 0, selectionEnd = selectionStart) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    const inputElement = document.querySelector("[data-candidate-filter-search-input]");

    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }

    inputElement.focus({ preventScroll: true });
    inputElement.setSelectionRange(selectionStart, selectionEnd);
  });
}

export async function handleCandidateFilterChange(event, context) {
  const {
    getCandidateTableState,
    getVisibleCandidateFilterOptions,
    onStateChangePreservingCandidateGridScroll,
    setCandidateFilterValues,
  } = context;

  if (event.target.matches("[data-candidate-filter-option]")) {
    const columnKey = event.target.dataset.filterKey || "";
    const filterValue = event.target.dataset.filterValue || "";
    const currentValues = getCandidateTableState().filters?.[columnKey] || [];
    const nextValues = event.target.checked
      ? [...currentValues, filterValue]
      : currentValues.filter((value) => String(value || "") !== filterValue);

    setCandidateFilterValues(columnKey, nextValues);
    await onStateChangePreservingCandidateGridScroll();
    return true;
  }

  if (event.target.matches("[data-candidate-filter-select-all]")) {
    const columnKey = event.target.dataset.filterKey || "";
    const visibleOptions = getVisibleCandidateFilterOptions(columnKey);
    const currentValues = getCandidateTableState().filters?.[columnKey] || [];
    const visibleOptionSet = new Set(visibleOptions.map((value) => String(value || "")));
    const nextValues = event.target.checked
      ? Array.from(new Set([...currentValues, ...visibleOptions]))
      : currentValues.filter((value) => !visibleOptionSet.has(String(value || "")));

    setCandidateFilterValues(columnKey, nextValues);
    await onStateChangePreservingCandidateGridScroll();
    return true;
  }

  return false;
}

export async function handleCandidateTableChange(event, context) {
  const {
    clampCandidatePage,
    closeCandidateFilterMenu,
    closeCandidatePageSizeMenu,
    getCandidateTableState,
    onStateChange,
  } = context;
  const pagePicker = event.target.closest("[data-candidate-grid-page-picker]");

  if (!pagePicker) {
    return false;
  }

  getCandidateTableState().page = Math.max(1, Number(pagePicker.value) || 1);
  closeCandidateFilterMenu();
  closeCandidatePageSizeMenu();
  clampCandidatePage();
  await onStateChange();
  return true;
}

export async function handleCandidateFilterInput(event, context) {
  const { getCandidateTableState, onStateChangePreservingCandidateGridScroll } = context;

  if (!event.target.matches("[data-candidate-filter-search-input]")) {
    return false;
  }

  const selectionStart = Number.isFinite(event.target.selectionStart) ? event.target.selectionStart : String(event.target.value || "").length;
  const selectionEnd = Number.isFinite(event.target.selectionEnd) ? event.target.selectionEnd : selectionStart;

  getCandidateTableState().filterMenuSearch = event.target.value;
  await onStateChangePreservingCandidateGridScroll();
  restoreCandidateFilterSearchFocus(selectionStart, selectionEnd);
  return true;
}

export async function handleCandidateTableKeyDown(event, context) {
  const {
    appState,
    closeCandidateFilterMenu,
    getCandidateTableState,
    onStateChangePreservingCandidateGridScroll,
  } = context;

  if (event.key !== "Escape" || appState.currentView !== "candidateLookup") {
    return false;
  }

  if (!getCandidateTableState().filterMenuKey) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  closeCandidateFilterMenu();
  await onStateChangePreservingCandidateGridScroll();
  return true;
}

export async function handleCandidateTableClick(event, context) {
  const {
    appState,
    canManageCandidates,
    clampCandidatePage,
    closeCandidateFilterMenu,
    closeCandidatePageSizeMenu,
    getCandidateTableState,
    onStateChangePreservingCandidateGridScroll,
    onStateChange,
    openCandidateDetail,
    setCandidateFilterValues,
    toggleCandidateSort,
  } = context;
  const candidateRow = event.target.closest("[data-candidate-row-id]");

  if (candidateRow && canManageCandidates()) {
    openCandidateDetail(candidateRow.dataset.candidateRowId);
    await onStateChange();
    return true;
  }

  const sortButton = event.target.closest("[data-candidate-grid-sort]");

  if (sortButton) {
    toggleCandidateSort(sortButton.dataset.candidateGridSort || "");
    closeCandidateFilterMenu();
    closeCandidatePageSizeMenu();
    await onStateChangePreservingCandidateGridScroll();
    return true;
  }

  const filterButton = event.target.closest("[data-candidate-grid-filter]");

  if (filterButton) {
    const tableState = getCandidateTableState();
    const nextFilterKey = filterButton.dataset.candidateGridFilter || "";
    const isClosingCurrentMenu = tableState.filterMenuKey === nextFilterKey;

    tableState.filterMenuKey = isClosingCurrentMenu ? "" : nextFilterKey;
    tableState.filterMenuPosition = isClosingCurrentMenu ? null : resolveCandidateFilterMenuPosition(filterButton);
    tableState.filterMenuSearch = "";
    closeCandidatePageSizeMenu();
    await onStateChangePreservingCandidateGridScroll();
    return true;
  }

  if (event.target.closest("[data-candidate-page-size-trigger]")) {
    event.preventDefault();
    const tableState = getCandidateTableState();

    tableState.pageSizeMenuOpen = !tableState.pageSizeMenuOpen;
    closeCandidateFilterMenu();
    await onStateChange();
    return true;
  }

  const pageSizeOption = event.target.closest("[data-candidate-page-size-option]");

  if (pageSizeOption) {
    event.preventDefault();
    const tableState = getCandidateTableState();

    tableState.pageSize = Math.max(0, Number(pageSizeOption.dataset.candidatePageSizeOption) || 0);
    tableState.page = 1;
    tableState.pageSizeMenuOpen = false;
    clampCandidatePage();
    await onStateChange();
    return true;
  }

  const pageButton = event.target.closest("[data-candidate-grid-page]");

  if (pageButton) {
    event.preventDefault();
    getCandidateTableState().page = Math.max(1, Number(pageButton.dataset.candidateGridPage) || 1);
    clampCandidatePage();
    await onStateChange();
    return true;
  }

  const navButton = event.target.closest("[data-candidate-grid-nav]");

  if (navButton) {
    event.preventDefault();

    if (navButton.disabled) {
      return true;
    }

    const navDirection = navButton.dataset.candidateGridNav;
    const direction = navDirection === "prev" || navDirection === "next" ? navDirection : "";

    if (!direction) {
      return true;
    }

    const tableState = getCandidateTableState();
    const totalPages = clampCandidatePage();
    const currentPage = Math.min(Math.max(1, Number(tableState.page) || 1), totalPages);

    tableState.page = direction === "prev" ? Math.max(1, currentPage - 1) : Math.min(totalPages, currentPage + 1);
    await onStateChange();
    return true;
  }

  return false;
}

export async function handleCandidateTableAction(actionTarget, action, context) {
  const {
    appState,
    closeCandidateFilterMenu,
    getCandidateTableState,
    loadCandidates,
    onStateChange,
    onStateChangePreservingCandidateGridScroll,
    setCandidateFilterValues,
  } = context;

  if (action === "refresh-candidates") {
    await loadCandidates();
    return true;
  }

  if (action === "close-candidate-filter-menu") {
    closeCandidateFilterMenu();
    await onStateChange();
    return true;
  }

  if (action === "clear-candidate-filter") {
    setCandidateFilterValues(actionTarget.dataset.filterKey || "", []);
    getCandidateTableState().filterMenuSearch = "";
    await onStateChangePreservingCandidateGridScroll();
    return true;
  }

  if (action === "download-candidates") {
    const rows = getFilteredCandidateRows(appState.candidates);

    if (!rows.length) {
      appState.candidates.errorMessage = "다운로드할 수험생 데이터가 없습니다.";
      showToast(appState.candidates.errorMessage, { tone: "warning" });
      await onStateChange();
      return true;
    }

    appState.candidates.downloadConfirm = {
      count: rows.length,
      isDownloading: false,
      isOpen: true,
    };
    await onStateChange();
    return true;
  }

  if (action === "cancel-candidate-download") {
    appState.candidates.downloadConfirm = {
      count: 0,
      isDownloading: false,
      isOpen: false,
    };
    await onStateChange();
    return true;
  }

  if (action === "confirm-candidate-download") {
    const rows = getFilteredCandidateRows(appState.candidates);

    if (!rows.length) {
      appState.candidates.downloadConfirm = {
        count: 0,
        isDownloading: false,
        isOpen: false,
      };
      appState.candidates.errorMessage = "다운로드할 수험생 데이터가 없습니다.";
      showToast(appState.candidates.errorMessage, { tone: "warning" });
      await onStateChange();
      return true;
    }

    appState.candidates.downloadConfirm = {
      count: rows.length,
      isDownloading: true,
      isOpen: true,
    };
    await onStateChange();

    try {
      triggerBlobDownload(
        await fetchBlob(
          "/api/candidates/export.xlsx",
          {
            body: JSON.stringify({ rows }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          },
          "수험생 데이터 XLSX를 다운로드할 수 없습니다.",
        ),
        "수험생 데이터.xlsx",
      );
      appState.candidates.errorMessage = "";
      appState.candidates.downloadConfirm = {
        count: 0,
        isDownloading: false,
        isOpen: false,
      };
    } catch (error) {
      appState.candidates.downloadConfirm = {
        count: rows.length,
        isDownloading: false,
        isOpen: true,
      };
      appState.candidates.errorMessage = error.message;
      showToast(appState.candidates.errorMessage, { tone: "error" });
    }

    await onStateChange();
    return true;
  }

  return false;
}
