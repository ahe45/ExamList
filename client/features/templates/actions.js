import { canUseAccess } from "../../app/access.js";
import { deleteJson, getJson, patchJson, postJson } from "../../app/api-client.js";
import { getActiveSchoolId, getActiveSchoolRouteKey } from "../../app/school-context.js";
import { showToast } from "../../app/toast.js";
import { createTemplateCreateModalActions } from "./template-create-modal-actions.js";

const appConfig = window.ExamListAppConfig;

function toQueryString(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && typeof value !== "undefined") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}

export function setupTemplateActions({ appState, dom, navigateToPath, onStateChange }) {
  function hasPermission(permissionKey) {
    return canUseAccess(appState.summary, permissionKey);
  }

  function getCurrentSchoolId() {
    return getActiveSchoolId(appState);
  }

  function getCurrentSchoolRouteKey() {
    return getActiveSchoolRouteKey(appState);
  }

  async function loadSummary(options = {}) {
    const schoolId = getCurrentSchoolId();
    const summary = await getJson(`/api/system/summary${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""}`);
    appState.summary = summary;

    if (!options.silent) {
      await onStateChange();
    }
  }

  async function loadTemplates(options = {}) {
    appState.templates.loading = true;

    try {
      const queryString = toQueryString({
        ...appState.templates.filters,
        limit: appState.templates.limit,
        schoolId: getCurrentSchoolId(),
      });
      const payload = await getJson(`/api/pdf-templates${queryString ? `?${queryString}` : ""}`);
      appState.templates.items = payload.items || [];
      appState.templates.total = payload.total || 0;
      appState.templates.errorMessage = "";
      if (
        appState.templates.cardEditor.activeTemplateId &&
        !appState.templates.items.some((item) => item.id === appState.templates.cardEditor.activeTemplateId)
      ) {
        resetTemplateCardEditor();
      }
    } catch (error) {
      appState.templates.items = [];
      appState.templates.errorMessage = error.message;
      if (!options.silent) {
        showToast(appState.templates.errorMessage, { tone: "error" });
      }
    } finally {
      appState.templates.loading = false;

      if (!options.silent) {
        await onStateChange();
      }
    }
  }

  function findTemplate(templateId) {
    return appState.templates.items.find((item) => item.id === templateId) || null;
  }

  function resetTemplateCardEditor() {
    appState.templates.cardEditor = {
      activeTemplateId: "",
      draftValue: "",
      field: "",
      isSaving: false,
    };
  }

  function getTemplateCardMetaEditorInputId(templateId = "", field = "") {
    return `templateCardMetaEditor-${templateId}-${field}`;
  }

  function focusTemplateCardMetaEditor(templateId, field) {
    window.requestAnimationFrame(() => {
      const inputElement = document.getElementById(getTemplateCardMetaEditorInputId(templateId, field));

      if (inputElement instanceof HTMLInputElement) {
        inputElement.focus();
        inputElement.select();
      }
    });
  }

  function isTemplateCardMetaEditorActive(templateId, field) {
    return appState.templates.cardEditor.activeTemplateId === templateId && appState.templates.cardEditor.field === field;
  }

  async function openTemplateCardMetaEditor(templateId, field) {
    if (!hasPermission("manageTemplates") || !["name", "description"].includes(field)) {
      return;
    }

    const template = findTemplate(templateId);

    if (!template) {
      appState.templates.errorMessage = "수정할 양식을 찾을 수 없습니다.";
      showToast(appState.templates.errorMessage, { tone: "error" });
      await onStateChange();
      return;
    }

    appState.templates.cardEditor = {
      activeTemplateId: templateId,
      draftValue: String(template[field] || ""),
      field,
      isSaving: false,
    };
    await onStateChange();
    focusTemplateCardMetaEditor(templateId, field);
  }

  function updateTemplateCardMetaEditorDraft(templateId, field, value) {
    if (!isTemplateCardMetaEditorActive(templateId, field)) {
      return;
    }

    appState.templates.cardEditor.draftValue = String(value ?? "");
  }

  async function closeTemplateCardMetaEditor() {
    resetTemplateCardEditor();
    await onStateChange();
  }

  async function saveTemplateCardMetaEditor(templateId, field) {
    if (!hasPermission("manageTemplates") || !isTemplateCardMetaEditorActive(templateId, field)) {
      return;
    }

    const template = findTemplate(templateId);

    if (!template) {
      appState.templates.errorMessage = "수정할 양식을 찾을 수 없습니다.";
      showToast(appState.templates.errorMessage, { tone: "error" });
      resetTemplateCardEditor();
      await onStateChange();
      return;
    }

    const draftValue = String(appState.templates.cardEditor.draftValue || "").trim();

    if (field === "name" && !draftValue) {
      showToast("양식명을 입력하세요.", { tone: "error" });
      focusTemplateCardMetaEditor(templateId, field);
      return;
    }

    appState.templates.cardEditor.isSaving = true;
    await onStateChange();

    try {
      const updatedTemplate = await patchJson(`/api/pdf-templates/${encodeURIComponent(templateId)}`, {
        description: field === "description" ? draftValue : template.description,
        generationUnit: template.generationUnit,
        name: field === "name" ? draftValue : template.name,
        orientation: template.orientation,
        paperPreset: template.paperPreset,
        schoolId: getCurrentSchoolId() || template.schoolId || "",
      });

      appState.templates.items = appState.templates.items.map((item) =>
        item.id === templateId ? { ...item, ...updatedTemplate } : item,
      );

      if (appState.templateEditor.template?.id === templateId) {
        appState.templateEditor.template = {
          ...appState.templateEditor.template,
          description: updatedTemplate.description,
          name: updatedTemplate.name,
          updatedAt: updatedTemplate.updatedAt,
        };
      }

      resetTemplateCardEditor();
      showToast(field === "name" ? "양식명을 수정했습니다." : "양식 설명을 수정했습니다.");
      await loadSummary({ silent: true });
      await onStateChange();
    } catch (error) {
      appState.templates.cardEditor.isSaving = false;
      appState.templates.errorMessage = error.message;
      showToast(appState.templates.errorMessage, { tone: "error" });
      await onStateChange();
      focusTemplateCardMetaEditor(templateId, field);
    }
  }

  const templateCreateModalActions = createTemplateCreateModalActions({
    appState,
    getCurrentSchoolId,
    getCurrentSchoolRouteKey,
    hasPermission,
    loadSummary,
    loadTemplates,
    onStateChange,
  });

  document.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-template-create-form]")) {
      return;
    }

    event.preventDefault();
    await templateCreateModalActions.createTemplateFromModal();
  });

  document.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    const actionName = actionTarget.dataset.action;
    const templateId = actionTarget.dataset.templateId || "";

    if (actionName === "create-template") {
      await templateCreateModalActions.openTemplateCreateModal();
      return;
    }

    if (actionName === "close-template-create-modal") {
      await templateCreateModalActions.closeTemplateCreateModal();
      return;
    }

    if (actionName === "edit-template-card-meta" && templateId) {
      await openTemplateCardMetaEditor(templateId, actionTarget.dataset.templateField || "");
      return;
    }

    if (actionName === "save-template-card-meta" && templateId) {
      await saveTemplateCardMetaEditor(templateId, actionTarget.dataset.templateField || "");
      return;
    }

    if (actionName === "cancel-template-card-meta") {
      await closeTemplateCardMetaEditor();
      return;
    }

    if (actionName === "edit-template" && templateId) {
      appState.ui.activeTemplateId = templateId;
      navigateToPath(appConfig.getViewRoutePath("templateEditor", { schoolId: getCurrentSchoolRouteKey(), templateId }));
      return;
    }

    if (actionName === "duplicate-template" && templateId) {
      if (!hasPermission("manageTemplates")) {
        return;
      }

      try {
        await postJson(`/api/pdf-templates/${encodeURIComponent(templateId)}/duplicate`, {
          schoolId: getCurrentSchoolId(),
        });
        showToast("양식을 복사했습니다.");
        await loadSummary();
        await loadTemplates();
      } catch (error) {
        appState.templates.errorMessage = error.message;
        showToast(appState.templates.errorMessage, { tone: "error" });
        await onStateChange();
      }
      return;
    }

    if (actionName === "delete-template" && templateId) {
      if (!hasPermission("deleteTemplates")) {
        return;
      }

      const template = findTemplate(templateId);

      if (!window.confirm(`"${template?.name || "선택한 템플릿"}"을 삭제하시겠습니까?`)) {
        return;
      }

      try {
        const schoolId = getCurrentSchoolId();
        await deleteJson(`/api/pdf-templates/${encodeURIComponent(templateId)}${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ""}`);
        showToast("양식을 삭제했습니다.");
        await loadSummary();
        await loadTemplates();
      } catch (error) {
        appState.templates.errorMessage = error.message;
        showToast(appState.templates.errorMessage, { tone: "error" });
        await onStateChange();
      }
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target?.matches?.("[data-template-card-input]")) {
      updateTemplateCardMetaEditorDraft(
        event.target.dataset.templateCardInput || "",
        event.target.dataset.templateField || "",
        event.target.value,
      );
      return;
    }

    if (event.target?.matches?.("[data-template-create-field]")) {
      templateCreateModalActions.updateTemplateCreateField(
        event.target.dataset.templateCreateField || "",
        event.target.value,
      );
    }
  });

  document.addEventListener("change", async (event) => {
    if (event.target?.matches?.("[data-template-create-mode]")) {
      await templateCreateModalActions.updateTemplateCreateMode(event.target.value || "");
      return;
    }

    if (event.target?.matches?.("[data-template-create-school]")) {
      await templateCreateModalActions.selectTemplateCreateSchool(event.target.value || "");
      return;
    }

    if (event.target?.matches?.("[data-template-create-source-template]")) {
      await templateCreateModalActions.selectTemplateCreateSourceTemplate(event.target.value || "");
    }
  });

  document.addEventListener("keydown", async (event) => {
    if (!event.target?.matches?.("[data-template-card-input]")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      await closeTemplateCardMetaEditor();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await saveTemplateCardMetaEditor(
        event.target.dataset.templateCardInput || "",
        event.target.dataset.templateField || "",
      );
    }
  });

  return {
    closeTemplateCreateModal: templateCreateModalActions.closeTemplateCreateModal,
    loadSummary,
    loadTemplates,
  };
}
