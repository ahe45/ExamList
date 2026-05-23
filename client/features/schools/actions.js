import { hasAccess } from "../../app/access.js";
import { deleteJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { createSchoolDataActions } from "./data-actions.js";
import { bindSchoolActionEvents } from "./event-bindings.js";
import { createSchoolModalActions } from "./modal-actions.js";

export function setupSchoolActions({ appState, navigateToPath, onStateChange }) {
  function canManageSchools() {
    return hasAccess(appState.summary, "manageTemplates");
  }

  function canDeleteSchoolsWithoutPassword() {
    return hasAccess(appState.summary, "deleteSchoolsWithoutPassword");
  }

  const {
    loadSchoolDetail,
    loadSchools,
  } = createSchoolDataActions({
    appState,
    onStateChange,
  });
  const {
    createSchool,
    isSchoolModalDirty,
    openSchoolEditModal,
    resetSchoolModal,
    updateSchool,
  } = createSchoolModalActions({
    appState,
    canManageSchools,
    loadSchools,
    navigateToPath,
    onStateChange,
  });

  async function deleteSchool(schoolId = "") {
    if (!canManageSchools()) {
      return;
    }

    const normalizedSchoolId = String(schoolId || "").trim();

    if (!normalizedSchoolId) {
      return;
    }

    const school = appState.schools.items.find((item) => String(item.id || "") === normalizedSchoolId) || null;

    if (!window.confirm(`"${school?.name || "선택한 학교"}"을 삭제하시겠습니까?\n연결된 수험생 데이터, 양식, PDF 생성 이력과 파일, 학교 설정도 함께 삭제됩니다.`)) {
      return;
    }

    const deletionPassword = canDeleteSchoolsWithoutPassword()
      ? ""
      : String(window.prompt("학교 삭제 비밀번호를 입력하세요.") || "").trim();

    if (!canDeleteSchoolsWithoutPassword() && !deletionPassword) {
      showToast("학교 삭제 비밀번호를 입력하세요.", { tone: "warning" });
      return;
    }

    try {
      await deleteJson(
        `/api/schools/${encodeURIComponent(normalizedSchoolId)}`,
        deletionPassword ? { deletionPassword } : null,
      );

      if (String(appState.schools.detail?.id || "") === normalizedSchoolId) {
        appState.schools.detail = null;
        appState.ui.activeSchoolId = "";
      }

      showToast("학교를 삭제했습니다.");
      await loadSchools();
    } catch (error) {
      appState.schools.errorMessage = error.message;
      showToast(appState.schools.errorMessage, { tone: "error" });
      await onStateChange();
    }
  }

  bindSchoolActionEvents({
    appState,
    canManageSchools,
    createSchool,
    deleteSchool,
    loadSchools,
    navigateToPath,
    onStateChange,
    openSchoolEditModal,
    resetSchoolModal,
    updateSchool,
  });

  async function closeSchoolModal() {
    resetSchoolModal();
    await onStateChange();
  }

  async function saveSchoolModal() {
    if (appState.schools.modal.mode === "edit") {
      return updateSchool();
    }

    return createSchool();
  }

  return {
    closeSchoolModal,
    isSchoolModalDirty,
    loadSchoolDetail,
    loadSchools,
    saveSchoolModal,
  };
}
