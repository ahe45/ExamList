import { createCandidatePhotoArchivePreviewActions } from "./candidate-photo-archive-preview-actions.js";
import { createCandidateUploadProgressActions } from "./candidate-upload-progress.js";
import { createCandidateUploadSubmitActions } from "./candidate-upload-submit-actions.js";
import { createCandidateWorkbookPreviewActions } from "./candidate-workbook-preview-actions.js";

export function createCandidateUploadActions({
  appState,
  canManageCandidates,
  getCurrentSchoolId,
  loadCandidates,
  onStateChange,
}) {
  const {
    ensureCandidateUploadState,
    setCandidatePreviewProgress,
    setCandidateUploadProgressOverlay,
    waitForProgressPaint,
  } = createCandidateUploadProgressActions({
    appState,
    onStateChange,
  });
  const { previewWorkbookFile } = createCandidateWorkbookPreviewActions({
    appState,
    ensureCandidateUploadState,
    getCurrentSchoolId,
    onStateChange,
    setCandidatePreviewProgress,
    waitForProgressPaint,
  });
  const { previewPhotoArchiveFile } = createCandidatePhotoArchivePreviewActions({
    appState,
    ensureCandidateUploadState,
    getCurrentSchoolId,
    onStateChange,
    setCandidatePreviewProgress,
    waitForProgressPaint,
  });
  const {
    closeCandidateUploadModal,
    isCandidateUploadDirty,
    saveCandidateUploadAndClose,
    uploadSelectedCandidateFile,
  } = createCandidateUploadSubmitActions({
    appState,
    canManageCandidates,
    ensureCandidateUploadState,
    getCurrentSchoolId,
    loadCandidates,
    onStateChange,
    previewWorkbookFile,
    setCandidateUploadProgressOverlay,
    waitForProgressPaint,
  });

  return Object.freeze({
    closeCandidateUploadModal,
    isCandidateUploadDirty,
    previewPhotoArchiveFile,
    previewWorkbookFile,
    saveCandidateUploadAndClose,
    uploadSelectedCandidateFile,
  });
}
