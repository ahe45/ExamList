import { getJson, patchJson, postJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import {
  formatAcademicYearForSave,
  formatCampusNameForSave,
  formatSchoolNameForSave,
  getBaseSchoolCode,
  normalizeAcademicYearInputValue,
  normalizeCampusNameInputValue,
  normalizeSchoolNameInputValue,
} from "./utils.js";

const appConfig = window.ExamListAppConfig;

export function createSchoolModalActions({
  appState,
  canManageSchools,
  loadSchools,
  navigateToPath,
  onStateChange,
}) {
  function getSchoolModalSnapshot(modal = appState.schools.modal) {
    return {
      academicYear: normalizeAcademicYearInputValue(modal.academicYear),
      campusCode: String(modal.campusCode || "").trim(),
      campusName: normalizeCampusNameInputValue(modal.campusName),
      code: String(modal.code || "").trim(),
      deletionPassword: String(modal.deletionPassword || "").trim(),
      deletionPasswordConfirm: String(modal.deletionPasswordConfirm || "").trim(),
      logoDataUrl: String(modal.logoDataUrl || "").trim(),
      name: normalizeSchoolNameInputValue(modal.name),
    };
  }

  function resetSchoolModal(overrides = {}) {
    const nextModal = {
      academicYear: "",
      campusCode: "",
      campusName: "",
      code: "",
      deletionPassword: "",
      deletionPasswordConfirm: "",
      description: "",
      errorMessage: "",
      initialSnapshot: null,
      isOpen: false,
      isSaving: false,
      logoDataUrl: "",
      mode: "create",
      name: "",
      schoolId: "",
      settingsLoading: false,
      ...overrides,
    };

    nextModal.initialSnapshot = overrides.initialSnapshot || getSchoolModalSnapshot(nextModal);
    appState.schools.modal = nextModal;
  }

  function isSchoolModalDirty() {
    const modal = appState.schools.modal || {};

    if (!modal.isOpen || modal.isSaving || modal.settingsLoading) {
      return false;
    }

    return JSON.stringify(getSchoolModalSnapshot(modal)) !== JSON.stringify(modal.initialSnapshot || {});
  }

  function syncActiveSchoolSettings(settings = {}, schoolId = "") {
    if (String(appState.ui.activeSchoolId || "") !== String(schoolId || "")) {
      return;
    }

    appState.schoolSettings.academicYear = String(settings.academicYear || "");
    appState.schoolSettings.campusCode = String(settings.campusCode || "");
    appState.schoolSettings.campusName = String(settings.campusName || "");
    appState.schoolSettings.logoDataUrl = String(settings.logoDataUrl || "");
    appState.schoolSettings.schoolId = String(settings.schoolId || schoolId || "");
    appState.schoolSettings.schoolName = String(settings.schoolName || "");
    appState.schoolSettings.errorMessage = "";
    appState.schoolSettings.isDirty = false;
    appState.schoolSettings.successMessage = "";
  }

  async function saveSchoolModalSettings(schoolId = "") {
    const normalizedSchoolId = String(schoolId || "").trim();

    if (!normalizedSchoolId) {
      return null;
    }

    const settings = await patchJson("/api/school-settings", {
      academicYear: formatAcademicYearForSave(appState.schools.modal.academicYear),
      campusCode: String(appState.schools.modal.campusCode || "").trim(),
      campusName: formatCampusNameForSave(appState.schools.modal.campusName),
      logoDataUrl: appState.schools.modal.logoDataUrl,
      schoolId: normalizedSchoolId,
      schoolName: formatSchoolNameForSave(appState.schools.modal.name),
    });

    syncActiveSchoolSettings(settings, normalizedSchoolId);
    return settings;
  }

  async function createSchool() {
    if (!canManageSchools() || appState.schools.modal.isSaving) {
      return false;
    }

    const deletionPassword = String(appState.schools.modal.deletionPassword || "").trim();
    const deletionPasswordConfirm = String(appState.schools.modal.deletionPasswordConfirm || "").trim();

    if ((deletionPassword || deletionPasswordConfirm) && deletionPassword !== deletionPasswordConfirm) {
      appState.schools.modal.errorMessage = "삭제 비밀번호가 일치하지 않습니다.";
      showToast(appState.schools.modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return false;
    }

    appState.schools.modal.isSaving = true;
    appState.schools.modal.errorMessage = "";
    await onStateChange();

    try {
      const schoolName = formatSchoolNameForSave(appState.schools.modal.name);
      const school = await postJson("/api/schools", {
        campusCode: String(appState.schools.modal.campusCode || "").trim(),
        code: appState.schools.modal.code,
        deletionPassword,
        deletionPasswordConfirm,
        description: "",
        name: schoolName,
      });
      const settings = await saveSchoolModalSettings(school?.id || "");

      resetSchoolModal();
      await loadSchools({ silent: true });
      appState.schools.detail = school || null;
      appState.ui.activeSchoolId = String(school?.id || "");
      syncActiveSchoolSettings(settings, school?.id || "");
      showToast("학교를 등록했습니다.");
      navigateToPath(appConfig.getViewRoutePath("templateManagement", { schoolId: school.code || school.id }));
      return true;
    } catch (error) {
      appState.schools.modal.errorMessage = error.message;
      appState.schools.modal.isSaving = false;
      showToast(appState.schools.modal.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    }
  }

  async function updateSchool() {
    if (!canManageSchools() || appState.schools.modal.isSaving) {
      return false;
    }

    const schoolId = String(appState.schools.modal.schoolId || "").trim();

    if (!schoolId) {
      appState.schools.modal.errorMessage = "수정할 학교를 찾을 수 없습니다.";
      showToast(appState.schools.modal.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    }

    appState.schools.modal.isSaving = true;
    appState.schools.modal.errorMessage = "";
    await onStateChange();

    try {
      const schoolName = formatSchoolNameForSave(appState.schools.modal.name);
      const school = await patchJson(`/api/schools/${encodeURIComponent(schoolId)}`, {
        campusCode: String(appState.schools.modal.campusCode || "").trim(),
        code: appState.schools.modal.code,
        description: "",
        name: schoolName,
      });
      const settings = await saveSchoolModalSettings(school.id || schoolId);

      resetSchoolModal();
      await loadSchools({ silent: true });

      if (appState.schools.detail?.id === schoolId) {
        appState.schools.detail = school;
      }

      syncActiveSchoolSettings(settings, school.id || schoolId);
      showToast("학교 정보를 수정했습니다.");
      await onStateChange();
      return true;
    } catch (error) {
      appState.schools.modal.errorMessage = error.message;
      appState.schools.modal.isSaving = false;
      showToast(appState.schools.modal.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    }
  }

  async function openSchoolEditModal(schoolId = "") {
    if (!canManageSchools()) {
      return false;
    }

    const school = appState.schools.items.find((item) => String(item.id || "") === String(schoolId || "")) || null;

    if (!school) {
      appState.schools.errorMessage = "수정할 학교를 찾을 수 없습니다.";
      showToast(appState.schools.errorMessage, { tone: "error" });
      return false;
    }

    if (school.canManage === false) {
      appState.schools.errorMessage = "이 학교를 생성한 계정 또는 슈퍼 관리자만 수정할 수 있습니다.";
      showToast(appState.schools.errorMessage, { tone: "warning" });
      return false;
    }

    const modalSchoolId = String(school.id || schoolId || "");

    resetSchoolModal({
      campusCode: String(school.campusCode || ""),
      campusName: normalizeCampusNameInputValue(school.campusName || ""),
      code: getBaseSchoolCode(school.code, school.campusCode),
      description: String(school.description || ""),
      isOpen: true,
      mode: "edit",
      name: normalizeSchoolNameInputValue(school.name),
      schoolId: modalSchoolId,
      settingsLoading: true,
    });
    await onStateChange();

    try {
      const settings = await getJson(`/api/school-settings?schoolId=${encodeURIComponent(modalSchoolId)}`);

      if (appState.schools.modal.schoolId !== modalSchoolId || appState.schools.modal.mode !== "edit" || !appState.schools.modal.isOpen) {
        return false;
      }

      appState.schools.modal.academicYear = String(settings.academicYear || "");
      appState.schools.modal.campusCode = String(settings.campusCode || "");
      appState.schools.modal.campusName = normalizeCampusNameInputValue(settings.campusName || "");
      appState.schools.modal.logoDataUrl = String(settings.logoDataUrl || "");
      appState.schools.modal.name = normalizeSchoolNameInputValue(settings.schoolName || school.name || "");
      appState.schools.modal.initialSnapshot = getSchoolModalSnapshot(appState.schools.modal);
      appState.schools.modal.settingsLoading = false;
    } catch (error) {
      if (appState.schools.modal.schoolId !== modalSchoolId || appState.schools.modal.mode !== "edit" || !appState.schools.modal.isOpen) {
        return false;
      }

      appState.schools.modal.errorMessage = error.message || "학교 설정을 불러오지 못했습니다.";
      appState.schools.modal.settingsLoading = false;
      showToast(appState.schools.modal.errorMessage, { tone: "error" });
    }

    await onStateChange();
    return true;
  }

  return Object.freeze({
    createSchool,
    isSchoolModalDirty,
    openSchoolEditModal,
    resetSchoolModal,
    updateSchool,
  });
}
