import {
  clearWindowTextSelection,
  isInteractiveGenerationTarget,
  openPdfGenerationPrintWindow,
  resolvePdfGenerationFilterMenuPosition,
  restorePdfGenerationSearchFocus,
} from "./pdf-generation-event-utils.js";

export async function handlePdfGenerationListSubmit(event, context) {
  const { appState, loadGenerations } = context;

  if (!event.target.matches("[data-pdf-generation-filter-form]")) {
    return false;
  }

  event.preventDefault();
  const formData = new FormData(event.target);

  appState.pdfGenerations.filters = {
    generationUnit: String(formData.get("generationUnit") || ""),
    keyword: String(formData.get("keyword") || ""),
    status: String(formData.get("status") || ""),
  };
  await loadGenerations();
  return true;
}

export async function handlePdfGenerationListInput(event, context) {
  const { getPdfGenerationTableState, onStateChange } = context;

  if (!event.target.matches("[data-pdf-generation-filter-search-input]")) {
    return false;
  }

  const selectionStart = Number.isFinite(event.target.selectionStart) ? event.target.selectionStart : String(event.target.value || "").length;
  const selectionEnd = Number.isFinite(event.target.selectionEnd) ? event.target.selectionEnd : selectionStart;

  getPdfGenerationTableState().filterMenuSearch = event.target.value;
  await onStateChange();
  restorePdfGenerationSearchFocus("[data-pdf-generation-filter-search-input]", selectionStart, selectionEnd);
  return true;
}

export async function handlePdfGenerationListKeyDown(event, context) {
  const {
    appState,
    closePdfGenerationFilterMenu,
    getPdfGenerationTableState,
    onStateChange,
  } = context;

  if (event.key !== "Escape" || appState.currentView !== "pdfGenerationHistory" || !getPdfGenerationTableState().filterMenuKey) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  closePdfGenerationFilterMenu();
  await onStateChange();
  return true;
}

export function handlePdfGenerationListMouseDown(event, context) {
  const { appState } = context;

  if (!event.shiftKey || appState.currentView !== "pdfGenerationHistory") {
    return false;
  }

  if (!event.target.closest("[data-generation-row-id], [data-pdf-generation-select]")) {
    return false;
  }

  event.preventDefault();
  clearWindowTextSelection();
  return true;
}

export async function handlePdfGenerationListClick(event, context) {
  const {
    clampPdfGenerationPage,
    clearVisibleGenerationSelection,
    closePdfAuditLogFilterMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getPdfGenerationTableState,
    onStateChange,
    selectAllVisibleGenerations,
    toggleGenerationSelection,
    togglePdfGenerationSort,
  } = context;
  const rowSelectionTarget = event.target.closest("[data-pdf-generation-select]");

  if (rowSelectionTarget) {
    if (event.shiftKey) {
      event.preventDefault();
      clearWindowTextSelection();
    }

    await toggleGenerationSelection(
      rowSelectionTarget.dataset.generationId || "",
      rowSelectionTarget.checked,
      {
        ctrlKey: Boolean(event.ctrlKey || event.metaKey),
        shiftKey: Boolean(event.shiftKey),
      },
    );
    return true;
  }

  const selectAllTarget = event.target.closest("[data-pdf-generation-select-all]");

  if (selectAllTarget) {
    if (selectAllTarget.checked) {
      await selectAllVisibleGenerations();
    } else {
      await clearVisibleGenerationSelection();
    }
    return true;
  }

  const sortButton = event.target.closest("[data-pdf-generation-grid-sort]");

  if (sortButton) {
    togglePdfGenerationSort(sortButton.dataset.pdfGenerationGridSort || "");
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  const filterButton = event.target.closest("[data-pdf-generation-grid-filter]");

  if (filterButton) {
    const tableState = getPdfGenerationTableState();
    const nextFilterKey = filterButton.dataset.pdfGenerationGridFilter || "";
    const isClosingCurrentMenu = tableState.filterMenuKey === nextFilterKey;

    tableState.filterMenuKey = isClosingCurrentMenu ? "" : nextFilterKey;
    tableState.filterMenuPosition = isClosingCurrentMenu ? null : resolvePdfGenerationFilterMenuPosition(filterButton);
    tableState.filterMenuSearch = "";
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  if (event.target.closest("[data-pdf-generation-page-size-trigger]")) {
    event.preventDefault();
    const tableState = getPdfGenerationTableState();

    tableState.pageSizeMenuOpen = !tableState.pageSizeMenuOpen;
    closePdfGenerationFilterMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  const pageSizeOption = event.target.closest("[data-pdf-generation-page-size-option]");

  if (pageSizeOption) {
    event.preventDefault();
    const tableState = getPdfGenerationTableState();

    tableState.pageSize = Math.max(0, Number(pageSizeOption.dataset.pdfGenerationPageSizeOption) || 0);
    tableState.page = 1;
    tableState.pageSizeMenuOpen = false;
    clampPdfGenerationPage();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  const pageButton = event.target.closest("[data-pdf-generation-grid-page]");

  if (pageButton) {
    event.preventDefault();
    getPdfGenerationTableState().page = Math.max(1, Number(pageButton.dataset.pdfGenerationGridPage) || 1);
    closePdfGenerationFilterMenu();
    closePdfAuditLogFilterMenu();
    clampPdfGenerationPage();
    await onStateChange();
    return true;
  }

  const navButton = event.target.closest("[data-pdf-generation-grid-nav]");

  if (navButton) {
    event.preventDefault();

    if (navButton.disabled) {
      return true;
    }

    const navDirection = navButton.dataset.pdfGenerationGridNav;
    const direction = navDirection === "prev" || navDirection === "next" ? navDirection : "";

    if (!direction) {
      return true;
    }

    const tableState = getPdfGenerationTableState();
    const totalPages = clampPdfGenerationPage();
    const currentPage = Math.min(Math.max(1, Number(tableState.page) || 1), totalPages);

    tableState.page = direction === "prev" ? Math.max(1, currentPage - 1) : Math.min(totalPages, currentPage + 1);
    closePdfGenerationFilterMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  const actionTarget = event.target.closest("[data-action]");

  if (actionTarget) {
    return false;
  }

  const generationRow = event.target.closest("[data-generation-row-id]");

  if (generationRow && !isInteractiveGenerationTarget(event.target)) {
    if (event.shiftKey) {
      event.preventDefault();
      clearWindowTextSelection();
    }

    await toggleGenerationSelection(
      generationRow.dataset.generationRowId || "",
      !generationRow.classList.contains("is-selected"),
      {
        ctrlKey: Boolean(event.ctrlKey || event.metaKey),
        shiftKey: Boolean(event.shiftKey),
      },
    );
    return true;
  }

  return false;
}

export async function handlePdfGenerationListAction(actionTarget, action, context) {
  const {
    appConfig,
    appState,
    cancelActivePdfGeneration,
    clearGenerationSelection,
    closePdfAuditLogFilterMenu,
    closePdfGenerationDetailModal,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    downloadSelectedGenerationArchive,
    getCurrentSchoolRouteKey,
    getPdfGenerationTableState,
    loadGenerationDetail,
    loadGenerations,
    navigateToPath,
    onStateChange,
    openGenerationDetail,
    openPdfGenerationDetailModal,
    rerunGeneration,
    rerunSelectedGenerations,
    retryGeneration,
    selectAllVisibleGenerations,
    setPdfGenerationFilterValues,
  } = context;

  if (action === "refresh-pdf-generations") {
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await loadGenerations();
    return true;
  }

  if (action === "cancel-active-pdf-generation") {
    await cancelActivePdfGeneration();
    return true;
  }

  if (action === "close-pdf-generation-filter-menu") {
    closePdfGenerationFilterMenu();
    await onStateChange();
    return true;
  }

  if (action === "clear-pdf-generation-filter") {
    setPdfGenerationFilterValues(actionTarget.dataset.filterKey || "", []);
    getPdfGenerationTableState().filterMenuSearch = "";
    await onStateChange();
    return true;
  }

  if (action === "open-pdf-generation-detail-modal") {
    await openPdfGenerationDetailModal(actionTarget.dataset.generationId || "");
    return true;
  }

  if (action === "close-pdf-generation-detail-modal") {
    await closePdfGenerationDetailModal();
    return true;
  }

  if (action === "refresh-pdf-generation-detail") {
    await loadGenerationDetail(appState.route?.params?.generationId || appState.pdfGenerationDetail.item?.id || "");
    return true;
  }

  if (action === "select-all-pdf-generations") {
    selectAllVisibleGenerations();
    return true;
  }

  if (action === "clear-pdf-generations-selection") {
    clearGenerationSelection();
    return true;
  }

  if (action === "download-selected-pdf-generations") {
    await downloadSelectedGenerationArchive();
    return true;
  }

  if (action === "print-pdf-generation") {
    openPdfGenerationPrintWindow(actionTarget.dataset.printUrl || "");
    return true;
  }

  if (action === "rerun-selected-pdf-generations") {
    await rerunSelectedGenerations();
    return true;
  }

  if (action === "rerun-pdf-generation") {
    await rerunGeneration(actionTarget.dataset.generationId || "");
    return true;
  }

  if (action === "retry-pdf-generation") {
    await retryGeneration(actionTarget.dataset.generationId || "");
    return true;
  }

  if (action === "open-generation-detail") {
    openGenerationDetail(actionTarget.dataset.generationId || "");
    return true;
  }

  if (action === "back-to-pdf-generations") {
    navigateToPath(appConfig.getViewRoutePath("pdfGenerationHistory", {
      schoolId: getCurrentSchoolRouteKey(),
    }));
    return true;
  }

  if (action === "open-generation-template") {
    const templateId = String(actionTarget.dataset.templateId || "").trim();

    if (!templateId) {
      return true;
    }

    appState.ui.activeTemplateId = templateId;
    navigateToPath(appConfig.getViewRoutePath("templateEditor", { schoolId: getCurrentSchoolRouteKey(), templateId }));
    return true;
  }

  return false;
}

export async function handlePdfGenerationListChange(event, context) {
  const {
    clampPdfGenerationPage,
    closePdfAuditLogFilterMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getPdfGenerationTableState,
    getVisiblePdfGenerationFilterOptions,
    onStateChange,
    setPdfGenerationFilterValues,
  } = context;
  const pagePicker = event.target.closest("[data-pdf-generation-grid-page-picker]");

  if (pagePicker) {
    getPdfGenerationTableState().page = Math.max(1, Number(pagePicker.value) || 1);
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    clampPdfGenerationPage();
    await onStateChange();
    return true;
  }

  const filterOption = event.target.closest("[data-pdf-generation-filter-option]");

  if (filterOption) {
    const columnKey = filterOption.dataset.filterKey || "";
    const filterValue = filterOption.dataset.filterValue || "";
    const currentValues = getPdfGenerationTableState().filters?.[columnKey] || [];
    const nextValues = filterOption.checked
      ? [...currentValues, filterValue]
      : currentValues.filter((value) => String(value || "") !== filterValue);

    setPdfGenerationFilterValues(columnKey, nextValues);
    await onStateChange();
    return true;
  }

  const filterSelectAll = event.target.closest("[data-pdf-generation-filter-select-all]");

  if (filterSelectAll) {
    const columnKey = filterSelectAll.dataset.filterKey || "";
    const visibleOptions = getVisiblePdfGenerationFilterOptions(columnKey);
    const currentValues = getPdfGenerationTableState().filters?.[columnKey] || [];
    const visibleOptionSet = new Set(visibleOptions.map((value) => String(value || "")));
    const nextValues = filterSelectAll.checked
      ? Array.from(new Set([...currentValues, ...visibleOptions]))
      : currentValues.filter((value) => !visibleOptionSet.has(String(value || "")));

    setPdfGenerationFilterValues(columnKey, nextValues);
    await onStateChange();
    return true;
  }

  if (event.target.closest("[data-pdf-generation-select]")) {
    return true;
  }

  return false;
}
