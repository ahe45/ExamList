import { getJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toQueryString, triggerDownload } from "./pdf-generation-action-utils.js";
import {
  filterPdfGenerationArtifactFilterOptionValues,
  getFilteredPdfGenerationArtifactRows,
  getPdfGenerationArtifactFilterOptionValues,
  getPdfGenerationArtifactTableState as getPdfGenerationArtifactTableStateSnapshot,
} from "./pdf-generation-artifact-table-model.js";

function normalizeArtifactTab(tab = "") {
  return tab === "artifacts" ? "artifacts" : "generations";
}

export function createPdfGenerationArtifactActions({
  appState,
  getCurrentSchoolId,
  hasPermission,
  onStateChange,
}) {
  function getPdfGenerationArtifactTableState() {
    appState.pdfGenerations.artifactTable = getPdfGenerationArtifactTableStateSnapshot(appState.pdfGenerations);
    return appState.pdfGenerations.artifactTable;
  }

  function clampPdfGenerationArtifactPage() {
    const tableState = getPdfGenerationArtifactTableState();
    const rows = getFilteredPdfGenerationArtifactRows(appState.pdfGenerations);
    const pageSize = Math.max(0, Number(tableState.pageSize) || 0);
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;

    tableState.page = pageSize > 0 ? Math.min(Math.max(1, Number(tableState.page) || 1), totalPages) : 1;
    return totalPages;
  }

  function closePdfGenerationArtifactFilterMenu() {
    const tableState = getPdfGenerationArtifactTableState();

    tableState.filterMenuKey = "";
    tableState.filterMenuPosition = null;
    tableState.filterMenuSearch = "";
  }

  function closePdfGenerationArtifactPageSizeMenu() {
    getPdfGenerationArtifactTableState().pageSizeMenuOpen = false;
  }

  function togglePdfGenerationArtifactSort(columnKey = "") {
    const tableState = getPdfGenerationArtifactTableState();
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

  function setPdfGenerationArtifactFilterValues(columnKey = "", values = []) {
    const tableState = getPdfGenerationArtifactTableState();
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
    clampPdfGenerationArtifactPage();
  }

  function getVisiblePdfGenerationArtifactFilterOptions(columnKey = "") {
    const tableState = getPdfGenerationArtifactTableState();

    return filterPdfGenerationArtifactFilterOptionValues(
      getPdfGenerationArtifactFilterOptionValues(appState.pdfGenerations, columnKey),
      tableState.filterMenuSearch,
    );
  }

  async function loadArtifacts() {
    if (!hasPermission("downloadPdfs")) {
      appState.pdfGenerations.artifactItems = [];
      appState.pdfGenerations.totalArtifacts = 0;
      appState.pdfGenerations.artifactErrorMessage = "";
      clampPdfGenerationArtifactPage();
      return;
    }

    appState.pdfGenerations.artifactLoading = true;

    try {
      const queryString = toQueryString({
        limit: 2000,
        schoolId: getCurrentSchoolId(),
      });
      const payload = await getJson(`/api/pdf-generations/artifacts${queryString ? `?${queryString}` : ""}`);

      appState.pdfGenerations.artifactErrorMessage = "";
      appState.pdfGenerations.artifactItems = Array.isArray(payload?.items) ? payload.items : [];
      appState.pdfGenerations.totalArtifacts = Number(payload?.total) || appState.pdfGenerations.artifactItems.length;
      clampPdfGenerationArtifactPage();
    } catch (error) {
      appState.pdfGenerations.artifactErrorMessage = error.message;
      appState.pdfGenerations.artifactItems = [];
      appState.pdfGenerations.totalArtifacts = 0;
      clampPdfGenerationArtifactPage();
      showToast(appState.pdfGenerations.artifactErrorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerations.artifactLoading = false;
      await onStateChange();
    }
  }

  async function setPdfGenerationActiveTab(tab = "") {
    const nextTab = normalizeArtifactTab(tab);

    appState.pdfGenerations.activeTab = nextTab;

    if (nextTab === "artifacts") {
      await loadArtifacts();
      return;
    }

    await onStateChange();
  }

  function resetPdfGenerationActiveTab() {
    appState.pdfGenerations.activeTab = "generations";
  }

  async function downloadPdfGenerationArtifact({ downloadUrl = "", fileName = "" } = {}) {
    const normalizedDownloadUrl = String(downloadUrl || "").trim();

    if (!hasPermission("downloadPdfs") || !normalizedDownloadUrl) {
      return;
    }

    triggerDownload(normalizedDownloadUrl, String(fileName || "").trim());
    showToast("파일 다운로드를 시작했습니다.");
  }

  return Object.freeze({
    clampPdfGenerationArtifactPage,
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationArtifactPageSizeMenu,
    downloadPdfGenerationArtifact,
    getPdfGenerationArtifactTableState,
    getVisiblePdfGenerationArtifactFilterOptions,
    loadArtifacts,
    resetPdfGenerationActiveTab,
    setPdfGenerationArtifactFilterValues,
    setPdfGenerationActiveTab,
    togglePdfGenerationArtifactSort,
  });
}
