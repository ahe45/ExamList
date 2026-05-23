import { hasAccess } from "../../app/access.js";
import { getJson } from "../../app/api-client.js";
import { getActiveSchoolId, getActiveSchoolRouteKey } from "../../app/school-context.js";
import { showToast } from "../../app/toast.js";
import { createPdfGenerationActiveRunner } from "./pdf-generation-active-runner.js";
import { createPdfGenerationAuditActions } from "./pdf-generation-audit-actions.js";
import { bindPdfGenerationEventHandlers } from "./pdf-generation-event-bindings.js";
import { createPdfGenerationBatchActions } from "./pdf-generation-batch-actions.js";
import { createPdfGenerationCreateModalActions } from "./pdf-generation-create-modal-actions.js";
import { createPdfGenerationDeleteActions } from "./pdf-generation-delete-actions.js";
import { createPdfGenerationDownloadActions } from "./pdf-generation-download-actions.js";
import { createPdfGenerationListActions } from "./pdf-generation-list-actions.js";
import { createPdfGenerationSelectionActions } from "./pdf-generation-selection-actions.js";
import { getFilteredPdfGenerationRows } from "./pdf-generation-table-model.js";
import {
  getCreateModalState as ensureCreateModalState,
  getDeleteConfirmState as ensureDeleteConfirmState,
  getDetailModalState as ensureDetailModalState,
  getDownloadModalState as ensureDownloadModalState,
  getGeneratedResultModalState as ensureGeneratedResultModalState,
  getPdfGenerationTableState as ensurePdfGenerationTableState,
  resetPdfGenerationTemplatePreview as resetTemplatePreviewState,
} from "./pdf-generation-state.js";

const appConfig = window.ExamListAppConfig;

export function setupPdfGenerationActions({ appState, navigateToPath, onStateChange }) {
  const getCreateModalState = () => ensureCreateModalState(appState);
  const getDeleteConfirmState = () => ensureDeleteConfirmState(appState);
  const getDetailModalState = () => ensureDetailModalState(appState);
  const getDownloadModalState = () => ensureDownloadModalState(appState);
  const getGeneratedResultModalState = () => ensureGeneratedResultModalState(appState);
  const getPdfGenerationTableState = () => ensurePdfGenerationTableState(appState);
  const resetPdfGenerationTemplatePreview = () => resetTemplatePreviewState(appState);

  function getCurrentSchoolId() {
    return getActiveSchoolId(appState);
  }

  function getCurrentSchoolRouteKey() {
    return getActiveSchoolRouteKey(appState);
  }

  function hasPermission(permissionKey) {
    return hasAccess(appState.summary, permissionKey);
  }

  const {
    clampPdfGenerationPage,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    getVisiblePdfGenerationFilterOptions,
    loadGenerations,
    setPdfGenerationFilterValues,
    togglePdfGenerationSort,
  } = createPdfGenerationListActions({
    appState,
    getCurrentSchoolId,
    getPdfGenerationTableState,
    hasPermission,
    onStateChange,
  });

  const {
    cleanupExpiredGenerations,
    clampPdfAuditLogPage,
    closePdfAuditLogFilterMenu,
    closePdfAuditLogPageSizeMenu,
    getPdfAuditLogTableState,
    getVisiblePdfAuditLogFilterOptions,
    loadAuditLogs,
    setPdfAuditLogFilterValues,
    togglePdfAuditLogSort,
  } = createPdfGenerationAuditActions({
    appState,
    hasPermission,
    loadGenerations,
    onStateChange,
  });

  const {
    cancelActivePdfGeneration,
    closeActiveGenerationOverlay,
    closePdfGenerationCreateModalAfterActiveGeneration,
    pollActiveGenerationBatch,
    scheduleActiveGenerationClock,
    updateActiveGenerationFromBatch,
    updateActiveGenerationOverlayDom,
  } = createPdfGenerationActiveRunner({
    appState,
    getCreateModalState,
    hasPermission,
    loadGenerations,
    onStateChange,
    resetPdfGenerationTemplatePreview,
  });

  const {
    closePdfGenerationCreateModal,
    closePdfGenerationTemplatePreview,
    loadCreateModalOptions,
    movePdfGenerationCreateStep,
    openPdfGenerationCreateModal,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    setPdfGenerationCreateStep,
    submitPdfGenerationCreate,
    updatePdfGenerationCreateFilter,
    updatePdfGenerationCreateTemplate,
  } = createPdfGenerationCreateModalActions({
    appState,
    closeActiveGenerationOverlay,
    closePdfGenerationCreateModalAfterActiveGeneration,
    getCreateModalState,
    getCurrentSchoolId,
    hasPermission,
    loadGenerations,
    onStateChange,
    pollActiveGenerationBatch,
    resetPdfGenerationTemplatePreview,
    scheduleActiveGenerationClock,
    updateActiveGenerationFromBatch,
    updateActiveGenerationOverlayDom,
  });

  async function openPdfGenerationDetailModal(generationId = "") {
    const normalizedGenerationId = String(generationId || "").trim();

    if (!normalizedGenerationId || !hasPermission("viewGenerations")) {
      return;
    }

    const modal = getDetailModalState();

    modal.generationId = normalizedGenerationId;
    modal.isOpen = true;
    appState.pdfGenerationDetail.errorMessage = "";
    appState.pdfGenerationDetail.item = null;
    appState.pdfGenerationDetail.loading = true;
    await onStateChange();
    await loadGenerationDetail(normalizedGenerationId);
  }

  async function closePdfGenerationDetailModal() {
    const modal = getDetailModalState();

    modal.generationId = "";
    modal.isOpen = false;
    await onStateChange();
  }

  async function loadGenerationDetail(generationId) {
    const normalizedGenerationId = String(generationId || "").trim();

    appState.pdfGenerationDetail.loading = true;

    if (!normalizedGenerationId) {
      appState.pdfGenerationDetail.errorMessage = "PDF 생성 이력 ID가 없습니다.";
      appState.pdfGenerationDetail.item = null;
      appState.pdfGenerationDetail.loading = false;
      showToast(appState.pdfGenerationDetail.errorMessage, { tone: "error" });
      await onStateChange();
      return;
    }

    try {
      const payload = await getJson(`/api/pdf-generations/${encodeURIComponent(normalizedGenerationId)}`);

      appState.pdfGenerationDetail.errorMessage = "";
      appState.pdfGenerationDetail.item = payload || null;
    } catch (error) {
      appState.pdfGenerationDetail.errorMessage = error.message;
      appState.pdfGenerationDetail.item = null;
      showToast(appState.pdfGenerationDetail.errorMessage, { tone: "error" });
    } finally {
      appState.pdfGenerationDetail.loading = false;
      await onStateChange();
    }
  }

  function openGenerationDetail(generationId) {
    const normalizedGenerationId = String(generationId || "").trim();
    const schoolId = getCurrentSchoolRouteKey();

    if (!normalizedGenerationId) {
      return;
    }

    navigateToPath(appConfig.getViewRoutePath("pdfGenerationDetail", { generationId: normalizedGenerationId, schoolId }));
  }

  const {
    clearGenerationSelection,
    clearVisibleGenerationSelection,
    selectAllVisibleGenerations,
    setRerunningGenerationIds,
    toggleGenerationSelection,
  } = createPdfGenerationSelectionActions({
    appState,
    getVisibleGenerationItems: () => getFilteredPdfGenerationRows(appState.pdfGenerations),
    onStateChange,
  });
  const {
    downloadGeneratedBatchResult,
    downloadSelectedGenerationArchive,
    rerunGeneration,
    rerunSelectedGenerations,
    retryGeneration,
  } = createPdfGenerationBatchActions({
    appState,
    getCurrentSchoolId,
    hasPermission,
    loadGenerations,
    onStateChange,
    setRerunningGenerationIds,
  });

  const {
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    openPdfGenerationDownloadModal,
    setPdfGenerationDownloadMode,
    setPdfGenerationGeneratedResultMode,
    submitPdfGenerationDownload,
    submitPdfGenerationGeneratedResultDownload,
  } = createPdfGenerationDownloadActions({
    appState,
    downloadGeneratedBatchResult,
    downloadSelectedGenerationArchive,
    getDownloadModalState,
    getGeneratedResultModalState,
    hasPermission,
    onStateChange,
  });

  const {
    closePdfGenerationDeleteConfirm,
    confirmPdfGenerationDelete,
    openPdfGenerationDeleteConfirm,
  } = createPdfGenerationDeleteActions({
    appState,
    getDeleteConfirmState,
    hasPermission,
    loadAuditLogs,
    loadGenerations,
    onStateChange,
  });

  bindPdfGenerationEventHandlers({
    appConfig,
    appState,
    cancelActivePdfGeneration,
    clampPdfAuditLogPage,
    clampPdfGenerationPage,
    cleanupExpiredGenerations,
    closePdfAuditLogPageSizeMenu,
    closePdfAuditLogFilterMenu,
    clearVisibleGenerationSelection,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    clearGenerationSelection,
    closePdfGenerationCreateModal,
    closePdfGenerationDeleteConfirm,
    closePdfGenerationDetailModal,
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    closePdfGenerationTemplatePreview,
    confirmPdfGenerationDelete,
    downloadSelectedGenerationArchive,
    getPdfAuditLogTableState,
    getVisiblePdfAuditLogFilterOptions,
    getPdfGenerationTableState,
    getVisiblePdfGenerationFilterOptions,
    getCurrentSchoolRouteKey,
    loadAuditLogs,
    loadCreateModalOptions,
    loadGenerationDetail,
    loadGenerations,
    navigateToPath,
    onStateChange,
    openPdfGenerationCreateModal,
    openPdfGenerationDeleteConfirm,
    openPdfGenerationDetailModal,
    openPdfGenerationDownloadModal,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    openGenerationDetail,
    rerunGeneration,
    rerunSelectedGenerations,
    retryGeneration,
    selectAllVisibleGenerations,
    setPdfAuditLogFilterValues,
    setPdfGenerationFilterValues,
    movePdfGenerationCreateStep,
    setPdfGenerationCreateStep,
    setPdfGenerationDownloadMode,
    setPdfGenerationGeneratedResultMode,
    submitPdfGenerationCreate,
    submitPdfGenerationDownload,
    submitPdfGenerationGeneratedResultDownload,
    toggleGenerationSelection,
    togglePdfAuditLogSort,
    togglePdfGenerationSort,
    updatePdfGenerationCreateFilter,
    updatePdfGenerationCreateTemplate,
  });
  return {
    cancelActivePdfGeneration,
    clampPdfAuditLogPage,
    clearVisibleGenerationSelection,
    closePdfGenerationCreateModal,
    closePdfGenerationDeleteConfirm,
    closePdfGenerationDetailModal,
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    closePdfGenerationTemplatePreview,
    confirmPdfGenerationDelete,
    downloadGeneratedBatchResult,
    downloadSelectedGenerationArchive,
    cleanupExpiredGenerations,
    loadAuditLogs,
    loadGenerationDetail,
    loadGenerations,
    openPdfGenerationCreateModal,
    openPdfGenerationDeleteConfirm,
    openPdfGenerationDetailModal,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    openGenerationDetail,
    rerunSelectedGenerations,
    rerunGeneration,
    retryGeneration,
  };
}
