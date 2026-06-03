import { deleteJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import {
  markProgressOverlayStarted,
  waitForMinimumProgressOverlayDuration,
  waitForProgressOverlayPaint,
} from "../../app/progress-overlay-timing.js";
import { DATA_DELETION_CONFIRMATION_PHRASE } from "./renderers.js";
import {
  buildDataDeletionSuccessMessage,
  normalizeDataDeletionScope,
  normalizeTemplateIds,
} from "./state.js";

export function createDataDeletionDeleteActions({
  buildDataDeletionFilterPayload,
  getCurrentSchoolId,
  getDataDeletionModalState,
  getDataDeletionState,
  getScopeItem,
  hasPermission,
  onStateChange,
  refreshAfterDeletion,
  refreshModalAfterDeletion,
}) {
  async function deleteProjectData(scope = "", options = {}) {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();
    const normalizedScope = normalizeDataDeletionScope(scope);
    const item = getScopeItem(normalizedScope);
    const schoolId = getCurrentSchoolId();

    if (!item || state.isDeleting) {
      return;
    }

    if (!hasPermission("deleteProjectData")) {
      state.statusMessage = "데이터 삭제 권한이 없습니다.";
      state.statusType = "warning";
      showToast(state.statusMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    if (!schoolId) {
      state.statusMessage = "학교를 먼저 선택하세요.";
      state.statusType = "warning";
      showToast(state.statusMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    const confirmationPhrase = String(options.confirmationPhrase || "").trim();

    if (normalizedScope === "all" && confirmationPhrase !== DATA_DELETION_CONFIRMATION_PHRASE) {
      const message = "전체 데이터 삭제 확인 문구가 일치하지 않습니다.";
      state.statusMessage = message;
      state.statusType = "warning";
      modal.errorMessage = message;
      showToast(message, { tone: "warning" });
      await onStateChange();
      return;
    }

    const deletePayload = {
      confirmationPhrase,
      filters: buildDataDeletionFilterPayload(),
      schoolId,
      ...(normalizedScope === "templates" ? { templateIds: normalizeTemplateIds(modal.selectedTemplateIds) } : {}),
    };

    state.activeScope = normalizedScope;
    state.isDeleting = true;
    state.progressOverlay = {
      message: "삭제 대상 데이터를 정리하고 있습니다. 완료될 때까지 화면을 닫지 마세요.",
      stageLabel: "삭제 처리",
    };
    state.statusMessage = "";
    state.statusType = "";
    modal.confirmationOpen = false;
    modal.errorMessage = "";
    modal.isDeleting = true;
    const progressStartedAt = markProgressOverlayStarted();
    await onStateChange();
    await waitForProgressOverlayPaint();

    try {
      const payload = await deleteJson(`/api/data-deletion/${encodeURIComponent(normalizedScope)}`, deletePayload);
      const successMessage = buildDataDeletionSuccessMessage(payload || {});

      state.progressOverlay = {
        message: "삭제 결과를 현재 화면에 반영하고 있습니다.",
        stageLabel: "화면 갱신",
      };
      await onStateChange();
      await refreshAfterDeletion(normalizedScope, payload || {});
      await refreshModalAfterDeletion?.();
      state.statusMessage = successMessage;
      state.statusType = "success";
      showToast(successMessage);
    } catch (error) {
      state.statusMessage = error.message;
      state.statusType = "warning";
      getDataDeletionModalState().errorMessage = error.message;
      showToast(error.message, { tone: "error" });
    } finally {
      await waitForMinimumProgressOverlayDuration(progressStartedAt);
      state.activeScope = "";
      state.isDeleting = false;
      state.progressOverlay = {
        message: "",
        stageLabel: "",
      };
      getDataDeletionModalState().isDeleting = false;
      await onStateChange();
    }
  }

  return {
    deleteProjectData,
  };
}
