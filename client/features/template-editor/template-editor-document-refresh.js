import { serializeEditableDocumentRoot } from "./document-editor.js";
import { getDocumentSurfaceOverflowInfo } from "./document-overflow.js";
import { syncTemplateEditorObjectFlowObjects } from "./object-flow-reflow.js";

export function createTemplateEditorDocumentRefresh({
  appState,
  clearDocumentImageSelection,
  decorateDocumentSurfaceImages,
  getDocumentSurfaceByPageId,
  getUpdateDocumentFormattingControls,
  rememberValidDocumentHtml,
  setDocumentOverflowState,
  updateDocumentActiveCell,
  updateDocumentImageSelectionOverlay,
}) {
  return function refreshDocumentEditorRuntime(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface) {
      clearDocumentImageSelection({ pageId });
      return;
    }

    decorateDocumentSurfaceImages(surface);
    syncTemplateEditorObjectFlowObjects(surface.querySelector(".template-doc") || surface);

    if (appState.templateEditor.selectedImageElement && !surface.contains(appState.templateEditor.selectedImageElement)) {
      clearDocumentImageSelection({ pageId });
    }

    updateDocumentActiveCell(pageId);
    getUpdateDocumentFormattingControls()?.(pageId);
    updateDocumentImageSelectionOverlay(pageId);

    const currentHtml = serializeEditableDocumentRoot(surface);
    const overflowInfo = getDocumentSurfaceOverflowInfo(surface);

    if (!overflowInfo.hasOverflow) {
      rememberValidDocumentHtml(pageId, currentHtml);
      setDocumentOverflowState(pageId, overflowInfo, "");
    } else {
      setDocumentOverflowState(pageId, overflowInfo);
    }
  };
}
