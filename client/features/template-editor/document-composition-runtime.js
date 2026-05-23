export function createDocumentCompositionRuntime({
  appState,
  getDocumentSurfaceByPageId,
  getDocumentSurfacePageId,
  syncSelectedPageDocumentHtml,
}) {
  const composingDocumentPageIds = new Set();
  const pendingCompositionSyncPageIds = new Set();

  function resetDocumentCompositionRuntime() {
    composingDocumentPageIds.clear();
    pendingCompositionSyncPageIds.clear();
  }

  function isDocumentSurfaceComposing(surface, pageId = getDocumentSurfacePageId(surface)) {
    return Boolean((pageId && composingDocumentPageIds.has(pageId)) || surface?.dataset.documentComposing === "true");
  }

  function setDocumentCompositionState(surface, isComposing) {
    const pageId = getDocumentSurfacePageId(surface);

    if (!surface || !pageId) {
      return "";
    }

    if (isComposing) {
      composingDocumentPageIds.add(pageId);
      pendingCompositionSyncPageIds.delete(pageId);
      surface.dataset.documentComposing = "true";
      return pageId;
    }

    composingDocumentPageIds.delete(pageId);
    delete surface.dataset.documentComposing;
    return pageId;
  }

  function clearPendingDocumentCompositionSync(pageId) {
    if (pageId) {
      pendingCompositionSyncPageIds.delete(pageId);
    }
  }

  function scheduleDocumentCompositionSync(pageId = appState.templateEditor.selectedPageId) {
    if (!pageId || pendingCompositionSyncPageIds.has(pageId)) {
      return;
    }

    pendingCompositionSyncPageIds.add(pageId);
    window.requestAnimationFrame(() => {
      if (!pendingCompositionSyncPageIds.delete(pageId)) {
        return;
      }

      const surface = getDocumentSurfaceByPageId(pageId);

      if (!surface || isDocumentSurfaceComposing(surface, pageId)) {
        return;
      }

      syncSelectedPageDocumentHtml({
        forceHistory: true,
        pageId,
        render: false,
      });
    });
  }

  return {
    clearPendingDocumentCompositionSync,
    isDocumentSurfaceComposing,
    resetDocumentCompositionRuntime,
    scheduleDocumentCompositionSync,
    setDocumentCompositionState,
  };
}
