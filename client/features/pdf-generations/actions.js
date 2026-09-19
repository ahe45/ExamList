import { canUseAccess } from "../../app/access.js";
import { getActiveSchoolId } from "../../app/school-context.js";
import { createPdfGenerationActiveRunner } from "./pdf-generation-active-runner.js";
import { createPdfGenerationArtifactActions } from "./pdf-generation-artifact-actions.js";
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
  getDownloadModalState as ensureDownloadModalState,
  getGeneratedResultModalState as ensureGeneratedResultModalState,
  getPdfGenerationArtifactTableState as ensurePdfGenerationArtifactTableState,
  getPdfGenerationTableState as ensurePdfGenerationTableState,
  resetPdfGenerationTemplatePreview as resetTemplatePreviewState,
} from "./pdf-generation-state.js";

export function setupPdfGenerationActions({ appState, onStateChange }) {
  const getCreateModalState = () => ensureCreateModalState(appState);
  const getDeleteConfirmState = () => ensureDeleteConfirmState(appState);
  const getDownloadModalState = () => ensureDownloadModalState(appState);
  const getGeneratedResultModalState = () => ensureGeneratedResultModalState(appState);
  const getPdfGenerationArtifactTableState = () => ensurePdfGenerationArtifactTableState(appState);
  const getPdfGenerationTableState = () => ensurePdfGenerationTableState(appState);
  const resetPdfGenerationTemplatePreview = () => resetTemplatePreviewState(appState);

  function getCurrentSchoolId() {
    return getActiveSchoolId(appState);
  }

  function hasPermission(permissionKey) {
    return canUseAccess(appState.summary, permissionKey);
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
    getCurrentSchoolId,
    hasPermission,
    loadGenerations,
    onStateChange,
  });
  const {
    clampPdfGenerationArtifactPage,
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationArtifactPageSizeMenu,
    downloadPdfGenerationArtifact,
    getVisiblePdfGenerationArtifactFilterOptions,
    loadArtifacts,
    resetPdfGenerationActiveTab,
    setPdfGenerationArtifactFilterValues,
    setPdfGenerationActiveTab,
    togglePdfGenerationArtifactSort,
  } = createPdfGenerationArtifactActions({
    appState,
    getCurrentSchoolId,
    hasPermission,
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
    rerunSelectedGenerations,
  } = createPdfGenerationBatchActions({
    appState,
    getCurrentSchoolId,
    hasPermission,
    loadArtifacts,
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
    appState,
    cancelActivePdfGeneration,
    clampPdfAuditLogPage,
    clampPdfGenerationArtifactPage,
    clampPdfGenerationPage,
    cleanupExpiredGenerations,
    closePdfAuditLogPageSizeMenu,
    closePdfAuditLogFilterMenu,
    closePdfGenerationArtifactFilterMenu,
    closePdfGenerationArtifactPageSizeMenu,
    clearVisibleGenerationSelection,
    closePdfGenerationFilterMenu,
    closePdfGenerationPageSizeMenu,
    clearGenerationSelection,
    closePdfGenerationCreateModal,
    closePdfGenerationDeleteConfirm,
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    closePdfGenerationTemplatePreview,
    confirmPdfGenerationDelete,
    downloadPdfGenerationArtifact,
    downloadSelectedGenerationArchive,
    getPdfAuditLogTableState,
    getVisiblePdfAuditLogFilterOptions,
    getPdfGenerationArtifactTableState,
    getVisiblePdfGenerationArtifactFilterOptions,
    getPdfGenerationTableState,
    getVisiblePdfGenerationFilterOptions,
    loadAuditLogs,
    loadArtifacts,
    loadCreateModalOptions,
    loadGenerations,
    onStateChange,
    openPdfGenerationCreateModal,
    openPdfGenerationDeleteConfirm,
    openPdfGenerationDownloadModal,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    rerunSelectedGenerations,
    selectAllVisibleGenerations,
    setPdfAuditLogFilterValues,
    setPdfGenerationArtifactFilterValues,
    setPdfGenerationFilterValues,
    movePdfGenerationCreateStep,
    setPdfGenerationCreateStep,
    setPdfGenerationDownloadMode,
    setPdfGenerationActiveTab,
    setPdfGenerationGeneratedResultMode,
    submitPdfGenerationCreate,
    submitPdfGenerationDownload,
    submitPdfGenerationGeneratedResultDownload,
    toggleGenerationSelection,
    togglePdfGenerationArtifactSort,
    togglePdfAuditLogSort,
    togglePdfGenerationSort,
    updatePdfGenerationCreateFilter,
    updatePdfGenerationCreateTemplate,
  });
  return {
    cancelActivePdfGeneration,
    clampPdfAuditLogPage,
    clampPdfGenerationArtifactPage,
    clearVisibleGenerationSelection,
    closePdfGenerationCreateModal,
    closePdfGenerationDeleteConfirm,
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    closePdfGenerationTemplatePreview,
    confirmPdfGenerationDelete,
    downloadGeneratedBatchResult,
    downloadPdfGenerationArtifact,
    downloadSelectedGenerationArchive,
    cleanupExpiredGenerations,
    loadAuditLogs,
    loadArtifacts,
    loadGenerations,
    openPdfGenerationCreateModal,
    openPdfGenerationDeleteConfirm,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    resetPdfGenerationActiveTab,
    rerunSelectedGenerations,
  };
}
