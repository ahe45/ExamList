import { showToast } from "../../app/toast.js";
import { normalizeAcademicYearInputValue, normalizeSchoolNameInputValue, readSchoolLogoFileAsDataUrl } from "./utils.js";

const appConfig = window.ExamListAppConfig;

export function bindSchoolActionEvents({
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
}) {
  document.addEventListener("beforeinput", (event) => {
    const schoolModalField = event.target.closest("[data-school-modal-field]");

    if (!schoolModalField || schoolModalField.dataset.schoolModalField !== "academicYear" || !event.data) {
      return;
    }

    if (/\D/.test(event.data)) {
      event.preventDefault();
    }
  });

  document.addEventListener("keydown", (event) => {
    const schoolModalField = event.target.closest("[data-school-modal-field]");

    if (!schoolModalField || schoolModalField.dataset.schoolModalField !== "academicYear") {
      return;
    }

    if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
      event.preventDefault();
    }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.matches("[data-school-filter-form]")) {
      event.preventDefault();
      const formData = new FormData(event.target);

      appState.schools.filters.keyword = String(formData.get("keyword") || "");
      await loadSchools();
      return;
    }

    if (event.target.matches("[data-school-form]")) {
      event.preventDefault();
      if (appState.schools.modal.mode === "edit") {
        await updateSchool();
      } else {
        await createSchool();
      }
    }
  });

  document.addEventListener("input", (event) => {
    const schoolModalField = event.target.closest("[data-school-modal-field]");

    if (!schoolModalField) {
      return;
    }

    const fieldName = schoolModalField.dataset.schoolModalField || "";
    const nextValue =
      fieldName === "academicYear"
        ? normalizeAcademicYearInputValue(schoolModalField.value)
        : fieldName === "name"
          ? normalizeSchoolNameInputValue(schoolModalField.value)
          : schoolModalField.value;

    if (schoolModalField.value !== nextValue) {
      schoolModalField.value = nextValue;
    }

    appState.schools.modal[fieldName] = nextValue;
  });

  document.addEventListener("change", async (event) => {
    const logoInput = event.target.closest("[data-school-modal-logo-file]");

    if (!logoInput) {
      return;
    }

    const [file] = logoInput.files || [];

    if (!file) {
      return;
    }

    if (!String(file.type || "").startsWith("image/")) {
      showToast("이미지 파일만 업로드할 수 있습니다.", { tone: "warning" });
      await onStateChange();
      return;
    }

    if (file.size > 1024 * 1024) {
      showToast("로고 이미지는 1MB 이하만 업로드할 수 있습니다.", { tone: "warning" });
      await onStateChange();
      return;
    }

    try {
      appState.schools.modal.logoDataUrl = await readSchoolLogoFileAsDataUrl(file);
      appState.schools.modal.errorMessage = "";
    } catch (error) {
      appState.schools.modal.errorMessage = error.message;
      showToast(appState.schools.modal.errorMessage, { tone: "error" });
    }

    await onStateChange();
  });

  document.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    if (actionTarget.disabled) {
      return;
    }

    if (actionTarget.dataset.action === "open-school-modal") {
      if (!canManageSchools()) {
        return;
      }

      resetSchoolModal();
      appState.schools.modal.isOpen = true;
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "clear-school-modal-logo") {
      appState.schools.modal.logoDataUrl = "";
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "close-school-modal") {
      resetSchoolModal();
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "step-school-academic-year") {
      const currentValue = normalizeAcademicYearInputValue(appState.schools.modal.academicYear);
      const fallbackYear = new Date().getFullYear();
      const baseYear = Number(currentValue) || fallbackYear;
      const step = Number(actionTarget.dataset.schoolYearStep) || 0;
      const nextYear = Math.min(2999, Math.max(1900, baseYear + step));
      const yearInput = actionTarget.closest(".school-year-input")?.querySelector('[data-school-modal-field="academicYear"]');

      appState.schools.modal.academicYear = String(nextYear);

      if (yearInput instanceof HTMLInputElement) {
        yearInput.value = String(nextYear);
        yearInput.focus();
      }

      return;
    }

    if (actionTarget.dataset.action === "open-school-workspace") {
      const schoolId = String(actionTarget.dataset.schoolId || "").trim();
      const schoolCode = String(actionTarget.dataset.schoolCode || "").trim();

      if (!schoolId || !schoolCode) {
        return;
      }

      appState.ui.activeSchoolId = schoolId;
      navigateToPath(appConfig.getViewRoutePath("templateManagement", { schoolId: schoolCode }));
      return;
    }

    if (actionTarget.dataset.action === "open-school-edit-modal") {
      const schoolId = String(actionTarget.dataset.schoolId || "").trim();

      if (!schoolId) {
        return;
      }

      await openSchoolEditModal(schoolId);
      return;
    }

    if (actionTarget.dataset.action === "delete-school") {
      const schoolId = String(actionTarget.dataset.schoolId || "").trim();

      if (!schoolId) {
        return;
      }

      await deleteSchool(schoolId);
    }
  });
}
