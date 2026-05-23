import { createDocumentImageMoveRuntime } from "./document-image-move-runtime.js";
import { createDocumentImagePositioningRuntime } from "./document-image-positioning-runtime.js";
import { createDocumentImageResizeRuntime } from "./document-image-resize-runtime.js";
import { createDocumentImageSelectionRuntime } from "./document-image-selection-runtime.js";

export function createDocumentImageRuntime({
  appState,
  clearDocumentActiveCell,
  getClosestDocumentSurface,
  getDocumentContentRoot,
  getDocumentScaleBoxByPageId,
  getDocumentSurfaceByPageId,
  syncSelectedPageDocumentHtml,
}) {
  const selectionRuntime = createDocumentImageSelectionRuntime({
    appState,
    clearDocumentActiveCell,
    getClosestDocumentSurface,
    getDocumentScaleBoxByPageId,
    getDocumentSurfaceByPageId,
  });
  const {
    clearDocumentImageSelection,
    decorateDocumentSurfaceImages,
    ensureDocumentImageOverlay,
    getDocumentImageTarget,
    selectDocumentImage,
    updateDocumentImageSelectionOverlay,
  } = selectionRuntime;
  const { prepareDocumentImageForFloatingPosition } = createDocumentImagePositioningRuntime({
    getDocumentContentRoot,
    getDocumentSurfaceByPageId,
  });
  const moveRuntime = createDocumentImageMoveRuntime({
    appState,
    clearDocumentImageSelection,
    getDocumentContentRoot,
    getDocumentSurfaceByPageId,
    prepareDocumentImageForFloatingPosition,
    selectDocumentImage,
    syncSelectedPageDocumentHtml,
    updateDocumentImageSelectionOverlay,
  });
  const resizeRuntime = createDocumentImageResizeRuntime({
    appState,
    clearDocumentImageSelection,
    ensureDocumentImageOverlay,
    getDocumentContentRoot,
    getDocumentSurfaceByPageId,
    prepareDocumentImageForFloatingPosition,
    selectDocumentImage,
    syncSelectedPageDocumentHtml,
    updateDocumentImageSelectionOverlay,
  });

  return Object.freeze({
    clearDocumentImageSelection,
    decorateDocumentSurfaceImages,
    getDocumentImageTarget,
    handleDocumentImageMove: moveRuntime.handleDocumentImageMove,
    handleDocumentImageResize: resizeRuntime.handleDocumentImageResize,
    releaseDocumentImageMoveSession: moveRuntime.releaseDocumentImageMoveSession,
    releaseDocumentImageResizeSession: resizeRuntime.releaseDocumentImageResizeSession,
    selectDocumentImage,
    startDocumentImageMoveSession: moveRuntime.startDocumentImageMoveSession,
    startDocumentImageResizeSession: resizeRuntime.startDocumentImageResizeSession,
    updateDocumentImageSelectionOverlay,
  });
}
