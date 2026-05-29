import { showToast } from "../../app/toast.js";
import { fetchBlob, triggerBlobDownload } from "./candidate-action-utils.js";

export async function handleCandidateUploadChange(event, context) {
  const { appState, onStateChange, previewPhotoArchiveFile, previewWorkbookFile } = context;

  if (event.target.matches("[data-candidate-workbook-file]")) {
    const [file] = event.target.files || [];
    await previewWorkbookFile(file);
    return true;
  }

  if (event.target.matches("[data-candidate-photo-archive-file]")) {
    const [file] = event.target.files || [];
    await previewPhotoArchiveFile(file);
    return true;
  }

  if (event.target.matches("[data-candidate-upload-policy]")) {
    appState.candidates.upload.existingDataPolicy = String(event.target.value || "insert-update");
    await onStateChange();
    return true;
  }

  return false;
}

export async function handleCandidateUploadAction(actionTarget, action, context) {
  const { appState, canManageCandidates, onStateChange, uploadSelectedCandidateFile } = context;

  if (action === "download-candidate-template") {
    try {
      triggerBlobDownload(await fetchBlob("/api/candidates/template.xlsx", {}, "업로드 양식을 다운로드할 수 없습니다."), "수험생 데이터 업로드 양식.xlsx");
    } catch (error) {
      appState.candidates.upload.errorMessage = error.message;
      showToast(appState.candidates.upload.errorMessage, { tone: "error" });
      await onStateChange();
    }
    return true;
  }

  if (action === "open-candidate-upload-modal") {
    if (!canManageCandidates()) {
      return true;
    }

    appState.candidates.upload = {
      ...appState.candidates.upload,
      dataFileName: "",
      dataFile: null,
      errorMessage: "",
      isOpen: true,
      photoFileName: "",
      photoFile: null,
      photoPreview: null,
      photoPreviewToken: "",
      previewProgress: {
        detail: "",
        isIndeterminate: false,
        isActive: false,
        message: "",
        percent: 0,
      },
      progressOverlay: {
        detail: "",
        isIndeterminate: false,
        isOpen: false,
        message: "",
        percent: 0,
        stageLabel: "",
        title: "",
      },
      preview: null,
      successMessage: "",
    };
    await onStateChange();
    return true;
  }

  if (action === "close-candidate-upload-modal") {
    appState.candidates.upload.isOpen = false;
    await onStateChange();
    return true;
  }

  if (action === "set-candidate-upload-mode") {
    appState.candidates.upload.mode = actionTarget.dataset.uploadMode === "photo-archive" ? "photo-archive" : "workbook";
    appState.candidates.upload.errorMessage = "";
    appState.candidates.upload.successMessage = "";
    await onStateChange();
    return true;
  }

  if (action === "execute-candidate-upload") {
    await uploadSelectedCandidateFile();
    return true;
  }

  return false;
}
