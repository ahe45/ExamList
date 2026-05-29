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
    coverPage: null,
    documentWrapper: null,
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

export function disposeEditorRuntimeControls(disposers) {
  Object.values(disposers || {}).forEach((dispose) => {
    if (typeof dispose === "function") {
      dispose();
    }
  });
}

export function ensureEditorRuntimeControls({
  appState,
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
      onDirty,
      pagePropertiesHost,
      selectedPage,
      surfaceElement,
    });
  }

  if (!disposers.otherRoomPage) {
    disposers.otherRoomPage = bindOtherRoomPageControls({
      onDirty,
      pagePropertiesHost,
      selectedPage,
    });
  }

  if (!disposers.candidateBlockGrid) {
    disposers.candidateBlockGrid = bindCandidateBlockGridControls({
      appState,
      editor,
      onDirty,
      pagePropertiesHost,
      selectedPage,
      surfaceElement,
    });
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
    disposers.objectSize = bindObjectSizeControls({ editor, surfaceElement, toolbarHost });
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
