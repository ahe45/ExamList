import {
  areDataTagSampleValuesEqual,
  areDataTagEmptyValueDataEqual,
  buildDefaultDataTagEmptyValueData,
  buildDefaultDataTagSampleValues,
  createDataTagSettingsPayload,
  normalizeDataTagEmptyValueData,
  normalizeDataTagSampleValues,
  saveDataTagEmptyValueData,
  saveDataTagSampleValues,
} from "./data-tag-samples.js";
import { flattenTemplateTags } from "./data-tags-definitions.js";

const DATA_TAG_SAMPLE_MODAL_FOCUS_SELECTOR = [
  ".data-tag-sample-modal-overlay [data-data-tag-sample-key]",
  ".data-tag-sample-modal-overlay [data-data-tag-empty-value-key]",
  ".data-tag-sample-modal-overlay summary",
  ".data-tag-sample-modal-overlay button:not(:disabled)",
].join(", ");

function ensureDataTagSampleModalState(appState) {
  appState.templateEditor.dataTagSampleModal = {
    draftEmptyValueData: {},
    draftValues: {},
    isOpen: false,
    ...(appState.templateEditor.dataTagSampleModal || {}),
  };

  return appState.templateEditor.dataTagSampleModal;
}

function releaseTemplateEditorDocumentFocus() {
  if (typeof document === "undefined") {
    return;
  }

  const runtimeHost = document.getElementById("templateEditorRuntimeHost");
  const activeElement = document.activeElement;

  if (runtimeHost?.contains(activeElement) && typeof activeElement?.blur === "function") {
    activeElement.blur();
  }

  if (typeof window === "undefined" || typeof window.getSelection !== "function") {
    return;
  }

  const surfaceElement = document.getElementById("templateEditorSurface");
  const selection = window.getSelection();

  if (!surfaceElement || !selection) {
    return;
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;

  if ((anchorNode && surfaceElement.contains(anchorNode)) || (focusNode && surfaceElement.contains(focusNode))) {
    selection.removeAllRanges();
  }
}

function isFocusableDataTagModalElement(element) {
  if (!element || typeof element.focus !== "function" || element.disabled) {
    return false;
  }

  const tagName = String(element.tagName || "").toLowerCase();

  if (tagName !== "summary" && element.closest?.("details:not([open])")) {
    return false;
  }

  return element.getClientRects?.().length > 0 || element.offsetParent !== null;
}

function focusDataTagSampleModal() {
  if (typeof document === "undefined") {
    return;
  }

  const focusModalElement = () => {
    const focusableElement = Array.from(document.querySelectorAll(DATA_TAG_SAMPLE_MODAL_FOCUS_SELECTOR)).find(
      isFocusableDataTagModalElement,
    );

    if (!focusableElement) {
      return;
    }

    try {
      focusableElement.focus({ preventScroll: true });
    } catch (_error) {
      focusableElement.focus();
    }
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(focusModalElement);
    return;
  }

  setTimeout(focusModalElement, 0);
}

function getBaseTagDefinitions(appState) {
  return flattenTemplateTags(appState.templateEditor.dataTags);
}

function normalizeCurrentSampleValues(appState) {
  const definitions = getBaseTagDefinitions(appState);
  const normalizedValues = normalizeDataTagSampleValues(definitions, appState.templateEditor.dataTagSampleValues || {});

  appState.templateEditor.dataTagSampleValues = normalizedValues;
  return normalizedValues;
}

function normalizeCurrentEmptyValueData(appState) {
  const definitions = getBaseTagDefinitions(appState);
  const normalizedValues = normalizeDataTagEmptyValueData(definitions, appState.templateEditor.dataTagEmptyValueData || {});

  appState.templateEditor.dataTagEmptyValueData = normalizedValues;
  return normalizedValues;
}

function syncDataTagSettingsToTemplate(appState, { markDirty = true } = {}) {
  const template = appState.templateEditor.template;

  if (!template?.layout) {
    return;
  }

  const definitions = getBaseTagDefinitions(appState);
  template.layout.dataTagSettings = createDataTagSettingsPayload(definitions, {
    emptyValueData: appState.templateEditor.dataTagEmptyValueData || {},
    sampleData: appState.templateEditor.dataTagSampleValues || {},
  });

  if (markDirty) {
    appState.templateEditor.isDirty = true;
  }
}

export function createDataTagSampleActions({ appState, onSaveDataTagSettings = null, onStateChange }) {
  async function openDataTagSampleModal() {
    const modalState = ensureDataTagSampleModalState(appState);
    const currentValues = normalizeCurrentSampleValues(appState);
    const currentEmptyValueData = normalizeCurrentEmptyValueData(appState);

    modalState.draftValues = { ...currentValues };
    modalState.draftEmptyValueData = { ...currentEmptyValueData };
    modalState.isOpen = true;
    releaseTemplateEditorDocumentFocus();
    await onStateChange();
    focusDataTagSampleModal();
  }

  async function closeDataTagSampleModal() {
    const modalState = ensureDataTagSampleModalState(appState);

    modalState.draftEmptyValueData = {};
    modalState.draftValues = {};
    modalState.isOpen = false;
    await onStateChange();
  }

  function updateDataTagSampleDraftValue(key = "", value = "", settingKind = "sample") {
    const normalizedKey = String(key || "").trim();

    if (!normalizedKey) {
      return;
    }

    const modalState = ensureDataTagSampleModalState(appState);

    if (settingKind === "empty") {
      modalState.draftEmptyValueData = {
        ...(modalState.draftEmptyValueData || {}),
        [normalizedKey]: String(value ?? ""),
      };
      return;
    }

    modalState.draftValues = {
      ...(modalState.draftValues || {}),
      [normalizedKey]: String(value ?? ""),
    };
  }

  async function resetDataTagSampleModal() {
    const modalState = ensureDataTagSampleModalState(appState);

    modalState.draftValues = buildDefaultDataTagSampleValues(getBaseTagDefinitions(appState));
    modalState.draftEmptyValueData = buildDefaultDataTagEmptyValueData(getBaseTagDefinitions(appState));
    modalState.isOpen = true;
    releaseTemplateEditorDocumentFocus();
    await onStateChange();
    focusDataTagSampleModal();
  }

  async function saveDataTagSampleModal() {
    const definitions = getBaseTagDefinitions(appState);
    const modalState = ensureDataTagSampleModalState(appState);
    const nextValues = saveDataTagSampleValues(definitions, modalState.draftValues || {});
    const nextEmptyValueData = saveDataTagEmptyValueData(definitions, modalState.draftEmptyValueData || {});

    appState.templateEditor.dataTagSampleValues = nextValues;
    appState.templateEditor.dataTagEmptyValueData = nextEmptyValueData;
    const shouldPersistImmediately = typeof onSaveDataTagSettings === "function";

    syncDataTagSettingsToTemplate(appState, { markDirty: !shouldPersistImmediately });

    if (shouldPersistImmediately) {
      const didSave = await onSaveDataTagSettings();

      if (didSave === false) {
        appState.templateEditor.isDirty = true;
        await onStateChange();
        return;
      }
    }

    modalState.draftEmptyValueData = {};
    modalState.draftValues = {};
    modalState.isOpen = false;
    await onStateChange();
  }

  function isDataTagSampleModalDirty() {
    const definitions = getBaseTagDefinitions(appState);
    const modalState = ensureDataTagSampleModalState(appState);

    return !areDataTagSampleValuesEqual(
      definitions,
      normalizeCurrentSampleValues(appState),
      modalState.draftValues || {},
    ) || !areDataTagEmptyValueDataEqual(
      definitions,
      normalizeCurrentEmptyValueData(appState),
      modalState.draftEmptyValueData || {},
    );
  }

  return Object.freeze({
    closeDataTagSampleModal,
    isDataTagSampleModalDirty,
    openDataTagSampleModal,
    resetDataTagSampleModal,
    saveDataTagSampleModal,
    updateDataTagSampleDraftValue,
  });
}
