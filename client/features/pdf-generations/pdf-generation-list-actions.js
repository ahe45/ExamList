import { getJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toQueryString } from "./pdf-generation-action-utils.js";
import { prepareGeneratedBatchResultModalState } from "./pdf-generation-auto-download.js";
import { setSelectedGenerationIds } from "./pdf-generation-selection-actions.js";
import {
  applyPdfGenerationSequenceNumbers,
  filterPdfGenerationFilterOptionValues,
  getFilteredPdfGenerationRows,
  getPdfGenerationFilterOptionValues,
} from "./pdf-generation-table-model.js";

const pdfGenerationListPageFetchLimit = 100;

export function createPdfGenerationListActions({
  appState,
  getCurrentSchoolId,
  getPdfGenerationTableState,
  hasPermission,
  onStateChange,
}) {
  let generationPollTimer = null;

  function clampPdfGenerationPage() {
    const tableState = getPdfGenerationTableState();
    const rows = getFilteredPdfGenerationRows(appState.pdfGenerations);
    const pageSize = Math.max(0, Number(tableState.pageSize) || 0);
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;

    tableState.page = pageSize > 0 ? Math.min(Math.max(1, Number(tableState.page) || 1), totalPages) : 1;
    return totalPages;
  }

  function closePdfGenerationFilterMenu() {
    const tableState = getPdfGenerationTableState();

    tableState.filterMenuKey = "";
    tableState.filterMenuPosition = null;
    tableState.filterMenuSearch = "";
  }

  function closePdfGenerationPageSizeMenu() {
    getPdfGenerationTableState().pageSizeMenuOpen = false;
  }

  function togglePdfGenerationSort(columnKey = "") {
    const tableState = getPdfGenerationTableState();
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

  function setPdfGenerationFilterValues(columnKey = "", values = []) {
    const tableState = getPdfGenerationTableState();
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
    clampPdfGenerationPage();
  }

  function getVisiblePdfGenerationFilterOptions(columnKey = "") {
    const tableState = getPdfGenerationTableState();

    return filterPdfGenerationFilterOptionValues(
      getPdfGenerationFilterOptionValues(appState.pdfGenerations, columnKey),
      tableState.filterMenuSearch,
    );
  }

  function scheduleGenerationRefreshIfNeeded() {
    if (appState.pdfGenerations.activeGeneration?.isOpen) {
      return;
    }

    const hasPendingGeneration = appState.pdfGenerations.items.some(
      (item) => item.status === "queued" || item.status === "running",
    );

    if (!hasPendingGeneration || generationPollTimer) {
      return;
    }

    generationPollTimer = window.setTimeout(async () => {
      generationPollTimer = null;
      await loadGenerations();
    }, 2500);
  }

  async function fetchGenerationListPage({ page = 1, schoolId = "" } = {}) {
    const queryString = toQueryString({
      ...appState.pdfGenerations.filters,
      limit: pdfGenerationListPageFetchLimit,
      page,
      schoolId,
    });

    return getJson(`/api/pdf-generations${queryString ? `?${queryString}` : ""}`);
  }

  async function fetchAllGenerationRows(schoolId = "") {
    const firstPayload = await fetchGenerationListPage({ page: 1, schoolId });
    const firstItems = Array.isArray(firstPayload.items) ? firstPayload.items : [];
    const total = Number(firstPayload.total) || firstItems.length;
    const pageLimit = Math.max(1, Number(firstPayload.limit) || pdfGenerationListPageFetchLimit);
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
        fetchGenerationListPage({ page: index + 2, schoolId }),
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

  async function loadGenerations(options = {}) {
    appState.pdfGenerations.loading = true;

    try {
      const payload = await fetchAllGenerationRows(getCurrentSchoolId());
      const generatedResultBatch = options.openGeneratedResultModalForBatch || null;

      appState.pdfGenerations.errorMessage = "";
      appState.pdfGenerations.archiveErrorMessage = "";
      appState.pdfGenerations.rerunErrorMessage = "";
      appState.pdfGenerations.items = applyPdfGenerationSequenceNumbers(payload.items || []);
      setSelectedGenerationIds(
        appState,
        appState.pdfGenerations.selectedGenerationIds.filter((generationId) =>
          appState.pdfGenerations.items.some(
            (item) => item.id === generationId && item.status === "completed",
          ),
        ),
      );
      appState.pdfGenerations.total = Number(payload.total) || 0;
      clampPdfGenerationPage();

      if (generatedResultBatch?.batchId) {
        prepareGeneratedBatchResultModalState({
          appState,
          batch: generatedResultBatch,
          batchId: generatedResultBatch.batchId,
          canDownload: hasPermission("downloadPdfs"),
          items: Array.isArray(generatedResultBatch.items) ? generatedResultBatch.items : null,
        });
      }
    } catch (error) {
      appState.pdfGenerations.archiveErrorMessage = "";
      appState.pdfGenerations.errorMessage = error.message;
      appState.pdfGenerations.items = [];
      appState.pdfGenerations.selectedGenerationIds = [];
      appState.pdfGenerations.total = 0;
      clampPdfGenerationPage();
      showToast(appState.pdfGenerations.errorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerations.loading = false;
      await onStateChange();
      scheduleGenerationRefreshIfNeeded();
    }
  }

  return {
    clampPdfGenerationPage,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getVisiblePdfGenerationFilterOptions,
    loadGenerations,
    setPdfGenerationFilterValues,
    togglePdfGenerationSort,
  };
}
