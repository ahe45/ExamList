import { canUseAccess } from "../../app/access.js";
import { getActiveSchoolId } from "../../app/school-context.js";
import { bindCandidateEventHandlers } from "./candidate-event-bindings.js";
import { closeCandidateDetailModal, saveCandidateDetail } from "./candidate-detail-events.js";
import { createCandidateListActions } from "./candidate-list-actions.js";
import { createCandidateUploadActions } from "./candidate-upload-actions.js";
import { normalizeCandidateDraftRecord } from "./candidate-action-utils.js";

export function setupCandidateActions({ appState, onStateChange }) {
  function getCurrentSchoolId() {
    return getActiveSchoolId(appState);
  }

  function canManageCandidates() {
    return canUseAccess(appState.summary, "manageCandidates");
  }

  const {
    clampCandidatePage,
    closeCandidateFilterMenu,
    closeCandidatePageSizeMenu,
    getCandidateTableState,
    getVisibleCandidateFilterOptions,
    loadCandidates,
    onStateChangePreservingCandidateGridScroll,
    setCandidateFilterValues,
    toggleCandidateSort,
  } = createCandidateListActions({
    appState,
    getCurrentSchoolId,
    onStateChange,
  });

  const {
    closeCandidateUploadModal,
    isCandidateUploadDirty,
    previewPhotoArchiveFile,
    previewWorkbookFile,
    saveCandidateUploadAndClose,
    uploadSelectedCandidateFile,
  } = createCandidateUploadActions({
    appState,
    canManageCandidates,
    getCurrentSchoolId,
    loadCandidates,
    onStateChange,
  });

  function openCandidateDetail(candidateId) {
    const selectedRow = appState.candidates.items.find((item) => String(item.id || "") === String(candidateId || ""));

    if (!selectedRow) {
      return false;
    }

    appState.candidates.detail = {
      draftRecord: normalizeCandidateDraftRecord(selectedRow),
      isOpen: true,
      isPhotoUploading: false,
      isSaving: false,
      originalRecord: selectedRow,
      statusMessage: "",
      statusType: "",
    };
    return true;
  }

  const eventContext = {
    appState,
    canManageCandidates,
    clampCandidatePage,
    closeCandidateFilterMenu,
    closeCandidatePageSizeMenu,
    getCandidateTableState,
    getCurrentSchoolId,
    getVisibleCandidateFilterOptions,
    loadCandidates,
    onStateChange,
    onStateChangePreservingCandidateGridScroll,
    openCandidateDetail,
    previewPhotoArchiveFile,
    previewWorkbookFile,
    setCandidateFilterValues,
    toggleCandidateSort,
    uploadSelectedCandidateFile,
  };

  function getCandidateDetailSnapshot(record = {}) {
    return JSON.stringify(normalizeCandidateDraftRecord(record || {}));
  }

  function isCandidateDetailDirty() {
    const detail = appState.candidates.detail || {};

    if (!detail.isOpen || detail.isSaving || !detail.draftRecord || !detail.originalRecord) {
      return false;
    }

    return getCandidateDetailSnapshot(detail.draftRecord) !== getCandidateDetailSnapshot(detail.originalRecord);
  }

  bindCandidateEventHandlers(eventContext);
  return {
    closeCandidateDetailModal: () => closeCandidateDetailModal(eventContext),
    closeCandidateUploadModal,
    isCandidateDetailDirty,
    isCandidateUploadDirty,
    loadCandidates,
    saveCandidateDetailAndClose: () => saveCandidateDetail(eventContext, { closeOnSuccess: true }),
    saveCandidateUploadAndClose,
  };
}
