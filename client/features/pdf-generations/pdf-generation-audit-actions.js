import { getJson, postJson } from "../../app/api-client.js";
import { formatCount } from "../../app/number-format.js";
import { showToast } from "../../app/toast.js";
import {
  filterPdfAuditLogFilterOptionValues,
  getPdfAuditLogFilterOptionValues,
  getPdfAuditLogTableState as getPdfAuditTableStateSnapshot,
  getPdfAuditLogVisibleRows,
} from "./pdf-generation-audit-log-model.js";

export function createPdfGenerationAuditActions({
  appState,
  hasPermission,
  loadGenerations,
  onStateChange,
}) {
  function getPdfAuditLogTableState() {
    appState.pdfGenerations.auditTable = getPdfAuditTableStateSnapshot(appState.pdfGenerations);
    return appState.pdfGenerations.auditTable;
  }

  function clampPdfAuditLogPage() {
    const tableState = getPdfAuditLogTableState();
    const { totalPages } = getPdfAuditLogVisibleRows(appState.pdfGenerations);

    tableState.page = Math.min(Math.max(1, Number(tableState.page) || 1), totalPages);
    return totalPages;
  }

  function closePdfAuditLogPageSizeMenu() {
    getPdfAuditLogTableState().pageSizeMenuOpen = false;
  }

  function closePdfAuditLogFilterMenu() {
    const tableState = getPdfAuditLogTableState();

    tableState.filterMenuKey = "";
    tableState.filterMenuPosition = null;
    tableState.filterMenuSearch = "";
  }

  function togglePdfAuditLogSort(columnKey = "") {
    const tableState = getPdfAuditLogTableState();
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

  function setPdfAuditLogFilterValues(columnKey = "", values = []) {
    const tableState = getPdfAuditLogTableState();
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
    clampPdfAuditLogPage();
  }

  function getVisiblePdfAuditLogFilterOptions(columnKey = "") {
    const tableState = getPdfAuditLogTableState();

    return filterPdfAuditLogFilterOptionValues(
      getPdfAuditLogFilterOptionValues(appState.pdfGenerations, columnKey),
      tableState.filterMenuSearch,
    );
  }

  async function loadAuditLogs() {
    appState.pdfGenerations.auditLoading = true;

    try {
      const payload = await getJson("/api/pdf-generations/audit-logs?limit=2000");

      appState.pdfGenerations.auditErrorMessage = "";
      appState.pdfGenerations.auditLogs = Array.isArray(payload?.items) ? payload.items : [];
      appState.pdfGenerations.totalAuditLogs = Number(payload?.total) || appState.pdfGenerations.auditLogs.length;
      clampPdfAuditLogPage();
    } catch (error) {
      appState.pdfGenerations.auditErrorMessage = error.message;
      appState.pdfGenerations.auditLogs = [];
      appState.pdfGenerations.totalAuditLogs = 0;
      clampPdfAuditLogPage();
      showToast(appState.pdfGenerations.auditErrorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerations.auditLoading = false;
      await onStateChange();
    }
  }

  async function cleanupExpiredGenerations() {
    if (!hasPermission("generatePdfs")) {
      return;
    }

    appState.pdfGenerations.cleanupErrorMessage = "";
    appState.pdfGenerations.cleanupResult = null;
    appState.pdfGenerations.isCleaningRetention = true;
    await onStateChange();

    try {
      const payload = await postJson("/api/pdf-generations/retention/cleanup", {});

      appState.pdfGenerations.cleanupErrorMessage = "";
      appState.pdfGenerations.cleanupResult = payload || null;
      showToast(`만료 PDF 파일 ${formatCount(payload?.purgedCount)}건을 정리했습니다.`);
      await loadGenerations();
      await loadAuditLogs();
    } catch (error) {
      appState.pdfGenerations.cleanupErrorMessage = error.message;
      showToast(appState.pdfGenerations.cleanupErrorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerations.isCleaningRetention = false;
      await onStateChange();
    }
  }

  return {
    cleanupExpiredGenerations,
    clampPdfAuditLogPage,
    closePdfAuditLogFilterMenu,
    closePdfAuditLogPageSizeMenu,
    getPdfAuditLogTableState,
    getVisiblePdfAuditLogFilterOptions,
    loadAuditLogs,
    setPdfAuditLogFilterValues,
    togglePdfAuditLogSort,
  };
}
