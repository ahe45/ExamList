import { getDocumentOverflowMessage } from "./document-overflow.js";

export function createDocumentOverflowRuntime({ appState, getDocumentSurfaceByPageId }) {
  const documentLastValidHtmlByPageId = new Map();
  const documentOverflowStateByPageId = new Map();

  function clearDocumentOverflowRuntime() {
    documentLastValidHtmlByPageId.clear();
    documentOverflowStateByPageId.clear();
  }

  function syncDocumentOverflowUi(pageId = appState.templateEditor.selectedPageId) {
    const hasOverflow = Array.from(documentOverflowStateByPageId.values()).some(Boolean);
    const surface = getDocumentSurfaceByPageId(pageId);

    appState.templateEditor.hasDocumentOverflow = hasOverflow;
    surface?.classList.toggle("has-overflow", Boolean(documentOverflowStateByPageId.get(pageId)));

  }

  function setDocumentOverflowState(pageId, overflowInfo, message = "") {
    const hasOverflow = Boolean(overflowInfo?.hasOverflow);

    if (pageId) {
      documentOverflowStateByPageId.set(pageId, hasOverflow);
    }

    appState.templateEditor.documentOverflowMessage = message || (hasOverflow ? getDocumentOverflowMessage(overflowInfo) : "");
    syncDocumentOverflowUi(pageId);
  }

  function rememberValidDocumentHtml(pageId, html) {
    if (pageId) {
      documentLastValidHtmlByPageId.set(pageId, String(html || ""));
    }
  }

  function getLastValidDocumentHtml(pageId) {
    return pageId ? documentLastValidHtmlByPageId.get(pageId) || "" : "";
  }

  return {
    clearDocumentOverflowRuntime,
    getLastValidDocumentHtml,
    rememberValidDocumentHtml,
    setDocumentOverflowState,
    syncDocumentOverflowUi,
  };
}
