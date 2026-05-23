import {
  resolvePdfGenerationFilterMenuPosition,
  restorePdfGenerationSearchFocus,
} from "./pdf-generation-event-utils.js";

export async function handlePdfAuditLogInput(event, context) {
  const { getPdfAuditLogTableState, onStateChange } = context;

  if (!event.target.matches("[data-pdf-audit-filter-search-input]")) {
    return false;
  }

  const selectionStart = Number.isFinite(event.target.selectionStart) ? event.target.selectionStart : String(event.target.value || "").length;
  const selectionEnd = Number.isFinite(event.target.selectionEnd) ? event.target.selectionEnd : selectionStart;

  getPdfAuditLogTableState().filterMenuSearch = event.target.value;
  await onStateChange();
  restorePdfGenerationSearchFocus("[data-pdf-audit-filter-search-input]", selectionStart, selectionEnd);
  return true;
}

export async function handlePdfAuditLogKeyDown(event, context) {
  const {
    appState,
    closePdfAuditLogFilterMenu,
    getPdfAuditLogTableState,
    onStateChange,
  } = context;

  if (event.key !== "Escape" || appState.currentView !== "pdfHistoryManagement" || !getPdfAuditLogTableState().filterMenuKey) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  closePdfAuditLogFilterMenu();
  await onStateChange();
  return true;
}

export async function handlePdfAuditLogClick(event, context) {
  const {
    clampPdfAuditLogPage,
    closePdfAuditLogFilterMenu,
    closePdfAuditLogPageSizeMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getPdfAuditLogTableState,
    onStateChange,
    togglePdfAuditLogSort,
  } = context;
  const auditSortButton = event.target.closest("[data-pdf-audit-grid-sort]");

  if (auditSortButton) {
    togglePdfAuditLogSort(auditSortButton.dataset.pdfAuditGridSort || "");
    closePdfAuditLogFilterMenu();
    closePdfAuditLogPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await onStateChange();
    return true;
  }

  const auditFilterButton = event.target.closest("[data-pdf-audit-grid-filter]");

  if (auditFilterButton) {
    const tableState = getPdfAuditLogTableState();
    const nextFilterKey = auditFilterButton.dataset.pdfAuditGridFilter || "";
    const isClosingCurrentMenu = tableState.filterMenuKey === nextFilterKey;

    tableState.filterMenuKey = isClosingCurrentMenu ? "" : nextFilterKey;
    tableState.filterMenuPosition = isClosingCurrentMenu ? null : resolvePdfGenerationFilterMenuPosition(auditFilterButton);
    tableState.filterMenuSearch = "";
    closePdfAuditLogPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await onStateChange();
    return true;
  }

  if (event.target.closest("[data-pdf-audit-page-size-trigger]")) {
    event.preventDefault();
    const tableState = getPdfAuditLogTableState();

    tableState.pageSizeMenuOpen = !tableState.pageSizeMenuOpen;
    closePdfAuditLogFilterMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await onStateChange();
    return true;
  }

  const auditPageSizeOption = event.target.closest("[data-pdf-audit-page-size-option]");

  if (auditPageSizeOption) {
    event.preventDefault();
    const tableState = getPdfAuditLogTableState();

    tableState.pageSize = Math.max(0, Number(auditPageSizeOption.dataset.pdfAuditPageSizeOption) || 0);
    tableState.page = 1;
    tableState.pageSizeMenuOpen = false;
    closePdfAuditLogFilterMenu();
    clampPdfAuditLogPage();
    await onStateChange();
    return true;
  }

  const auditPageButton = event.target.closest("[data-pdf-audit-grid-page]");

  if (auditPageButton) {
    event.preventDefault();
    getPdfAuditLogTableState().page = Math.max(1, Number(auditPageButton.dataset.pdfAuditGridPage) || 1);
    closePdfAuditLogFilterMenu();
    closePdfAuditLogPageSizeMenu();
    clampPdfAuditLogPage();
    await onStateChange();
    return true;
  }

  const auditNavButton = event.target.closest("[data-pdf-audit-grid-nav]");

  if (auditNavButton) {
    event.preventDefault();

    if (auditNavButton.disabled) {
      return true;
    }

    const navDirection = auditNavButton.dataset.pdfAuditGridNav;
    const direction = navDirection === "prev" || navDirection === "next" ? navDirection : "";

    if (!direction) {
      return true;
    }

    const tableState = getPdfAuditLogTableState();
    const totalPages = clampPdfAuditLogPage();
    const currentPage = Math.min(Math.max(1, Number(tableState.page) || 1), totalPages);

    tableState.page = direction === "prev" ? Math.max(1, currentPage - 1) : Math.min(totalPages, currentPage + 1);
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  return false;
}

export async function handlePdfAuditLogAction(_actionTarget, action, context) {
  const {
    cleanupExpiredGenerations,
    closePdfAuditLogFilterMenu,
    closePdfAuditLogPageSizeMenu,
    getPdfAuditLogTableState,
    loadAuditLogs,
    onStateChange,
    setPdfAuditLogFilterValues,
  } = context;

  if (action === "close-pdf-audit-filter-menu") {
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  if (action === "clear-pdf-audit-filter") {
    setPdfAuditLogFilterValues(_actionTarget.dataset.filterKey || "", []);
    getPdfAuditLogTableState().filterMenuSearch = "";
    await onStateChange();
    return true;
  }

  if (action === "refresh-pdf-audit-logs") {
    closePdfAuditLogFilterMenu();
    closePdfAuditLogPageSizeMenu();
    await loadAuditLogs();
    return true;
  }

  if (action === "cleanup-expired-pdf-generations") {
    await cleanupExpiredGenerations();
    return true;
  }

  return false;
}

export async function handlePdfAuditLogChange(event, context) {
  const {
    clampPdfAuditLogPage,
    closePdfAuditLogFilterMenu,
    closePdfAuditLogPageSizeMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getPdfAuditLogTableState,
    getVisiblePdfAuditLogFilterOptions,
    onStateChange,
    setPdfAuditLogFilterValues,
  } = context;
  const auditPagePicker = event.target.closest("[data-pdf-audit-grid-page-picker]");

  if (auditPagePicker) {
    getPdfAuditLogTableState().page = Math.max(1, Number(auditPagePicker.value) || 1);
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    closePdfAuditLogPageSizeMenu();
    clampPdfAuditLogPage();
    await onStateChange();
    return true;
  }

  const auditFilterOption = event.target.closest("[data-pdf-audit-filter-option]");

  if (auditFilterOption) {
    const columnKey = auditFilterOption.dataset.filterKey || "";
    const filterValue = auditFilterOption.dataset.filterValue || "";
    const currentValues = getPdfAuditLogTableState().filters?.[columnKey] || [];
    const nextValues = auditFilterOption.checked
      ? [...currentValues, filterValue]
      : currentValues.filter((value) => String(value || "") !== filterValue);

    setPdfAuditLogFilterValues(columnKey, nextValues);
    await onStateChange();
    return true;
  }

  const auditFilterSelectAll = event.target.closest("[data-pdf-audit-filter-select-all]");

  if (auditFilterSelectAll) {
    const columnKey = auditFilterSelectAll.dataset.filterKey || "";
    const visibleOptions = getVisiblePdfAuditLogFilterOptions(columnKey);
    const currentValues = getPdfAuditLogTableState().filters?.[columnKey] || [];
    const visibleOptionSet = new Set(visibleOptions.map((value) => String(value || "")));
    const nextValues = auditFilterSelectAll.checked
      ? Array.from(new Set([...currentValues, ...visibleOptions]))
      : currentValues.filter((value) => !visibleOptionSet.has(String(value || "")));

    setPdfAuditLogFilterValues(columnKey, nextValues);
    await onStateChange();
    return true;
  }

  return false;
}
