import {
  bindCandidateBlockGridControls,
} from "./candidate-block-grid-adapter.js";
import { bindFontSizeStepper, bindLineHeightControl } from "./editor-text-controls.js";
import { bindGeneratedObjectSourceControl } from "./generated-object-source-control.js";
import { bindObjectAlignmentControls, bindObjectSizeControls } from "./object-toolbar-controls.js";
import { bindOtherRoomPageControls } from "./other-room-page-controls.js";
import { bindPageNumberControls } from "./page-number-controls.js";
import { bindRecognitionMarksControls } from "./recognition-marks-controls.js";
import {
  bindCoverPageControls,
  bindTemplateMetadataControls,
} from "./editor-runtime-page-controls.js";
import { bindDocumentWrapperNormalization } from "./template-document-normalizer.js";

function isContentTemplatePage(page) {
  return String(page?.type || "").trim() === "content";
}

export function orderContentPagePropertySections({ pagePropertiesHost, selectedPage } = {}) {
  if (!pagePropertiesHost || !isContentTemplatePage(selectedPage)) {
    return;
  }

  [
    ".examlist-candidate-block-grid-field",
    ".examlist-generation-unit-field",
    ".examlist-other-room-page-field",
    ".examlist-page-number-field",
    ".examlist-recognition-marks-field",
  ].forEach((selector) => {
    const sectionElement = pagePropertiesHost.querySelector(selector);

    if (sectionElement) {
      pagePropertiesHost.append(sectionElement);
    }
  });
}

export function createEditorRuntimeDisposerState() {
  return {
    candidateBlockGrid: null,
    candidateBlockGridReadOnly: null,
    coverPage: null,
    documentWrapper: null,
    formatToolbar: null,
    fontSize: null,
    generatedObjectSource: null,
    lineHeight: null,
    objectAlignment: null,
    objectSize: null,
    otherRoomPage: null,
    pageNumber: null,
    recognitionMarks: null,
    templateMetadata: null,
  };
}

function getEditorFormatToolbarGroup(toolbarHost) {
  return (
    toolbarHost?.querySelector?.("[data-editor-format-toolbar-group]") ||
    Array.from(toolbarHost?.querySelectorAll?.(".template-toolbar-group") || []).find(
      (groupElement) => groupElement.querySelector?.(".template-toolbar-group-label")?.textContent.trim() === "서식",
    ) ||
    null
  );
}

function hasEditorObjectSelection(surfaceElement) {
  const ownerDocument = surfaceElement?.ownerDocument || (typeof document !== "undefined" ? document : null);
  const selectedObjectSelector = [
    "img.is-selected-object",
    "table.is-selected-object",
    "table.is-selected-table-object",
    "[data-candidate-block-grid].is-selected-candidate-block-grid",
    ".examlist-candidate-block-grid.is-selected-candidate-block-grid",
  ].join(",");
  const selectedModalObjectSelector = [
    "[data-candidate-block-modal-editor-surface] img.is-selected-object",
    "[data-candidate-block-modal-editor-surface] table.is-selected-object",
    "[data-candidate-block-modal-editor-surface] table.is-selected-table-object",
  ].join(",");

  return Boolean(
    surfaceElement?.querySelector?.(selectedObjectSelector) ||
      ownerDocument?.querySelector?.(selectedModalObjectSelector),
  );
}

function closeEditorFormatToolbarPanels(formatGroupElement) {
  formatGroupElement
    ?.querySelectorAll?.(".template-toolbar-combo-menu:not(.hidden), .template-toolbar-color-panel:not(.hidden)")
    .forEach((panelElement) => {
      panelElement.classList.add("hidden");
    });

  formatGroupElement
    ?.querySelectorAll?.(".template-toolbar-font-family-combo.open, .template-toolbar-font-size-combo.open, .template-toolbar-color-picker.open")
    .forEach((panelHostElement) => {
      panelHostElement.classList.remove("open");
    });

  formatGroupElement
    ?.querySelectorAll?.("[aria-expanded='true']")
    .forEach((expandedElement) => {
      expandedElement.setAttribute("aria-expanded", "false");
    });
}

function setEditorFormatToolbarDisabled(formatGroupElement, isDisabled) {
  if (!formatGroupElement) {
    return;
  }

  formatGroupElement.classList.toggle("is-disabled", isDisabled);
  formatGroupElement.setAttribute("aria-disabled", isDisabled ? "true" : "false");

  formatGroupElement.querySelectorAll("button, input, select, textarea").forEach((controlElement) => {
    if ("disabled" in controlElement) {
      controlElement.disabled = isDisabled;
    }

    controlElement.setAttribute("aria-disabled", isDisabled ? "true" : "false");
  });

  if (isDisabled) {
    closeEditorFormatToolbarPanels(formatGroupElement);
  }
}

function bindFormatToolbarObjectSelectionState({ surfaceElement, toolbarHost }) {
  const ownerDocument = surfaceElement?.ownerDocument || (typeof document !== "undefined" ? document : null);
  const ownerWindow = ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
  let frameId = 0;

  const syncFormatToolbarState = () => {
    frameId = 0;
    setEditorFormatToolbarDisabled(getEditorFormatToolbarGroup(toolbarHost), hasEditorObjectSelection(surfaceElement));
  };
  const scheduleSync = () => {
    if (frameId) {
      return;
    }

    frameId = ownerWindow?.requestAnimationFrame
      ? ownerWindow.requestAnimationFrame(syncFormatToolbarState)
      : setTimeout(syncFormatToolbarState, 0);
  };

  syncFormatToolbarState();
  surfaceElement?.addEventListener?.("pointerdown", scheduleSync, true);
  surfaceElement?.addEventListener?.("click", scheduleSync, true);
  ownerDocument?.addEventListener?.("selectionchange", scheduleSync);

  return () => {
    if (frameId) {
      if (ownerWindow?.cancelAnimationFrame) {
        ownerWindow.cancelAnimationFrame(frameId);
      } else {
        clearTimeout(frameId);
      }
    }

    surfaceElement?.removeEventListener?.("pointerdown", scheduleSync, true);
    surfaceElement?.removeEventListener?.("click", scheduleSync, true);
    ownerDocument?.removeEventListener?.("selectionchange", scheduleSync);
  };
}

export function disposeEditorRuntimeControls(disposers) {
  Object.values(disposers || {}).forEach((dispose) => {
    if (typeof dispose === "function") {
      dispose();
    }
  });
}

export function ensureEditorRuntimeControls({
  appState,
  canEdit = true,
  disposers,
  editor,
  onDirty,
  pagePropertiesHost,
  selectedPage,
  surfaceElement,
  tagDefinitions,
  toolbarHost,
}) {
  if (!disposers.documentWrapper) {
    disposers.documentWrapper = bindDocumentWrapperNormalization({ editor, surfaceElement });
  }

  if (!disposers.formatToolbar) {
    disposers.formatToolbar = bindFormatToolbarObjectSelectionState({ surfaceElement, toolbarHost });
  }

  if (!disposers.lineHeight) {
    disposers.lineHeight = bindLineHeightControl({ editor, surfaceElement, toolbarHost });
  }

  if (!disposers.fontSize) {
    disposers.fontSize = bindFontSizeStepper({ editor, surfaceElement, toolbarHost });
  }

  if (!disposers.templateMetadata) {
    disposers.templateMetadata = bindTemplateMetadataControls({
      appState,
      onDirty,
      pagePropertiesHost,
    });
  }

  if (!disposers.coverPage) {
    disposers.coverPage = bindCoverPageControls({
      appState,
      onDirty,
      pagePropertiesHost,
      selectedPage,
    });
  }

  if (!disposers.pageNumber) {
    disposers.pageNumber = bindPageNumberControls({
      appState,
      onDirty,
      pagePropertiesHost,
      selectedPage,
      surfaceElement,
    });
  }

  if (!disposers.recognitionMarks) {
    disposers.recognitionMarks = bindRecognitionMarksControls({
      appState,
      onDirty,
      pagePropertiesHost,
      selectedPage,
      surfaceElement,
    });
  }

  if (!disposers.otherRoomPage) {
    disposers.otherRoomPage = bindOtherRoomPageControls({
      appState,
      onDirty,
      pagePropertiesHost,
      selectedPage,
    });
  }

  const candidateBlockGridReadOnly = !canEdit;

  if (disposers.candidateBlockGrid && disposers.candidateBlockGridReadOnly !== candidateBlockGridReadOnly) {
    disposers.candidateBlockGrid();
    disposers.candidateBlockGrid = null;
    disposers.candidateBlockGridReadOnly = null;
  }

  if (!disposers.candidateBlockGrid) {
    disposers.candidateBlockGrid = bindCandidateBlockGridControls({
      appState,
      editor,
      onDirty,
      pagePropertiesHost,
      readOnly: candidateBlockGridReadOnly,
      selectedPage,
      surfaceElement,
    });
    disposers.candidateBlockGridReadOnly = candidateBlockGridReadOnly;
  }

  if (!disposers.generatedObjectSource) {
    disposers.generatedObjectSource = bindGeneratedObjectSourceControl({
      editor,
      surfaceElement,
      tagDefinitions,
      toolbarHost,
    });
  }

  if (!disposers.objectSize) {
    disposers.objectSize = bindObjectSizeControls({
      editor,
      onDirty,
      selectedPage,
      surfaceElement,
      toolbarHost,
    });
  }

  if (!disposers.objectAlignment) {
    disposers.objectAlignment = bindObjectAlignmentControls({ editor, surfaceElement, toolbarHost });
  }

  orderContentPagePropertySections({ pagePropertiesHost, selectedPage });

  return disposers;
}

export function bindEditorRuntimeControls(options) {
  return ensureEditorRuntimeControls({
    ...options,
    disposers: createEditorRuntimeDisposerState(),
  });
}
