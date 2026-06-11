import {
  handleGridFilterSearchCompositionEnd,
  handleGridFilterSearchInput,
  markGridFilterSearchCompositionStart,
} from "../../app/grid-filter-search-events.js";
import {
  clearWindowTextSelection,
  isInteractiveGenerationTarget,
  openPdfGenerationPrintWindow,
  resolvePdfGenerationFilterMenuPosition,
} from "./pdf-generation-event-utils.js";
import {
  renderPdfGenerationFilterOptions,
  renderPdfGenerationFilterSelectAll,
} from "./pdf-generation-table-renderer.js";
import {
  renderPdfGenerationArtifactFilterOptions,
  renderPdfGenerationArtifactFilterSelectAll,
} from "./pdf-generation-artifact-table-renderer.js";

const pdfGenerationFilterSearchInputSelector = "[data-pdf-generation-filter-search-input]";
const pdfGenerationArtifactFilterSearchInputSelector = "[data-pdf-generation-artifact-filter-search-input]";

function refreshPdfGenerationFilterMenuOptions(context) {
  if (typeof document === "undefined") {
    return false;
  }

  const tableState = context.getPdfGenerationTableState();
  const columnKey = String(tableState.filterMenuKey || "");
  const menuElement = document.querySelector(".pdf-generation-filter-menu");
  const selectAllElement = menuElement?.querySelector?.(".table-filter-select-all") || null;
  const optionListElement = menuElement?.querySelector?.(".table-filter-option-list") || null;

  if (!columnKey || !selectAllElement || !optionListElement || typeof context.getVisiblePdfGenerationFilterOptions !== "function") {
    return false;
  }

  const visibleOptionValues = context.getVisiblePdfGenerationFilterOptions(columnKey);
  const selectedValues = new Set((tableState.filters?.[columnKey] || []).map((value) => String(value || "")));
  const isAllVisibleSelected =
    visibleOptionValues.length > 0 && visibleOptionValues.every((value) => selectedValues.has(String(value || "")));

  selectAllElement.innerHTML = renderPdfGenerationFilterSelectAll(columnKey, isAllVisibleSelected);
  optionListElement.innerHTML = renderPdfGenerationFilterOptions(columnKey, visibleOptionValues, selectedValues);
  return true;
}

function refreshPdfGenerationArtifactFilterMenuOptions(context) {
  if (typeof document === "undefined") {
    return false;
  }

  const tableState = context.getPdfGenerationArtifactTableState();
  const columnKey = String(tableState.filterMenuKey || "");
  const menuElement = document.querySelector(".pdf-generation-artifact-filter-menu");
  const selectAllElement = menuElement?.querySelector?.(".table-filter-select-all") || null;
  const optionListElement = menuElement?.querySelector?.(".table-filter-option-list") || null;

  if (!columnKey || !selectAllElement || !optionListElement || typeof context.getVisiblePdfGenerationArtifactFilterOptions !== "function") {
    return false;
  }

  const visibleOptionValues = context.getVisiblePdfGenerationArtifactFilterOptions(columnKey);
  const selectedValues = new Set((tableState.filters?.[columnKey] || []).map((value) => String(value || "")));
  const isAllVisibleSelected =
    visibleOptionValues.length > 0 && visibleOptionValues.every((value) => selectedValues.has(String(value || "")));

  selectAllElement.innerHTML = renderPdfGenerationArtifactFilterSelectAll(columnKey, isAllVisibleSelected);
  optionListElement.innerHTML = renderPdfGenerationArtifactFilterOptions(columnKey, visibleOptionValues, selectedValues);
  return true;
}

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
  if (await handleGridFilterSearchInput(event, {
    getTableState: context.getPdfGenerationTableState,
    onStateChange: context.onStateChange,
    refreshFilterMenu: () => refreshPdfGenerationFilterMenuOptions(context),
    selector: pdfGenerationFilterSearchInputSelector,
  })) {
    return true;
  }

  return handleGridFilterSearchInput(event, {
    getTableState: context.getPdfGenerationArtifactTableState,
    onStateChange: context.onStateChange,
    refreshFilterMenu: () => refreshPdfGenerationArtifactFilterMenuOptions(context),
    selector: pdfGenerationArtifactFilterSearchInputSelector,
  });
}

export function handlePdfGenerationListCompositionStart(event) {
  return markGridFilterSearchCompositionStart(event, pdfGenerationFilterSearchInputSelector) ||
    markGridFilterSearchCompositionStart(event, pdfGenerationArtifactFilterSearchInputSelector);
}

export async function handlePdfGenerationListCompositionEnd(event, context) {
  if (await handleGridFilterSearchCompositionEnd(event, {
    getTableState: context.getPdfGenerationTableState,
    onStateChange: context.onStateChange,
    refreshFilterMenu: () => refreshPdfGenerationFilterMenuOptions(context),
    selector: pdfGenerationFilterSearchInputSelector,
  })) {
    return true;
  }

  return handleGridFilterSearchCompositionEnd(event, {
    getTableState: context.getPdfGenerationArtifactTableState,
    onStateChange: context.onStateChange,
    refreshFilterMenu: () => refreshPdfGenerationArtifactFilterMenuOptions(context),
    selector: pdfGenerationArtifactFilterSearchInputSelector,
  });
}

export async function handlePdfGenerationListKeyDown(event, context) {
  const {
    appState,
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationFilterMenu,
    getPdfGenerationArtifactTableState,
    getPdfGenerationTableState,
    onStateChange,
  } = context;

  if (event.key !== "Escape" || appState.currentView !== "pdfGenerationHistory") {
    return false;
  }

  const generationFilterMenuKey = getPdfGenerationTableState().filterMenuKey;
  const artifactFilterMenuKey = getPdfGenerationArtifactTableState().filterMenuKey;

  if (!generationFilterMenuKey && !artifactFilterMenuKey) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  closePdfGenerationFilterMenu();
  closePdfGenerationArtifactFilterMenu();
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
    clampPdfGenerationArtifactPage,
    clampPdfGenerationPage,
    clearVisibleGenerationSelection,
    closePdfAuditLogFilterMenu,
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationArtifactPageSizeMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getPdfGenerationArtifactTableState,
    getPdfGenerationTableState,
    onStateChange,
    selectAllVisibleGenerations,
    togglePdfGenerationArtifactSort,
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
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
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
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  if (event.target.closest("[data-pdf-generation-page-size-trigger]")) {
    event.preventDefault();
    const tableState = getPdfGenerationTableState();

    tableState.pageSizeMenuOpen = !tableState.pageSizeMenuOpen;
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
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
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
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
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
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
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    await onStateChange();
    return true;
  }

  const artifactSortButton = event.target.closest("[data-pdf-generation-artifact-grid-sort]");

  if (artifactSortButton) {
    togglePdfGenerationArtifactSort(artifactSortButton.dataset.pdfGenerationArtifactGridSort || "");
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  const artifactFilterButton = event.target.closest("[data-pdf-generation-artifact-grid-filter]");

  if (artifactFilterButton) {
    const tableState = getPdfGenerationArtifactTableState();
    const nextFilterKey = artifactFilterButton.dataset.pdfGenerationArtifactGridFilter || "";
    const isClosingCurrentMenu = tableState.filterMenuKey === nextFilterKey;

    tableState.filterMenuKey = isClosingCurrentMenu ? "" : nextFilterKey;
    tableState.filterMenuPosition = isClosingCurrentMenu ? null : resolvePdfGenerationFilterMenuPosition(artifactFilterButton);
    tableState.filterMenuSearch = "";
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  if (event.target.closest("[data-pdf-generation-artifact-page-size-trigger]")) {
    event.preventDefault();
    const tableState = getPdfGenerationArtifactTableState();

    tableState.pageSizeMenuOpen = !tableState.pageSizeMenuOpen;
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    await onStateChange();
    return true;
  }

  const artifactPageSizeOption = event.target.closest("[data-pdf-generation-artifact-page-size-option]");

  if (artifactPageSizeOption) {
    event.preventDefault();
    const tableState = getPdfGenerationArtifactTableState();

    tableState.pageSize = Math.max(0, Number(artifactPageSizeOption.dataset.pdfGenerationArtifactPageSizeOption) || 0);
    tableState.page = 1;
    tableState.pageSizeMenuOpen = false;
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    clampPdfGenerationArtifactPage();
    await onStateChange();
    return true;
  }

  const artifactPageButton = event.target.closest("[data-pdf-generation-artifact-grid-page]");

  if (artifactPageButton) {
    event.preventDefault();
    getPdfGenerationArtifactTableState().page = Math.max(1, Number(artifactPageButton.dataset.pdfGenerationArtifactGridPage) || 1);
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    clampPdfGenerationArtifactPage();
    await onStateChange();
    return true;
  }

  const artifactNavButton = event.target.closest("[data-pdf-generation-artifact-grid-nav]");

  if (artifactNavButton) {
    event.preventDefault();

    if (artifactNavButton.disabled) {
      return true;
    }

    const navDirection = artifactNavButton.dataset.pdfGenerationArtifactGridNav;
    const direction = navDirection === "prev" || navDirection === "next" ? navDirection : "";

    if (!direction) {
      return true;
    }

    const tableState = getPdfGenerationArtifactTableState();
    const totalPages = clampPdfGenerationArtifactPage();
    const currentPage = Math.min(Math.max(1, Number(tableState.page) || 1), totalPages);

    tableState.page = direction === "prev" ? Math.max(1, currentPage - 1) : Math.min(totalPages, currentPage + 1);
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
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
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationArtifactPageSizeMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    downloadPdfGenerationArtifact,
    downloadSelectedGenerationArchive,
    getCurrentSchoolRouteKey,
    getPdfGenerationArtifactTableState,
    getPdfGenerationTableState,
    loadGenerationDetail,
    loadArtifacts,
    loadGenerations,
    navigateToPath,
    onStateChange,
    openGenerationDetail,
    openPdfGenerationDetailModal,
    rerunGeneration,
    rerunSelectedGenerations,
    retryGeneration,
    selectAllVisibleGenerations,
    setPdfGenerationArtifactFilterValues,
    setPdfGenerationActiveTab,
    setPdfGenerationFilterValues,
  } = context;

  if (action === "refresh-pdf-generations") {
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await loadGenerations();
    return true;
  }

  if (action === "refresh-pdf-generation-artifacts") {
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await loadArtifacts();
    return true;
  }

  if (action === "set-pdf-generation-tab") {
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    await setPdfGenerationActiveTab(actionTarget.dataset.pdfGenerationTab || "");
    return true;
  }

  if (action === "download-pdf-generation-artifact") {
    await downloadPdfGenerationArtifact({
      downloadUrl: actionTarget.dataset.downloadUrl || "",
      fileName: actionTarget.dataset.fileName || "",
    });
    return true;
  }

  if (action === "cancel-active-pdf-generation") {
    await cancelActivePdfGeneration();
    return true;
  }

  if (action === "close-pdf-generation-artifact-filter-menu") {
    closePdfGenerationArtifactFilterMenu();
    await onStateChange();
    return true;
  }

  if (action === "clear-pdf-generation-artifact-filter") {
    setPdfGenerationArtifactFilterValues(actionTarget.dataset.filterKey || "", []);
    getPdfGenerationArtifactTableState().filterMenuSearch = "";
    await onStateChange();
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
    clampPdfGenerationArtifactPage,
    clampPdfGenerationPage,
    closePdfAuditLogFilterMenu,
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationArtifactPageSizeMenu,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getPdfGenerationArtifactTableState,
    getPdfGenerationTableState,
    getVisiblePdfGenerationArtifactFilterOptions,
    getVisiblePdfGenerationFilterOptions,
    onStateChange,
    setPdfGenerationArtifactFilterValues,
    setPdfGenerationFilterValues,
  } = context;
  const artifactPagePicker = event.target.closest("[data-pdf-generation-artifact-grid-page-picker]");

  if (artifactPagePicker) {
    getPdfGenerationArtifactTableState().page = Math.max(1, Number(artifactPagePicker.value) || 1);
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
    closePdfGenerationFilterMenu();
    closePdfGenerationPageSizeMenu();
    closePdfAuditLogFilterMenu();
    clampPdfGenerationArtifactPage();
    await onStateChange();
    return true;
  }

  const artifactFilterOption = event.target.closest("[data-pdf-generation-artifact-filter-option]");

  if (artifactFilterOption) {
    const columnKey = artifactFilterOption.dataset.filterKey || "";
    const filterValue = artifactFilterOption.dataset.filterValue || "";
    const currentValues = getPdfGenerationArtifactTableState().filters?.[columnKey] || [];
    const nextValues = artifactFilterOption.checked
      ? [...currentValues, filterValue]
      : currentValues.filter((value) => String(value || "") !== filterValue);

    setPdfGenerationArtifactFilterValues(columnKey, nextValues);
    await onStateChange();
    return true;
  }

  const artifactFilterSelectAll = event.target.closest("[data-pdf-generation-artifact-filter-select-all]");

  if (artifactFilterSelectAll) {
    const columnKey = artifactFilterSelectAll.dataset.filterKey || "";
    const visibleOptions = getVisiblePdfGenerationArtifactFilterOptions(columnKey);
    const currentValues = getPdfGenerationArtifactTableState().filters?.[columnKey] || [];
    const visibleOptionSet = new Set(visibleOptions.map((value) => String(value || "")));
    const nextValues = artifactFilterSelectAll.checked
      ? Array.from(new Set([...currentValues, ...visibleOptions]))
      : currentValues.filter((value) => !visibleOptionSet.has(String(value || "")));

    setPdfGenerationArtifactFilterValues(columnKey, nextValues);
    await onStateChange();
    return true;
  }

  const pagePicker = event.target.closest("[data-pdf-generation-grid-page-picker]");

  if (pagePicker) {
    getPdfGenerationTableState().page = Math.max(1, Number(pagePicker.value) || 1);
    closePdfGenerationArtifactFilterMenu();
    closePdfGenerationArtifactPageSizeMenu();
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
