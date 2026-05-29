import { patchJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { arrayBufferToBase64, getJsonErrorMessage, readFileAsArrayBuffer } from "./candidate-action-utils.js";

export async function handleCandidateDetailPhotoChange(event, context) {
  const { appState, canManageCandidates, getCurrentSchoolId, loadCandidates, onStateChange, openCandidateDetail } = context;

  if (!event.target.matches("[data-candidate-detail-photo-file]")) {
    return false;
  }

  const [file] = event.target.files || [];
  const candidateId = appState.candidates.detail.originalRecord?.id || "";

  if (!file || !candidateId || !canManageCandidates()) {
    return true;
  }

  if (!/\.(jpe?g|png)$/i.test(file.name)) {
    appState.candidates.detail.statusMessage = "사진 파일 형식은 JPG, JPEG, PNG만 지원합니다.";
    appState.candidates.detail.statusType = "warning";
    showToast(appState.candidates.detail.statusMessage, { tone: "warning" });
    await onStateChange();
    return true;
  }

  appState.candidates.detail.isPhotoUploading = true;
  appState.candidates.detail.statusMessage = "";
  await onStateChange();

  try {
    await fetch(`/api/candidates/${encodeURIComponent(candidateId)}/photo`, {
      body: JSON.stringify({
        fileContentBase64: arrayBufferToBase64(await readFileAsArrayBuffer(file)),
        fileName: file.name,
        schoolId: getCurrentSchoolId(),
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    }).then(async (response) => {
      const payload = (response.headers.get("content-type") || "").includes("application/json") ? await response.json() : null;

      if (!response.ok) {
        throw new Error(getJsonErrorMessage(payload, "사진을 저장할 수 없습니다."));
      }
    });

    await loadCandidates();
    openCandidateDetail(candidateId);
    appState.candidates.detail.statusMessage = "사진을 저장했습니다.";
    appState.candidates.detail.statusType = "";
    showToast(appState.candidates.detail.statusMessage);
  } catch (error) {
    appState.candidates.detail.statusMessage = error.message;
    appState.candidates.detail.statusType = "warning";
    showToast(appState.candidates.detail.statusMessage, { tone: "error" });
  } finally {
    appState.candidates.detail.isPhotoUploading = false;
    await onStateChange();
  }

  return true;
}

export function handleCandidateDetailInput(event, context) {
  const { appState } = context;
  const fieldName = event.target.dataset.candidateDetailField;

  if (!fieldName || !appState.candidates.detail.draftRecord) {
    return false;
  }

  appState.candidates.detail.draftRecord[fieldName] = event.target.value;
  return true;
}

export async function closeCandidateDetailModal(context) {
  const { appState, onStateChange } = context;

  appState.candidates.detail.isOpen = false;
  await onStateChange();
}

export async function saveCandidateDetail(context, options = {}) {
  const { appState, canManageCandidates, getCurrentSchoolId, loadCandidates, onStateChange, openCandidateDetail } = context;
  const detail = appState.candidates.detail;
  const candidateId = detail.originalRecord?.id || "";

  if (!candidateId || !detail.draftRecord || !canManageCandidates()) {
    return false;
  }

  detail.isSaving = true;
  detail.statusMessage = "";
  await onStateChange();

  try {
    await patchJson(`/api/candidates/${encodeURIComponent(candidateId)}`, {
      ...detail.draftRecord,
      schoolId: getCurrentSchoolId(),
    });
    await loadCandidates();
    openCandidateDetail(candidateId);

    if (options.closeOnSuccess) {
      appState.candidates.detail.isOpen = false;
    }

    appState.candidates.detail.statusMessage = "수험생 정보를 저장했습니다.";
    appState.candidates.detail.statusType = "";
    showToast(appState.candidates.detail.statusMessage);
    return true;
  } catch (error) {
    detail.statusMessage = error.message;
    detail.statusType = "warning";
    showToast(detail.statusMessage, { tone: "error" });
    return false;
  } finally {
    appState.candidates.detail.isSaving = false;
    await onStateChange();
  }
}

export async function handleCandidateDetailAction(_actionTarget, action, context) {
  if (action === "close-candidate-detail-modal") {
    await closeCandidateDetailModal(context);
    return true;
  }

  if (action === "trigger-candidate-photo-upload") {
    document.querySelector("[data-candidate-detail-photo-file]")?.click();
    return true;
  }

  if (action === "save-candidate-detail") {
    await saveCandidateDetail(context);
    return true;
  }

  return false;
}
