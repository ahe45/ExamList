import { getJson, postJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { createDefaultTemplateCreateModalState } from "./template-create-modal-state.js";

const templateCreateModes = Object.freeze(["blank", "default", "copy"]);

function normalizeTemplateCreateMode(mode = "") {
  return templateCreateModes.includes(mode) ? mode : "default";
}

export function createTemplateCreateModalActions({
  appState,
  getCurrentSchoolId,
  getCurrentSchoolRouteKey,
  hasPermission,
  loadSummary,
  loadTemplates,
  onStateChange,
}) {
  function resetTemplateCreateModal(overrides = {}) {
    appState.templates.createModal = createDefaultTemplateCreateModalState(overrides);
  }

  function getTemplateCreateModal() {
    if (!appState.templates.createModal) {
      resetTemplateCreateModal();
    }

    return appState.templates.createModal;
  }

  async function loadTemplateSourceSchools() {
    const modal = getTemplateCreateModal();

    modal.isLoadingSchools = true;
    modal.errorMessage = "";
    await onStateChange();

    try {
      const currentSchoolId = getCurrentSchoolId();
      const currentSchoolRouteKey = getCurrentSchoolRouteKey();
      const payload = await getJson("/api/schools?limit=100");
      const schools = (Array.isArray(payload?.items) ? payload.items : []).filter((school) => {
        const schoolId = String(school.id || "");
        const schoolCode = String(school.code || "");

        return schoolId && schoolId !== currentSchoolId && schoolCode !== currentSchoolRouteKey;
      });

      modal.schools = schools;

      if (modal.selectedSchoolId && !schools.some((school) => String(school.id || "") === modal.selectedSchoolId)) {
        modal.selectedSchoolId = "";
        modal.selectedTemplateId = "";
        modal.sourceTemplates = [];
      }
    } catch (error) {
      modal.schools = [];
      modal.selectedSchoolId = "";
      modal.selectedTemplateId = "";
      modal.sourceTemplates = [];
      modal.errorMessage = error.message || "학교 목록을 불러오지 못했습니다.";
      showToast(modal.errorMessage, { tone: "error" });
    } finally {
      modal.isLoadingSchools = false;
      await onStateChange();
    }
  }

  async function loadTemplateSourceTemplates(schoolId = "") {
    const modal = getTemplateCreateModal();
    const normalizedSchoolId = String(schoolId || "").trim();

    modal.selectedSchoolId = normalizedSchoolId;
    modal.selectedTemplateId = "";
    modal.sourceTemplates = [];

    if (!normalizedSchoolId) {
      await onStateChange();
      return;
    }

    modal.isLoadingTemplates = true;
    modal.errorMessage = "";
    await onStateChange();

    try {
      const payload = await getJson(`/api/pdf-templates?limit=100&schoolId=${encodeURIComponent(normalizedSchoolId)}`);

      modal.sourceTemplates = Array.isArray(payload?.items) ? payload.items : [];
    } catch (error) {
      modal.sourceTemplates = [];
      modal.errorMessage = error.message || "양식 목록을 불러오지 못했습니다.";
      showToast(modal.errorMessage, { tone: "error" });
    } finally {
      modal.isLoadingTemplates = false;
      await onStateChange();
    }
  }

  async function openTemplateCreateModal() {
    if (!hasPermission("manageTemplates")) {
      return;
    }

    resetTemplateCreateModal({
      isOpen: true,
      mode: "default",
    });
    await onStateChange();
    await loadTemplateSourceSchools();
  }

  async function closeTemplateCreateModal() {
    resetTemplateCreateModal();
    await onStateChange();
  }

  async function updateTemplateCreateMode(mode = "") {
    const modal = getTemplateCreateModal();
    const nextMode = normalizeTemplateCreateMode(mode);

    modal.mode = nextMode;
    modal.errorMessage = "";

    if (nextMode !== "copy") {
      modal.selectedSchoolId = "";
      modal.selectedTemplateId = "";
      modal.sourceTemplates = [];
      await onStateChange();
      return;
    }

    await onStateChange();

    if (!modal.schools.length && !modal.isLoadingSchools) {
      await loadTemplateSourceSchools();
    }
  }

  async function selectTemplateCreateSchool(schoolId = "") {
    await loadTemplateSourceTemplates(schoolId);
  }

  async function selectTemplateCreateSourceTemplate(templateId = "") {
    const modal = getTemplateCreateModal();

    modal.selectedTemplateId = String(templateId || "").trim();
    modal.errorMessage = "";
    await onStateChange();
  }

  function updateTemplateCreateField(field = "", value = "") {
    if (!["description", "name"].includes(field)) {
      return;
    }

    const modal = getTemplateCreateModal();

    modal[field] = String(value ?? "");
  }

  async function createTemplateFromModal() {
    if (!hasPermission("manageTemplates")) {
      return;
    }

    const modal = getTemplateCreateModal();

    if (modal.isSubmitting) {
      return;
    }

    if (modal.mode === "copy" && (!modal.selectedSchoolId || !modal.selectedTemplateId)) {
      modal.errorMessage = "복사할 학교와 양식을 선택하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    const templateName = String(modal.name || "").trim();
    const templateDescription = String(modal.description || "").trim();

    modal.isSubmitting = true;
    modal.errorMessage = "";
    await onStateChange();

    try {
      if (modal.mode === "copy") {
        await postJson(`/api/pdf-templates/${encodeURIComponent(modal.selectedTemplateId)}/duplicate`, {
          description: templateDescription,
          name: templateName,
          sourceSchoolId: modal.selectedSchoolId,
          targetSchoolId: getCurrentSchoolId(),
        });
        showToast("선택한 양식을 복사했습니다.");
      } else {
        await postJson("/api/pdf-templates", {
          creationMode: modal.mode === "blank" ? "blank" : "default",
          description: templateDescription,
          generationUnit: "roomCode",
          name: templateName || "새 양식",
          orientation: "portrait",
          paperPreset: "A4",
          schoolId: getCurrentSchoolId(),
        });
        showToast("새 양식을 만들었습니다.");
      }

      resetTemplateCreateModal();
      await loadSummary({ silent: true });
      await loadTemplates({ silent: true });
      await onStateChange();
    } catch (error) {
      modal.isSubmitting = false;
      appState.templates.errorMessage = error.message;
      modal.errorMessage = error.message;
      showToast(modal.errorMessage, { tone: "error" });
      await onStateChange();
    }
  }

  return {
    closeTemplateCreateModal,
    createTemplateFromModal,
    openTemplateCreateModal,
    selectTemplateCreateSchool,
    selectTemplateCreateSourceTemplate,
    updateTemplateCreateMode,
    updateTemplateCreateField,
  };
}
