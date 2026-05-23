import { hideToast } from "../../app/toast.js";
import { sanitizeEditableDocumentHtml } from "./document-editor.js";
import {
  applyTemplatePaperSettings,
  defaultPageSafeArea,
  normalizeBooleanValue,
  normalizePageMarginValue,
  normalizePageSafeArea,
  pageMarginFields,
} from "./layout-settings.js";
import { deepClone } from "./state.js";

export function createTemplateEditorStateActions({ appState, canManageTemplates, onStateChange }) {
  function mutateEditorTemplate(mutator) {
    if (!canManageTemplates()) {
      return;
    }

    if (!appState.templateEditor.template) {
      return;
    }

    const nextTemplate = deepClone(appState.templateEditor.template);
    mutator(nextTemplate);
    appState.templateEditor.template = nextTemplate;
    appState.templateEditor.isDirty = true;
    hideToast();
  }

  function getSelectedPageFromTemplate(template) {
    return (
      template.layout.pages.find((page) => page.id === appState.templateEditor.selectedPageId) ||
      template.layout.pages[0]
    );
  }

  function updateTemplateField(field, value) {
    mutateEditorTemplate((template) => {
      template[field] = String(value || "");

      if (field === "paperPreset" || field === "orientation") {
        applyTemplatePaperSettings(template);
      }

      if (field === "generationUnit" && template.layout?.generation) {
        template.layout.generation.unit = template.generationUnit;
      }
    });
    onStateChange();
  }

  function updateSelectedPageField(field, value) {
    mutateEditorTemplate((template) => {
      const selectedPage = getSelectedPageFromTemplate(template);

      if (!selectedPage) {
        return;
      }

      if (field === "enabled" || field === "repeatable") {
        selectedPage[field] = normalizeBooleanValue(value, selectedPage[field] ?? true);
        return;
      }

      selectedPage[field] = String(value || "");
    });
    onStateChange();
  }

  function updateSelectedPageMarginField(field, value) {
    if (!pageMarginFields.has(field)) {
      return;
    }

    mutateEditorTemplate((template) => {
      const selectedPage = getSelectedPageFromTemplate(template);

      if (!selectedPage) {
        return;
      }

      selectedPage.settings =
        selectedPage.settings && typeof selectedPage.settings === "object" ? selectedPage.settings : {};

      const currentSafeArea = normalizePageSafeArea(
        selectedPage.settings.safeArea,
        template.layout?.paper?.margin || defaultPageSafeArea,
      );

      selectedPage.settings.safeArea = {
        ...currentSafeArea,
        [field]: normalizePageMarginValue(value, currentSafeArea[field]),
      };
    });
    onStateChange();
  }

  function updateSelectedPageDocumentHtml(value, options = {}) {
    const targetPageId = options.pageId || appState.templateEditor.selectedPageId;
    const normalizedHtml = sanitizeEditableDocumentHtml(value);

    mutateEditorTemplate((template) => {
      const selectedPage =
        template.layout?.pages?.find((page) => page.id === targetPageId) || getSelectedPageFromTemplate(template);

      if (!selectedPage) {
        return;
      }

      selectedPage.settings =
        selectedPage.settings && typeof selectedPage.settings === "object" ? selectedPage.settings : {};
      selectedPage.settings.editorMode = "document";
      selectedPage.settings.documentHtml = normalizedHtml;
    });

    if (options.render !== false) {
      onStateChange();
    }

    return normalizedHtml;
  }

  return {
    updateSelectedPageDocumentHtml,
    updateSelectedPageField,
    updateSelectedPageMarginField,
    updateTemplateField,
  };
}
