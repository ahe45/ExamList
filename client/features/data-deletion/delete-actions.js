import { deleteJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { DATA_DELETION_CONFIRMATION_PHRASE } from "./renderers.js";
import {
  buildDataDeletionSuccessMessage,
  createClosedDataDeletionModalState,
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

    state.activeScope = normalizedScope;
    state.isDeleting = true;
    state.statusMessage = "";
    state.statusType = "";
    modal.errorMessage = "";
    await onStateChange();

    try {
      const payload = await deleteJson(`/api/data-deletion/${encodeURIComponent(normalizedScope)}`, {
        confirmationPhrase,
        filters: buildDataDeletionFilterPayload(),
        schoolId,
        ...(normalizedScope === "templates" ? { templateIds: normalizeTemplateIds(modal.selectedTemplateIds) } : {}),
      });
      const successMessage = buildDataDeletionSuccessMessage(payload || {});

      await refreshAfterDeletion(normalizedScope, payload || {});
      state.statusMessage = successMessage;
      state.statusType = "success";
      state.modal = createClosedDataDeletionModalState();
      showToast(successMessage, { duration: 4600 });
    } catch (error) {
      state.statusMessage = error.message;
      state.statusType = "warning";
      getDataDeletionModalState().errorMessage = error.message;
      showToast(error.message, { tone: "error" });
    } finally {
      state.activeScope = "";
      state.isDeleting = false;
      await onStateChange();
    }
  }

  return {
    deleteProjectData,
  };
}
