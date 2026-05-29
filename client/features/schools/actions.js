import { hasAccess } from "../../app/access.js";
import { deleteJson } from "../../app/api-client.js";
import {
  markProgressOverlayStarted,
  waitForMinimumProgressOverlayDuration,
  waitForProgressOverlayPaint,
} from "../../app/progress-overlay-timing.js";
import { showToast } from "../../app/toast.js";
import { createSchoolDataActions } from "./data-actions.js";
import { bindSchoolActionEvents } from "./event-bindings.js";
import { createSchoolModalActions } from "./modal-actions.js";

export function setupSchoolActions({ appState, navigateToPath, onStateChange }) {
  function canManageSchools() {
    return hasAccess(appState.summary, "manageTemplates");
  }

  function canManageSchoolRecord(school = null) {
    return canManageSchools() && school?.canManage !== false;
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
    if (!canManageSchools() || appState.schools.isDeleting) {
      return;
    }

    const normalizedSchoolId = String(schoolId || "").trim();

    if (!normalizedSchoolId) {
      return;
    }

    const school = appState.schools.items.find((item) => String(item.id || "") === normalizedSchoolId) || null;

    if (!canManageSchoolRecord(school)) {
      showToast("이 학교를 생성한 계정 또는 슈퍼 관리자만 삭제할 수 있습니다.", { tone: "warning" });
      return;
    }

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

    appState.schools.deletingSchoolId = normalizedSchoolId;
    appState.schools.deletionProgress = {
      candidateCount: Number(school?.candidateCount) || 0,
      message: "학교와 연결된 운영 데이터를 삭제하고 있습니다. 완료될 때까지 화면을 닫지 마세요.",
      schoolName: String(school?.name || "선택한 학교"),
      stageLabel: "삭제 처리",
      templateCount: Number(school?.templateCount) || 0,
    };
    appState.schools.errorMessage = "";
    appState.schools.isDeleting = true;
    const progressStartedAt = markProgressOverlayStarted();
    await onStateChange();
    await waitForProgressOverlayPaint();

    try {
      await deleteJson(
        `/api/schools/${encodeURIComponent(normalizedSchoolId)}`,
        deletionPassword ? { deletionPassword } : null,
      );

      if (String(appState.schools.detail?.id || "") === normalizedSchoolId) {
        appState.schools.detail = null;
        appState.ui.activeSchoolId = "";
      }

      appState.schools.deletionProgress = {
        ...appState.schools.deletionProgress,
        message: "학교 목록을 갱신하고 있습니다.",
        stageLabel: "목록 갱신",
      };
      await onStateChange();
      showToast("학교를 삭제했습니다.");
      await loadSchools({ silent: true });
    } catch (error) {
      appState.schools.errorMessage = error.message;
      showToast(appState.schools.errorMessage, { tone: "error" });
    } finally {
      await waitForMinimumProgressOverlayDuration(progressStartedAt);
      appState.schools.deletingSchoolId = "";
      appState.schools.deletionProgress = {
        candidateCount: 0,
        message: "",
        schoolName: "",
        stageLabel: "",
        templateCount: 0,
      };
      appState.schools.isDeleting = false;
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
