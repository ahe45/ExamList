export function createDocumentSurfaceRuntime({ appState, getActiveDocumentTableCell }) {
  function getDocumentSurfaceByPageId(pageId = appState.templateEditor.selectedPageId) {
    if (!pageId) {
      return null;
    }

    return Array.from(document.querySelectorAll("[data-editor-document-surface]")).find(
      (node) => node.dataset.pageId === pageId,
    ) || null;
  }

  function getDocumentSurfacePageId(surface) {
    return surface?.dataset.pageId || appState.templateEditor.selectedPageId;
  }

  function getDocumentScaleBoxByPageId(pageId = appState.templateEditor.selectedPageId) {
    return getDocumentSurfaceByPageId(pageId)?.closest(".editor-paper-scale-box") || null;
  }

  function getClosestDocumentSurface(node) {
    let currentNode = node;

    while (currentNode) {
      if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.matches("[data-editor-document-surface]")) {
        return currentNode;
      }

      currentNode = currentNode.parentNode;
    }

    return null;
  }

  function clearDocumentActiveCell(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);

    surface?.querySelectorAll(".is-active-cell").forEach((cellElement) => {
      cellElement.classList.remove("is-active-cell");
    });
  }

  function updateDocumentActiveCell(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const activeCell = getActiveDocumentTableCell();

    if (!surface) {
      return;
    }

    surface.querySelectorAll(".is-active-cell").forEach((cellElement) => {
      cellElement.classList.toggle("is-active-cell", cellElement === activeCell);
    });

    if (activeCell && surface.contains(activeCell)) {
      activeCell.classList.add("is-active-cell");
    }
  }

  return {
    clearDocumentActiveCell,
    getClosestDocumentSurface,
    getDocumentScaleBoxByPageId,
    getDocumentSurfaceByPageId,
    getDocumentSurfacePageId,
    updateDocumentActiveCell,
  };
}
