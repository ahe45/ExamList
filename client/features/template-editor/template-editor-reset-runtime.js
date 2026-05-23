import { hideToast } from "../../app/toast.js";

export function createDocumentEditorRuntimeReset({
  appState,
  clearDocumentOverflowRuntime,
  resetDocumentCompositionRuntime,
  resetDocumentHistoryRuntime,
}) {
  return function resetDocumentEditorRuntime() {
    clearDocumentOverflowRuntime();
    resetDocumentCompositionRuntime();
    resetDocumentHistoryRuntime();
    appState.templateEditor.documentOverflowMessage = "";
    appState.templateEditor.hasDocumentOverflow = false;
    appState.templateEditor.imageMoveSession = null;
    appState.templateEditor.imageResizeSession = null;
    appState.templateEditor.selectedImageElement = null;
    hideToast();
  };
}
