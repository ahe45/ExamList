import {
  findDataTagDefinitionByKey,
  getDataTagFormatInputError,
  getDataTagFormatType,
  normalizeDataTagFormat,
} from "./data-tag-format-options.js";

const defaultDataTagFormatModalState = Object.freeze({
  draftFormat: "",
  errorMessage: "",
  formatType: "",
  isOpen: false,
  isSupported: false,
  tagKey: "",
  tagLabel: "",
});

const DATA_TAG_FORMAT_MODAL_FOCUS_SELECTOR = [
  ".data-tag-format-modal-overlay [data-data-tag-format-field]",
  ".data-tag-format-modal-overlay button:not(:disabled)",
].join(", ");

function ensureDataTagFormatModalState(appState) {
  appState.templateEditor.dataTagFormatModal = {
    ...defaultDataTagFormatModalState,
    ...(appState.templateEditor.dataTagFormatModal || {}),
  };

  return appState.templateEditor.dataTagFormatModal;
}

function getTokenTagKey(tokenElement) {
  return String(tokenElement?.dataset?.templateTagValue || "").trim();
}

function getTokenOccurrenceIndex(surfaceElement, tokenElement, tagKey) {
  const tokenElements = Array.from(surfaceElement?.querySelectorAll?.(".template-token[data-template-tag-value]") || [])
    .filter((element) => getTokenTagKey(element) === tagKey);
  const occurrenceIndex = tokenElements.indexOf(tokenElement);

  return occurrenceIndex >= 0 ? occurrenceIndex : 0;
}

function createActiveTokenDescriptor(tokenElement, tagKey) {
  const surfaceElement = tokenElement?.closest?.("[data-editor-document-surface]");

  return {
    occurrenceIndex: getTokenOccurrenceIndex(surfaceElement, tokenElement, tagKey),
    pageId: String(surfaceElement?.dataset?.pageId || "").trim(),
    tagKey,
  };
}

function findCurrentTokenElement(activeTokenElement, activeTokenDescriptor) {
  if (activeTokenElement?.isConnected) {
    return activeTokenElement;
  }

  const surfaceElement = activeTokenDescriptor?.pageId
    ? Array.from(document.querySelectorAll("[data-editor-document-surface]"))
        .find((element) => String(element?.dataset?.pageId || "").trim() === activeTokenDescriptor.pageId)
    : document.getElementById("templateEditorSurface");
  const tokenElements = Array.from(surfaceElement?.querySelectorAll?.(".template-token[data-template-tag-value]") || [])
    .filter((element) => getTokenTagKey(element) === activeTokenDescriptor?.tagKey);

  return tokenElements[activeTokenDescriptor?.occurrenceIndex || 0] || null;
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

  if (typeof window !== "undefined" && typeof window.getSelection === "function") {
    window.getSelection()?.removeAllRanges?.();
  }
}

function focusDataTagFormatModal() {
  if (typeof document === "undefined") {
    return;
  }

  const focusModalElement = () => {
    const focusableElement = Array.from(document.querySelectorAll(DATA_TAG_FORMAT_MODAL_FOCUS_SELECTOR)).find(
      (element) => element && typeof element.focus === "function" && !element.disabled,
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

function resetModalState(modalState) {
  Object.assign(modalState, defaultDataTagFormatModalState);
}

export function createDataTagFormatActions({
  appState,
  canManageTemplates,
  onStateChange,
  syncSelectedPageDocumentHtml,
}) {
  let activeTokenElement = null;
  let activeTokenDescriptor = null;

  async function openDataTagFormatModal(tokenElement) {
    if (!canManageTemplates?.()) {
      return;
    }

    const tagKey = getTokenTagKey(tokenElement);

    if (!tagKey) {
      return;
    }

    const definition = findDataTagDefinitionByKey(appState.templateEditor.dataTags, tagKey) || { key: tagKey, label: tagKey };
    const formatType = getDataTagFormatType(definition);

    if (!formatType) {
      return false;
    }

    const modalState = ensureDataTagFormatModalState(appState);
    const draftFormat = normalizeDataTagFormat(formatType, tokenElement?.dataset?.templateTagFormat || "");

    activeTokenElement = tokenElement;
    activeTokenDescriptor = createActiveTokenDescriptor(tokenElement, tagKey);
    modalState.draftFormat = draftFormat;
    modalState.errorMessage = "";
    modalState.formatType = formatType;
    modalState.isOpen = true;
    modalState.isSupported = Boolean(formatType);
    modalState.tagKey = tagKey;
    modalState.tagLabel = String(definition.label || tagKey).trim() || tagKey;
    releaseTemplateEditorDocumentFocus();
    await onStateChange();
    focusDataTagFormatModal();
    return true;
  }

  async function closeDataTagFormatModal() {
    const modalState = ensureDataTagFormatModalState(appState);

    resetModalState(modalState);
    activeTokenElement = null;
    activeTokenDescriptor = null;
    await onStateChange();
  }

  function updateDataTagFormatDraftValue(formatValue = "") {
    const modalState = ensureDataTagFormatModalState(appState);
    const nextFormatValue = String(formatValue ?? "").slice(0, 60);

    modalState.draftFormat = nextFormatValue;
    modalState.errorMessage = getDataTagFormatInputError(modalState.formatType, nextFormatValue);
  }

  async function saveDataTagFormatModal() {
    const modalState = ensureDataTagFormatModalState(appState);
    const normalizedFormat = normalizeDataTagFormat(modalState.formatType, modalState.draftFormat);
    const tokenElement = findCurrentTokenElement(activeTokenElement, activeTokenDescriptor);
    const errorMessage = getDataTagFormatInputError(modalState.formatType, modalState.draftFormat);

    if (errorMessage) {
      modalState.errorMessage = errorMessage;
      await onStateChange();
      return;
    }

    if (tokenElement?.dataset && modalState.isSupported) {
      if (normalizedFormat) {
        tokenElement.dataset.templateTagFormatType = modalState.formatType;
        tokenElement.dataset.templateTagFormat = normalizedFormat;
      } else {
        delete tokenElement.dataset.templateTagFormatType;
        delete tokenElement.dataset.templateTagFormat;
      }

      syncSelectedPageDocumentHtml?.({ render: false });
    }

    resetModalState(modalState);
    activeTokenElement = null;
    activeTokenDescriptor = null;
    await onStateChange();
  }

  return Object.freeze({
    closeDataTagFormatModal,
    openDataTagFormatModal,
    saveDataTagFormatModal,
    updateDataTagFormatDraftValue,
  });
}
