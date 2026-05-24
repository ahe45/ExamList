import { getCandidateBlockGridConfig, resetCandidateBlockGridState, syncCandidateBlockTemplateFromSurface } from "./candidate-block-grid-adapter.js";
import {
  flattenTemplateTags,
  normalizeTokenLabels,
  renderGroupedDataTagPanel,
  resetDataTagPanelState,
} from "./data-tags-adapter.js";
import { normalizeDataTagSampleValues } from "./data-tag-samples.js";
import { dataTagViewOptionsEventName, getDataTagViewOptions, normalizeDataTagViewOptions } from "./data-tags-view-options.js";
import { bindEditorStatusToast } from "./editor-status-toast.js";
import { resetEditorTextControlState } from "./editor-text-controls.js";
import {
  buildGeneratedObjectPreviewData,
  patchGeneratedObjectController,
  resolveGeneratedObjectPreviewValue,
} from "./generated-object-controller-patch.js";
import { resetGeneratedObjectSourceControlState } from "./generated-object-source-control.js";
import { exposeEditorRuntimeAliases, editorRuntimeBaseUrl, loadEditorRuntimeLoader, removeGlobalEditorRuntimeStylesheets } from "./editor-runtime-loader.js";
import {
  applyPaperSettingsToTemplate,
  applySafeAreaToTemplate,
  buildInitialHtml,
  normalizeSavedRuntimeHtml,
  readRuntimePageSettingsFromHtml,
} from "./editor-runtime-document-state.js";
import { applyTemplateMetadataControlsToState, prependPageSwitcher, syncCoverPageDisabledState } from "./editor-runtime-page-controls.js";
import { templateEditorObjectMinimumSize } from "./object-toolbar-controls.js";
import { getPageNumberConfig } from "./page-number-controls.js";
import { getPageRecognitionMarksConfig } from "./recognition-marks-controls.js";
import { templateSampleCandidatePhotoPath } from "./sample-candidate-photo.js";
import { getSelectedPage } from "./state.js";
import {
  bindEditorRuntimeControls,
  createEditorRuntimeDisposerState,
  disposeEditorRuntimeControls,
  ensureEditorRuntimeControls,
} from "./editor-runtime-control-bindings.js";

let mountedEditor = null;
let mountedKey = "";
let mountedRoot = null;
let mountedTagDefinitions = [];
let mountedInitialPaperPreset = "";
let mountedDirty = false;
let mountedHasBaseline = false;
let mountedBaselineHtml = "";
let mountedBaselineBlockHtml = "";
let mountedStatusDisposer = null;
let mountedDataTagViewOptionsDisposer = null;
let mountedControlDisposers = createEditorRuntimeDisposerState();

function normalizeComparableHtml(value = "") {
  return String(value || "").trim();
}

function normalizeComparableTemplateValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeComparableTemplateValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = normalizeComparableTemplateValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

function stripRuntimeOwnedPageFields(template) {
  if (!template || typeof template !== "object") {
    return template;
  }

  const clone = structuredClone(template);
  const pages = Array.isArray(clone?.layout?.pages) ? clone.layout.pages : [];

  pages.forEach((page) => {
    if (!page.settings || typeof page.settings !== "object") {
      return;
    }

    delete page.settings.documentHtml;
    delete page.settings.editorMode;

    if (page.settings.candidateBlockGrid && typeof page.settings.candidateBlockGrid === "object") {
      delete page.settings.candidateBlockGrid.blockTemplateHtml;
    }
  });

  return clone;
}

function findTemplatePageById(template, pageId = "") {
  const pages = Array.isArray(template?.layout?.pages) ? template.layout.pages : [];
  const normalizedPageId = String(pageId || "");

  return pages.find((page) => String(page?.id || "") === normalizedPageId) || null;
}

function syncRuntimeOwnedSelectedPageFieldsToSavedSnapshot(appState, selectedPage, template = null) {
  const savedTemplate = appState?.templateEditor?.savedTemplateSnapshot || null;
  const savedPage = findTemplatePageById(savedTemplate, selectedPage?.id);

  if (!savedPage || !selectedPage?.settings || typeof selectedPage.settings !== "object") {
    return false;
  }

  savedPage.settings = {
    ...(savedPage.settings || {}),
  };
  savedPage.settings.documentHtml = selectedPage.settings.documentHtml;
  savedPage.settings.editorMode = selectedPage.settings.editorMode;

  if (selectedPage.settings.candidateBlockGrid && typeof selectedPage.settings.candidateBlockGrid === "object") {
    savedPage.settings.candidateBlockGrid = {
      ...(savedPage.settings.candidateBlockGrid || {}),
      blockTemplateHtml: selectedPage.settings.candidateBlockGrid.blockTemplateHtml,
    };
  } else if (savedPage.settings.candidateBlockGrid && typeof savedPage.settings.candidateBlockGrid === "object") {
    delete savedPage.settings.candidateBlockGrid.blockTemplateHtml;
  }

  if (selectedPage.settings.safeArea && typeof selectedPage.settings.safeArea === "object") {
    savedPage.settings.safeArea = structuredClone(selectedPage.settings.safeArea);
  }

  if (savedTemplate && template && typeof template === "object") {
    savedTemplate.paperPreset = template.paperPreset;
    savedTemplate.orientation = template.orientation;

    if (template.layout?.paper && savedTemplate.layout) {
      savedTemplate.layout.paper = structuredClone(template.layout.paper);
    }

    const currentPages = Array.isArray(template.layout?.pages) ? template.layout.pages : [];
    const savedPages = Array.isArray(savedTemplate.layout?.pages) ? savedTemplate.layout.pages : [];

    currentPages.forEach((page) => {
      const savedLayoutPage = savedPages.find((item) => String(item?.id || "") === String(page?.id || ""));

      if (!savedLayoutPage) {
        return;
      }

      savedLayoutPage.widthPt = page.widthPt;
      savedLayoutPage.heightPt = page.heightPt;
    });
  }

  return true;
}

function hasTemplateSnapshotChanges(appState) {
  const currentTemplate = appState?.templateEditor?.template || null;
  const savedTemplate = appState?.templateEditor?.savedTemplateSnapshot || null;

  if (!currentTemplate || !savedTemplate) {
    return Boolean(appState?.templateEditor?.isDirty || mountedDirty);
  }

  try {
    const currentComparable = stripRuntimeOwnedPageFields(currentTemplate);
    const savedComparable = stripRuntimeOwnedPageFields(savedTemplate);

    return JSON.stringify(normalizeComparableTemplateValue(currentComparable)) !==
      JSON.stringify(normalizeComparableTemplateValue(savedComparable));
  } catch (_error) {
    return Boolean(appState?.templateEditor?.isDirty || mountedDirty);
  }
}

function hasSelectedPageRuntimeChanges(appState, selectedPage, currentHtml) {
  if (!mountedHasBaseline) {
    return false;
  }

  const nextHtml = normalizeComparableHtml(currentHtml);

  if (mountedBaselineHtml !== nextHtml) {
    return true;
  }

  const nextBlockHtml = normalizeComparableHtml(selectedPage?.settings?.candidateBlockGrid?.blockTemplateHtml || "");

  return Boolean(mountedBaselineBlockHtml || nextBlockHtml) && mountedBaselineBlockHtml !== nextBlockHtml;
}

function updateMountedRuntimeBaseline(selectedPage, html = "") {
  mountedHasBaseline = true;
  mountedBaselineHtml = normalizeComparableHtml(html || normalizeSavedRuntimeHtml(mountedEditor?.getHtml?.() || "", mountedTagDefinitions));
  mountedBaselineBlockHtml = normalizeComparableHtml(selectedPage?.settings?.candidateBlockGrid?.blockTemplateHtml || "");
}

function updateSaveButtonState() {
  const saveButton = document.querySelector("[data-action='save-template-layout']");

  if (!saveButton) {
    return;
  }

  saveButton.textContent = mountedDirty ? "저장" : "저장";
}

function markTemplateEditorDirty(appState) {
  mountedDirty = true;
  if (appState?.templateEditor) {
    appState.templateEditor.isDirty = true;
  }
  updateSaveButtonState();
}

function updateMountedRuntimeDirtyState(appState, selectedPage, html) {
  const hasRuntimeChanges = hasSelectedPageRuntimeChanges(appState, selectedPage, html);

  mountedDirty = hasRuntimeChanges;

  if (appState?.templateEditor) {
    appState.templateEditor.isDirty = hasRuntimeChanges || hasTemplateSnapshotChanges(appState);
  }

  updateSaveButtonState();
  return mountedDirty;
}

export function unmountTemplateEditorRuntime() {
  resetDataTagPanelState();
  resetCandidateBlockGridState();
  resetEditorTextControlState();
  resetGeneratedObjectSourceControlState();

  disposeEditorRuntimeControls(mountedControlDisposers);

  if (mountedStatusDisposer) {
    mountedStatusDisposer();
  }

  if (mountedDataTagViewOptionsDisposer) {
    mountedDataTagViewOptionsDisposer();
  }

  if (mountedEditor?.destroy) {
    mountedEditor.destroy();
  }

  mountedEditor = null;
  mountedKey = "";
  mountedRoot = null;
  mountedTagDefinitions = [];
  mountedInitialPaperPreset = "";
  mountedDirty = false;
  mountedHasBaseline = false;
  mountedBaselineHtml = "";
  mountedBaselineBlockHtml = "";
  mountedStatusDisposer = null;
  mountedDataTagViewOptionsDisposer = null;
  mountedControlDisposers = createEditorRuntimeDisposerState();
  delete window.ExamListTemplateEditorRuntime;
}

function applyMountedDataTagViewOptions(surfaceElement = document.getElementById("templateEditorSurface")) {
  if (!surfaceElement) {
    return;
  }

  normalizeTokenLabels(surfaceElement, mountedTagDefinitions, getDataTagViewOptions());
}

function uniqueDisplayDefinitionCandidates(values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function findMountedTagDefinitionForDisplay(runtimeDefinition = {}) {
  const candidates = uniqueDisplayDefinitionCandidates([
    runtimeDefinition.key,
    runtimeDefinition.dataKey,
    runtimeDefinition.sourceKey,
    runtimeDefinition.examineeKey,
    runtimeDefinition.token,
    runtimeDefinition.label,
    ...(Array.isArray(runtimeDefinition.aliases) ? runtimeDefinition.aliases : []),
  ]);

  if (candidates.length === 0) {
    return null;
  }

  return mountedTagDefinitions.find((definition) => {
    const definitionCandidates = uniqueDisplayDefinitionCandidates([
      definition.key,
      definition.dataKey,
      definition.sourceKey,
      definition.examineeKey,
      definition.token,
      definition.label,
      ...(Array.isArray(definition.aliases) ? definition.aliases : []),
    ]);

    return definitionCandidates.some((candidate) => candidates.includes(candidate));
  }) || null;
}

function getMountedTemplateTagDisplay({ definition } = {}) {
  const options = normalizeDataTagViewOptions(getDataTagViewOptions());
  const runtimeDefinition = definition && typeof definition === "object" ? definition : {};
  const displayDefinition = findMountedTagDefinitionForDisplay(runtimeDefinition) || runtimeDefinition;
  const sampleText = String(displayDefinition.example || "").trim();
  const labelText = String(displayDefinition.label || displayDefinition.key || displayDefinition.token || "").trim();
  const displayText = options.showSampleData && sampleText ? sampleText : labelText;

  return {
    hideIcons: !options.showIcons,
    iconMarkup: options.showIcons ? String(displayDefinition.iconMarkup || "") : "",
    sampleDisplay: options.showSampleData,
    text: displayText,
    title: [displayDefinition.label, displayDefinition.example].map((value) => String(value || "").trim()).filter(Boolean).join(" · "),
  };
}

function getMountedTagDefinitions(appState) {
  const editorState = appState?.templateEditor || {};
  const baseDefinitions = flattenTemplateTags(editorState.dataTags);
  const sampleValues = normalizeDataTagSampleValues(baseDefinitions, editorState.dataTagSampleValues || {});

  editorState.dataTagSampleValues = sampleValues;
  return flattenTemplateTags(editorState.dataTags, sampleValues);
}

function getCurrentMountedSelectedPage(appState, fallbackPage = null) {
  const pages = appState?.templateEditor?.template?.layout?.pages;

  if (!Array.isArray(pages) || pages.length === 0) {
    return fallbackPage;
  }

  const selectedPageId = String(appState?.templateEditor?.selectedPageId || fallbackPage?.id || "");
  return pages.find((page) => String(page.id || "") === selectedPageId) ||
    pages.find((page) => String(page.id || "") === String(fallbackPage?.id || "")) ||
    fallbackPage;
}

function syncMountedRuntimeHtmlToState(appState, fallbackPage, html) {
  const selectedPage = getCurrentMountedSelectedPage(appState, fallbackPage);

  if (!selectedPage) {
    return;
  }

  selectedPage.settings = {
    ...(selectedPage.settings || {}),
    documentHtml: normalizeSavedRuntimeHtml(html, mountedTagDefinitions),
    editorMode: "document",
  };
}

function bindDataTagViewOptionsChanges(surfaceElement) {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return null;
  }

  const handleOptionsChange = () => {
    applyMountedDataTagViewOptions(surfaceElement);
  };

  window.addEventListener(dataTagViewOptionsEventName, handleOptionsChange);

  return () => window.removeEventListener(dataTagViewOptionsEventName, handleOptionsChange);
}

export async function mountTemplateEditorRuntime({ access, appState } = {}) {
  const rootElement = document.getElementById("templateEditorRuntimeHost");
  const toolbarHost = document.getElementById("templateEditorToolbarHost");
  const surfaceElement = document.getElementById("templateEditorSurface");
  const tagHost = document.getElementById("templateTagStrip");
  const pagePropertiesHost = document.getElementById("templatePagePropertiesPanel");
  const template = appState?.templateEditor?.template || null;
  const selectedPage = getSelectedPage(appState?.templateEditor);

  if (!rootElement || !toolbarHost || !surfaceElement || !tagHost || !pagePropertiesHost || !template || !selectedPage) {
    unmountTemplateEditorRuntime();
    return null;
  }

  const nextMountedKey = `${template.id || ""}:${selectedPage.id || ""}`;
  const canEdit = access?.permissions?.manageTemplates !== false;

  if (mountedEditor && mountedRoot === rootElement && mountedKey === nextMountedKey) {
    mountedTagDefinitions = getMountedTagDefinitions(appState);
    patchGeneratedObjectController({ getTagDefinitions: () => mountedTagDefinitions });
    applyMountedDataTagViewOptions(surfaceElement);
    renderGroupedDataTagPanel(tagHost, mountedTagDefinitions, canEdit);
    prependPageSwitcher(pagePropertiesHost, appState.templateEditor);
    mountedControlDisposers = ensureEditorRuntimeControls({
      appState,
      disposers: mountedControlDisposers,
      editor: mountedEditor,
      onDirty: () => markTemplateEditorDirty(appState),
      pagePropertiesHost,
      selectedPage,
      surfaceElement,
      tagDefinitions: mountedTagDefinitions,
      toolbarHost,
    });
    syncCoverPageDisabledState({ pagePropertiesHost, selectedPage, surfaceElement });
    return mountedEditor;
  }

  unmountTemplateEditorRuntime();

  const tagDefinitions = getMountedTagDefinitions(appState);
  const loader = await loadEditorRuntimeLoader();
  await loader.load?.({ baseUrl: editorRuntimeBaseUrl, includePreset: false });
  exposeEditorRuntimeAliases();
  mountedTagDefinitions = tagDefinitions;
  patchGeneratedObjectController({ getTagDefinitions: () => mountedTagDefinitions });
  const editor = await loader.createTemplateEditor({
    baseUrl: editorRuntimeBaseUrl,
    generatedObjectSourceKey: "candidate.examNo",
    getGeneratedObjectValue: (record, sourceKey) => resolveGeneratedObjectPreviewValue(record, sourceKey, mountedTagDefinitions),
    getSchoolLogoDataUrl: () => String(appState?.schoolSettings?.logoDataUrl || "").trim(),
    getTemplateEditorTagDisplay: getMountedTemplateTagDisplay,
    includePreset: false,
    imageMinSize: templateEditorObjectMinimumSize,
    initialHtml: buildInitialHtml(selectedPage, template, tagDefinitions),
    pagePropertiesHost,
    previewPhotoPath: templateSampleCandidatePhotoPath,
    getPreviewData: () => buildGeneratedObjectPreviewData(mountedTagDefinitions),
    root: rootElement,
    surface: surfaceElement,
    tagHost,
    tags: tagDefinitions,
    toolbarHost,
    onSetHtml(html) {
      syncMountedRuntimeHtmlToState(appState, selectedPage, html);
    },
    onChange(html) {
      const selectedMountedPage = getCurrentMountedSelectedPage(appState, selectedPage);
      const normalizedHtml = normalizeSavedRuntimeHtml(html, mountedTagDefinitions);

      syncMountedRuntimeHtmlToState(appState, selectedPage, html);
      updateMountedRuntimeDirtyState(appState, selectedMountedPage, normalizedHtml);
      window.requestAnimationFrame(() => {
        const currentSelectedPage = getCurrentMountedSelectedPage(appState, selectedPage);

        syncCandidateBlockTemplateFromSurface(surfaceElement, currentSelectedPage);
        applyMountedDataTagViewOptions(surfaceElement);
        updateMountedRuntimeDirtyState(appState, currentSelectedPage, normalizedHtml);
      });
    },
  });
  renderGroupedDataTagPanel(tagHost, tagDefinitions, canEdit);
  removeGlobalEditorRuntimeStylesheets();
  prependPageSwitcher(pagePropertiesHost, appState.templateEditor);

  mountedEditor = editor;
  mountedKey = nextMountedKey;
  mountedRoot = rootElement;
  mountedTagDefinitions = tagDefinitions;
  mountedInitialPaperPreset = String(template.paperPreset || "");
  mountedDirty = false;
  mountedStatusDisposer = bindEditorStatusToast(surfaceElement);
  mountedDataTagViewOptionsDisposer = bindDataTagViewOptionsChanges(surfaceElement);
  mountedControlDisposers = bindEditorRuntimeControls({
    appState,
    editor,
    onDirty: () => markTemplateEditorDirty(appState),
    pagePropertiesHost,
    selectedPage,
    surfaceElement,
    tagDefinitions,
    toolbarHost,
  });
  window.ExamListTemplateEditorRuntime = editor;
  applyMountedDataTagViewOptions(surfaceElement);

  if (!canEdit) {
    surfaceElement.setAttribute("contenteditable", "false");
    toolbarHost.querySelectorAll("button, input, select").forEach((control) => {
      control.disabled = true;
    });
    pagePropertiesHost.querySelectorAll(".examlist-generation-unit-field button, .examlist-generation-unit-field input, .examlist-generation-unit-field select, .examlist-cover-page-field input, .examlist-page-number-field button, .examlist-page-number-field input, .examlist-page-number-field select, .examlist-recognition-marks-field button, .examlist-recognition-marks-field input, .examlist-recognition-marks-field select, .examlist-other-room-page-field button, .examlist-other-room-page-field input, .examlist-other-room-page-field select, .examlist-candidate-block-grid-field button, .examlist-candidate-block-grid-field input, .examlist-candidate-block-grid-field select").forEach((control) => {
      control.disabled = true;
    });
  }

  syncCoverPageDisabledState({ pagePropertiesHost, selectedPage, surfaceElement });
  syncCandidateBlockTemplateFromSurface(surfaceElement, selectedPage, null, { allowFallback: true });
  syncRuntimeOwnedSelectedPageFieldsToSavedSnapshot(appState, selectedPage, template);
  updateMountedRuntimeBaseline(selectedPage);
  mountedDirty = false;
  appState.templateEditor.isDirty = false;
  updateSaveButtonState();

  return editor;
}

export function resetTemplateEditorRuntimeDirtyBaseline({ appState } = {}) {
  const selectedPage = getSelectedPage(appState?.templateEditor);

  if (!mountedEditor || !selectedPage) {
    return false;
  }

  const html = normalizeSavedRuntimeHtml(mountedEditor.getHtml(), mountedTagDefinitions);

  updateMountedRuntimeBaseline(selectedPage, html);
  mountedDirty = false;

  if (appState?.templateEditor) {
    appState.templateEditor.isDirty = false;
  }

  updateSaveButtonState();
  return true;
}

export function clearTemplateEditorRuntimeDirtyState({ appState } = {}) {
  mountedDirty = false;

  if (appState?.templateEditor) {
    appState.templateEditor.isDirty = false;
  }

  updateSaveButtonState();
}

export function clearTemplateEditorRuntimeDirtyStateIfAtBaseline({ appState } = {}) {
  const selectedPage = getSelectedPage(appState?.templateEditor);

  if (!mountedEditor || !selectedPage) {
    return false;
  }

  const html = normalizeSavedRuntimeHtml(mountedEditor.getHtml(), mountedTagDefinitions);

  if (hasSelectedPageRuntimeChanges(appState, selectedPage, html)) {
    return false;
  }

  clearTemplateEditorRuntimeDirtyState({ appState });
  return true;
}

export function syncTemplateEditorRuntimeToState({ appState } = {}) {
  const template = appState?.templateEditor?.template || null;
  const selectedPage = getSelectedPage(appState?.templateEditor);
  const pagePropertiesHost = document.getElementById("templatePagePropertiesPanel");

  if (!mountedEditor || !template || !selectedPage) {
    return false;
  }

  applyTemplateMetadataControlsToState(appState, pagePropertiesHost);
  const hadSnapshotChangesBeforeRuntimeSync = hasTemplateSnapshotChanges(appState);
  syncCandidateBlockTemplateFromSurface(document.getElementById("templateEditorSurface"), selectedPage, null, { allowFallback: true });

  const html = normalizeSavedRuntimeHtml(mountedEditor.getHtml(), mountedTagDefinitions);
  const settings = readRuntimePageSettingsFromHtml(html);
  const candidateBlockGridConfig = getCandidateBlockGridConfig(selectedPage);
  const nextPageSettings = {
    ...(selectedPage.settings || {}),
    documentHtml: html,
    editorMode: "document",
  };

  if (String(selectedPage.type || "").trim() === "content" || selectedPage.settings?.candidateBlockGrid) {
    nextPageSettings.candidateBlockGrid = candidateBlockGridConfig;
  }

  selectedPage.settings = nextPageSettings;

  if (selectedPage.settings.recognitionMarks || getPageRecognitionMarksConfig(selectedPage).enabled) {
    selectedPage.settings.recognitionMarks = getPageRecognitionMarksConfig(selectedPage);
  }

  if (selectedPage.settings.pageNumber || getPageNumberConfig(selectedPage).enabled) {
    selectedPage.settings.pageNumber = getPageNumberConfig(selectedPage);
  }

  applySafeAreaToTemplate(template, selectedPage, settings);
  applyPaperSettingsToTemplate(template, settings, mountedInitialPaperPreset);
  const hasRuntimeChanges = hasSelectedPageRuntimeChanges(appState, selectedPage, html);

  if (!hasRuntimeChanges && !hadSnapshotChangesBeforeRuntimeSync) {
    syncRuntimeOwnedSelectedPageFieldsToSavedSnapshot(appState, selectedPage, template);
  }

  mountedDirty = hasRuntimeChanges;
  appState.templateEditor.isDirty = hasRuntimeChanges || hasTemplateSnapshotChanges(appState);
  updateSaveButtonState();
  return true;
}
