import { hideToast, showToast } from "../../app/toast.js";
import {
  resetTemplateEditorRuntimeDirtyBaseline,
  syncTemplateEditorRuntimeToState,
} from "./editor-runtime-adapter.js";
import {
  createDataTagEmptyValueDataPayload,
  createDataTagSampleValuesPayload,
  loadDataTagEmptyValueData,
  loadDataTagSampleValues,
} from "./data-tag-samples.js";
import { flattenTemplateTags } from "./data-tags-definitions.js";
import {
  loadTemplateEditorPayload,
  loadTemplatePreviewPayload,
  saveTemplateLayoutPayload,
} from "./template-api.js";

function cloneJsonValue(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return Array.isArray(value) ? [...value] : { ...value };
  }
}

function getPreferredTemplateEditorPageId(pages = [], preferredPageId = "") {
  const pageList = Array.isArray(pages) ? pages : [];
  const normalizedPreferredPageId = String(preferredPageId || "").trim();

  return (
    pageList.find((page) => String(page.id || "") === normalizedPreferredPageId)?.id ||
    pageList.find((page) => String(page.type || "").trim() === "content")?.id ||
    pageList[0]?.id ||
    ""
  );
}

export function createTemplateEditorPersistenceActions({
  appState,
  canManageTemplates,
  getCurrentSchoolId,
  hasPermission,
  initializeDocumentHistoryForPage,
  loadTemplateEditorRequest = loadTemplateEditorPayload,
  loadTemplatePreviewRequest = loadTemplatePreviewPayload,
  onStateChange,
  refreshDocumentEditorRuntime,
  resetDocumentEditorRuntime,
  saveTemplateLayoutRequest = saveTemplateLayoutPayload,
  setLastDocumentSelectionPage,
  syncDocumentOverflowUi,
  syncSelectedPageDocumentHtml,
  syncTemplateEditorRuntimeToStateAction = syncTemplateEditorRuntimeToState,
  templatesActions,
}) {
  let latestTemplateLoadRequestId = 0;

  function isCurrentTemplateLoadRequest(requestId, templateId) {
    if (requestId !== latestTemplateLoadRequestId) {
      return false;
    }

    const currentView = String(appState.currentView || appState.route?.view || "").trim();

    if (currentView && currentView !== "templateEditor") {
      return false;
    }

    const routeTemplateId = String(appState.route?.params?.templateId || "").trim();

    return !routeTemplateId || routeTemplateId === String(templateId || "").trim();
  }

  function applyDataTagSettingsToTemplateLayout(template) {
    if (!template?.layout) {
      return;
    }

    const tagDefinitions = flattenTemplateTags(appState.templateEditor.dataTags);

    template.layout.dataTagSettings = {
      emptyValueData: createDataTagEmptyValueDataPayload(
        tagDefinitions,
        appState.templateEditor.dataTagEmptyValueData || {},
      ),
      sampleData: createDataTagSampleValuesPayload(
        tagDefinitions,
        appState.templateEditor.dataTagSampleValues || {},
      ),
    };
  }

  function resetPreviewState() {
    appState.templateEditor.isPreviewLoading = false;
    appState.templateEditor.isPreviewOpen = false;
    appState.templateEditor.previewCandidateCount = 0;
    appState.templateEditor.previewErrorMessage = "";
    appState.templateEditor.previewHtml = "";
    appState.templateEditor.previewPageCount = 0;
    appState.templateEditor.previewPdfUrl = "";
    appState.templateEditor.previewWarnings = [];
  }

  async function loadTemplateEditor(templateId) {
    const loadRequestId = latestTemplateLoadRequestId + 1;
    latestTemplateLoadRequestId = loadRequestId;

    if (!templateId) {
      appState.templateEditor.errorMessage = "템플릿 ID가 없습니다.";
      appState.templateEditor.template = null;
      appState.templateEditor.lastLoadedTemplateId = "";
      resetDocumentEditorRuntime();
      resetPreviewState();
      await onStateChange();
      return;
    }

    appState.templateEditor.loading = true;
    appState.templateEditor.errorMessage = "";
    hideToast();
    resetPreviewState();

    try {
      const schoolId = getCurrentSchoolId();
      const { dataTags: dataTagPayload, template: templatePayload } = await loadTemplateEditorRequest({
        schoolId,
        templateId,
      });

      if (!isCurrentTemplateLoadRequest(loadRequestId, templateId)) {
        return;
      }

      const selectedPageId = getPreferredTemplateEditorPageId(templatePayload?.layout?.pages);
      const sampleTagDefinitions = flattenTemplateTags(dataTagPayload || { groups: [] });

      appState.templateEditor.dataTags = dataTagPayload || { groups: [] };
      appState.templateEditor.dataTagSampleModal = {
        draftEmptyValueData: {},
        draftValues: {},
        isOpen: false,
      };
      appState.templateEditor.generationUnitModal = {
        isOpen: false,
      };
      appState.templateEditor.dataTagSampleValues = loadDataTagSampleValues(
        sampleTagDefinitions,
        templatePayload?.layout?.dataTagSettings?.sampleData || null,
      );
      appState.templateEditor.dataTagEmptyValueData = loadDataTagEmptyValueData(
        sampleTagDefinitions,
        templatePayload?.layout?.dataTagSettings?.emptyValueData || null,
      );
      appState.templateEditor.errorMessage = "";
      appState.templateEditor.isDirty = false;
      appState.templateEditor.imageMoveSession = null;
      appState.templateEditor.imageResizeSession = null;
      appState.templateEditor.lastLoadedTemplateId = templateId;
      appState.templateEditor.savedTemplateSnapshot = cloneJsonValue(templatePayload);
      appState.templateEditor.selectedImageElement = null;
      appState.templateEditor.selectedPageId = selectedPageId;
      resetDocumentEditorRuntime();
      setLastDocumentSelectionPage(selectedPageId);
      appState.templateEditor.template = templatePayload;
      appState.ui.activeSchoolId = String(templatePayload.schoolId || appState.ui.activeSchoolId || "");
      (templatePayload?.layout?.pages || []).forEach(initializeDocumentHistoryForPage);
      appState.ui.activeTemplateId = templateId;
    } catch (error) {
      if (!isCurrentTemplateLoadRequest(loadRequestId, templateId)) {
        return;
      }

      appState.templateEditor.errorMessage = error.message;
      appState.templateEditor.savedTemplateSnapshot = null;
      appState.templateEditor.template = null;
      resetDocumentEditorRuntime();
      showToast(appState.templateEditor.errorMessage, { tone: "error" });
    } finally {
      if (!isCurrentTemplateLoadRequest(loadRequestId, templateId)) {
        return;
      }

      appState.templateEditor.loading = false;
      await onStateChange();
      refreshDocumentEditorRuntime();
    }
  }

  async function saveTemplateLayout() {
    if (!canManageTemplates()) {
      return;
    }

    if (!appState.templateEditor.template) {
      return;
    }

    const activeCandidateBlockModalEditor =
      typeof window !== "undefined" ? window.ExamListCandidateBlockModalEditor : null;

    if (
      activeCandidateBlockModalEditor?.isOpen?.() &&
      activeCandidateBlockModalEditor.syncActiveEditor?.({ validateOverflow: true }) === false
    ) {
      appState.templateEditor.hasDocumentOverflow = true;
      appState.templateEditor.documentOverflowMessage =
        "데이터 블록 영역을 초과한 상태에서는 저장할 수 없습니다. 저장 전 내용이나 개체 크기를 조정하세요.";
      await onStateChange();
      refreshDocumentEditorRuntime();
      return;
    }

    const syncedFromRuntime = syncTemplateEditorRuntimeToStateAction({ appState });

    if (!syncedFromRuntime) {
      syncSelectedPageDocumentHtml({
        collapseCandidateBlockGridForStorage: true,
        forceHistory: true,
        history: false,
        render: false,
        revertOnOverflow: false,
      });
    }

    if (appState.templateEditor.hasDocumentOverflow) {
      appState.templateEditor.documentOverflowMessage =
        appState.templateEditor.documentOverflowMessage ||
        "A4 용지 영역을 초과한 상태에서는 저장할 수 없습니다. 저장 전 내용 길이를 줄이세요.";
      syncDocumentOverflowUi();
      await onStateChange();
      refreshDocumentEditorRuntime();
      return;
    }

    const template = appState.templateEditor.template;

    if (!template) {
      return;
    }

    applyDataTagSettingsToTemplateLayout(template);

    appState.templateEditor.isSaving = true;
    hideToast();
    await onStateChange();

    let toastMessage = "";
    let toastOptions = {};

    try {
      const payload = await saveTemplateLayoutRequest({
        schoolId: getCurrentSchoolId(),
        template,
      });

      appState.templateEditor.errorMessage = "";
      appState.templateEditor.isDirty = false;
      appState.templateEditor.template = payload;
      appState.templateEditor.savedTemplateSnapshot = cloneJsonValue(payload);
      appState.templateEditor.selectedPageId =
        getPreferredTemplateEditorPageId(payload?.layout?.pages, appState.templateEditor.selectedPageId);
      resetTemplateEditorRuntimeDirtyBaseline({ appState });
      toastMessage = "양식을 저장했습니다.";
      await templatesActions.loadSummary({ silent: true });
      await templatesActions.loadTemplates({ silent: true });
    } catch (error) {
      appState.templateEditor.errorMessage = "";
      toastMessage = error.message;
      toastOptions = { tone: "error" };
    } finally {
      appState.templateEditor.isSaving = false;
      await onStateChange();
      if (!syncedFromRuntime) {
        refreshDocumentEditorRuntime();
      }
      showToast(toastMessage, toastOptions);
    }
  }

  function discardTemplateEditorChanges() {
    const currentTemplate = appState.templateEditor.template;
    const savedTemplate = appState.templateEditor.savedTemplateSnapshot || currentTemplate;

    if (!savedTemplate) {
      appState.templateEditor.isDirty = false;
      return;
    }

    const previousPageId = appState.templateEditor.selectedPageId;
    const template = cloneJsonValue(savedTemplate);
    const pages = Array.isArray(template?.layout?.pages) ? template.layout.pages : [];
    const selectedPageId = getPreferredTemplateEditorPageId(pages, previousPageId);

    appState.templateEditor.documentOverflowMessage = "";
    appState.templateEditor.hasDocumentOverflow = false;
    appState.templateEditor.imageMoveSession = null;
    appState.templateEditor.imageResizeSession = null;
    appState.templateEditor.isDirty = false;
    appState.templateEditor.selectedImageElement = null;
    appState.templateEditor.selectedPageId = selectedPageId;
    appState.templateEditor.template = template;
    resetDocumentEditorRuntime();
    setLastDocumentSelectionPage(selectedPageId);
    pages.forEach(initializeDocumentHistoryForPage);
  }

  async function saveDataTagSettings() {
    if (!canManageTemplates()) {
      return false;
    }

    const currentTemplate = appState.templateEditor.template;

    if (!currentTemplate) {
      return false;
    }

    const template = cloneJsonValue(appState.templateEditor.savedTemplateSnapshot || currentTemplate);

    if (!template?.layout) {
      return false;
    }

    applyDataTagSettingsToTemplateLayout(template);

    appState.templateEditor.isSavingDataTagSettings = true;
    hideToast();
    await onStateChange();

    let toastMessage = "";
    let toastOptions = {};

    try {
      const payload = await saveTemplateLayoutRequest({
        schoolId: getCurrentSchoolId(),
        template,
      });
      const persistedSettings = cloneJsonValue(payload?.layout?.dataTagSettings || template.layout.dataTagSettings || {
        emptyValueData: {},
        sampleData: {},
      });
      const activeTemplate = appState.templateEditor.template;

      appState.templateEditor.errorMessage = "";
      appState.templateEditor.savedTemplateSnapshot = cloneJsonValue(payload);

      if (activeTemplate) {
        activeTemplate.layout = {
          ...(activeTemplate.layout || {}),
          dataTagSettings: persistedSettings,
        };
        activeTemplate.latestVersionNo = payload?.latestVersionNo ?? activeTemplate.latestVersionNo;
        activeTemplate.updatedAt = payload?.updatedAt ?? activeTemplate.updatedAt;
      }

      toastMessage = "데이터 태그 설정을 저장했습니다.";
      await templatesActions.loadSummary({ silent: true });
      await templatesActions.loadTemplates({ silent: true });
      return true;
    } catch (error) {
      appState.templateEditor.errorMessage = "";
      toastMessage = error.message;
      toastOptions = { tone: "error" };
      return false;
    } finally {
      appState.templateEditor.isSavingDataTagSettings = false;
      await onStateChange();
      showToast(toastMessage, toastOptions);
    }
  }

  async function openTemplatePreview() {
    if (!hasPermission("previewTemplates")) {
      return;
    }

    const template = appState.templateEditor.template;

    if (!template) {
      return;
    }

    syncTemplateEditorRuntimeToState({ appState });
    appState.templateEditor.isPreviewOpen = true;
    appState.templateEditor.isPreviewLoading = true;
    appState.templateEditor.previewErrorMessage = "";
    appState.templateEditor.previewHtml = "";
    appState.templateEditor.previewPdfUrl = "";
    await onStateChange();

    try {
      const tagDefinitions = flattenTemplateTags(appState.templateEditor.dataTags, appState.templateEditor.dataTagSampleValues);
      const payload = await loadTemplatePreviewRequest({
        emptyValueData: createDataTagEmptyValueDataPayload(tagDefinitions, appState.templateEditor.dataTagEmptyValueData),
        sampleLimit: 60,
        sampleData: createDataTagSampleValuesPayload(tagDefinitions, appState.templateEditor.dataTagSampleValues),
        schoolId: getCurrentSchoolId(),
        template,
      });

      appState.templateEditor.previewCandidateCount = Number(payload?.candidateCount) || 0;
      appState.templateEditor.previewErrorMessage = "";
      appState.templateEditor.previewHtml = "";
      appState.templateEditor.previewPageCount = Number(payload?.pageCount) || 0;
      appState.templateEditor.previewPdfUrl = String(payload?.pdfUrl || "");
      appState.templateEditor.previewWarnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
    } catch (error) {
      appState.templateEditor.previewCandidateCount = 0;
      appState.templateEditor.previewErrorMessage = error.message;
      appState.templateEditor.previewHtml = "";
      appState.templateEditor.previewPageCount = 0;
      appState.templateEditor.previewPdfUrl = "";
      appState.templateEditor.previewWarnings = [];
      showToast(appState.templateEditor.previewErrorMessage, { tone: "error" });
    } finally {
      appState.templateEditor.isPreviewLoading = false;
      await onStateChange();
    }
  }

  function closeTemplatePreview() {
    appState.templateEditor.isPreviewOpen = false;
    onStateChange();
  }

  return Object.freeze({
    closeTemplatePreview,
    discardTemplateEditorChanges,
    loadTemplateEditor,
    openTemplatePreview,
    saveDataTagSettings,
    saveTemplateLayout,
  });
}
