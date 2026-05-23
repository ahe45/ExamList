import {
  getPageDocumentHtml,
  serializeEditableDocumentRoot,
  syncEditableDocumentRoot,
} from "./document-editor.js";
import { getDocumentContentRoot } from "./document-overflow.js";

const documentHistoryLimit = 120;

export function createDocumentHistoryRuntime({
  appState,
  getClosestDocumentSurface,
  getDocumentSurfaceByPageId,
  refreshDocumentEditorRuntime,
  updateSelectedPageDocumentHtml,
}) {
  const documentHistoryStateByPageId = new Map();
  const documentSelectionSnapshotByPageId = new Map();
  let isRestoringDocumentHistory = false;
  let lastDocumentSelectionPageId = "";
  let lastDocumentSelectionRange = null;

  function getDocumentSelectionNodePath(surface, node) {
    if (!surface || !node) {
      return null;
    }

    const path = [];
    let currentNode = node;

    while (currentNode && currentNode !== surface) {
      const parentNode = currentNode.parentNode;

      if (!parentNode) {
        return null;
      }

      path.unshift(Array.prototype.indexOf.call(parentNode.childNodes, currentNode));
      currentNode = parentNode;
    }

    return currentNode === surface ? path : null;
  }

  function resolveDocumentSelectionNodePath(surface, path) {
    if (!surface || !Array.isArray(path)) {
      return null;
    }

    let currentNode = surface;

    path.forEach((index) => {
      currentNode = currentNode?.childNodes?.[index] || null;
    });

    return currentNode;
  }

  function getDocumentNodeMaxOffset(node) {
    if (!node) {
      return 0;
    }

    return node.nodeType === Node.TEXT_NODE ? node.textContent.length : node.childNodes.length;
  }

  function getTemplatePageById(pageId = appState.templateEditor.selectedPageId) {
    return appState.templateEditor.template?.layout?.pages?.find((page) => page.id === pageId) || null;
  }

  function initializeDocumentHistory(pageId, html = "", selection = null) {
    if (!pageId) {
      return;
    }

    documentHistoryStateByPageId.set(pageId, {
      entries: [{ html: String(html || ""), selection }],
      index: 0,
    });
  }

  function getDocumentHistoryState(pageId = appState.templateEditor.selectedPageId) {
    if (!pageId) {
      return null;
    }

    if (!documentHistoryStateByPageId.has(pageId)) {
      initializeDocumentHistory(pageId, getPageDocumentHtml(getTemplatePageById(pageId)));
    }

    return documentHistoryStateByPageId.get(pageId) || null;
  }

  function storeDocumentSelectionSnapshot(pageId, snapshot) {
    if (!pageId) {
      return;
    }

    if (snapshot) {
      documentSelectionSnapshotByPageId.set(pageId, snapshot);
      return;
    }

    documentSelectionSnapshotByPageId.delete(pageId);
  }

  function createDocumentSelectionSnapshot(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface) {
      return null;
    }

    const selection = window.getSelection();
    const activeRange =
      selection && selection.rangeCount > 0 && surface.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : lastDocumentSelectionRange && lastDocumentSelectionPageId === pageId && surface.contains(lastDocumentSelectionRange.startContainer)
          ? lastDocumentSelectionRange
          : null;

    if (!activeRange) {
      return documentSelectionSnapshotByPageId.get(pageId) || null;
    }

    const startPath = getDocumentSelectionNodePath(surface, activeRange.startContainer);
    const endPath = getDocumentSelectionNodePath(surface, activeRange.endContainer);

    if (!startPath || !endPath) {
      return documentSelectionSnapshotByPageId.get(pageId) || null;
    }

    return {
      collapsed: activeRange.collapsed,
      endOffset: activeRange.endOffset,
      endPath,
      startOffset: activeRange.startOffset,
      startPath,
    };
  }

  function restoreDocumentSelectionSnapshot(snapshot, pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface || !snapshot) {
      return false;
    }

    const startNode = resolveDocumentSelectionNodePath(surface, snapshot.startPath);
    const endNode = resolveDocumentSelectionNodePath(surface, snapshot.endPath);

    if (!startNode || !endNode) {
      return false;
    }

    const selection = window.getSelection();

    if (!selection) {
      return false;
    }

    const range = document.createRange();

    try {
      range.setStart(startNode, Math.min(snapshot.startOffset, getDocumentNodeMaxOffset(startNode)));
      range.setEnd(endNode, Math.min(snapshot.endOffset, getDocumentNodeMaxOffset(endNode)));
    } catch (error) {
      return false;
    }

    surface.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    lastDocumentSelectionRange = range.cloneRange();
    lastDocumentSelectionPageId = pageId;
    storeDocumentSelectionSnapshot(pageId, snapshot);
    return true;
  }

  function moveDocumentCaretToEnd(surface) {
    if (!surface) {
      return;
    }

    const contentRoot = getDocumentContentRoot(surface);

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const range = document.createRange();

    range.selectNodeContents(contentRoot || surface);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    lastDocumentSelectionRange = range.cloneRange();
    lastDocumentSelectionPageId = surface.dataset.pageId || "";
    storeDocumentSelectionSnapshot(lastDocumentSelectionPageId, createDocumentSelectionSnapshot(lastDocumentSelectionPageId));
  }

  function rememberDocumentSelection() {
    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);
    const surface = getClosestDocumentSurface(range.commonAncestorContainer);

    if (!surface) {
      return;
    }

    lastDocumentSelectionRange = range.cloneRange();
    lastDocumentSelectionPageId = surface.dataset.pageId || "";
    storeDocumentSelectionSnapshot(lastDocumentSelectionPageId, createDocumentSelectionSnapshot(lastDocumentSelectionPageId));
  }

  function getLastDocumentSelectionRange() {
    return lastDocumentSelectionRange;
  }

  function rememberDocumentRange(range, pageId = appState.templateEditor.selectedPageId) {
    if (!range || !pageId) {
      return;
    }

    lastDocumentSelectionRange = range.cloneRange();
    lastDocumentSelectionPageId = pageId;
    storeDocumentSelectionSnapshot(pageId, createDocumentSelectionSnapshot(pageId));
  }

  function restoreDocumentSelection(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface) {
      return null;
    }

    surface.focus();

    const selection = window.getSelection();

    if (!selection) {
      return surface;
    }

    if (restoreDocumentSelectionSnapshot(documentSelectionSnapshotByPageId.get(pageId) || null, pageId)) {
      return surface;
    }

    if (
      lastDocumentSelectionRange &&
      lastDocumentSelectionPageId === pageId &&
      surface.contains(lastDocumentSelectionRange.startContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(lastDocumentSelectionRange);
      return surface;
    }

    moveDocumentCaretToEnd(surface);
    return surface;
  }

  function recordDocumentHistorySnapshot(pageId = appState.templateEditor.selectedPageId, options = {}) {
    if (!pageId || isRestoringDocumentHistory) {
      return;
    }

    const historyState = getDocumentHistoryState(pageId);

    if (!historyState) {
      return;
    }

    const html = String(options.html ?? serializeEditableDocumentRoot(getDocumentSurfaceByPageId(pageId)));
    const selection = options.selection ?? createDocumentSelectionSnapshot(pageId);
    const currentEntry = historyState.entries[historyState.index];

    if (!options.force && currentEntry?.html === html) {
      if (currentEntry) {
        currentEntry.selection = selection;
      }
      return;
    }

    historyState.entries = historyState.entries.slice(0, historyState.index + 1);
    historyState.entries.push({ html, selection });

    if (historyState.entries.length > documentHistoryLimit) {
      historyState.entries.shift();
    }

    historyState.index = historyState.entries.length - 1;
  }

  function applyDocumentHistorySnapshot(pageId, snapshot) {
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface || !snapshot) {
      return false;
    }

    isRestoringDocumentHistory = true;
    surface.innerHTML = snapshot.html || "";
    syncEditableDocumentRoot(surface);
    updateSelectedPageDocumentHtml(serializeEditableDocumentRoot(surface), { render: false });

    if (!restoreDocumentSelectionSnapshot(snapshot.selection, pageId)) {
      moveDocumentCaretToEnd(surface);
    }

    refreshDocumentEditorRuntime(pageId);
    return true;
  }

  function undoDocumentHistory(pageId = appState.templateEditor.selectedPageId) {
    const historyState = getDocumentHistoryState(pageId);

    if (!historyState || historyState.index <= 0) {
      return;
    }

    historyState.index -= 1;
    applyDocumentHistorySnapshot(pageId, historyState.entries[historyState.index]);
  }

  function redoDocumentHistory(pageId = appState.templateEditor.selectedPageId) {
    const historyState = getDocumentHistoryState(pageId);

    if (!historyState || historyState.index >= historyState.entries.length - 1) {
      return;
    }

    historyState.index += 1;
    applyDocumentHistorySnapshot(pageId, historyState.entries[historyState.index]);
  }

  function resetDocumentHistoryRuntime() {
    documentHistoryStateByPageId.clear();
    documentSelectionSnapshotByPageId.clear();
    isRestoringDocumentHistory = false;
    lastDocumentSelectionPageId = "";
    lastDocumentSelectionRange = null;
  }

  function setLastDocumentSelectionPage(pageId) {
    lastDocumentSelectionPageId = String(pageId || "");
    lastDocumentSelectionRange = null;
  }

  function initializeDocumentHistoryForPage(page) {
    if (!page?.id) {
      return;
    }

    initializeDocumentHistory(page.id, getPageDocumentHtml(page));
  }

  return {
    createDocumentSelectionSnapshot,
    getDocumentHistoryState,
    getDocumentNodeMaxOffset,
    getLastDocumentSelectionRange,
    initializeDocumentHistory,
    initializeDocumentHistoryForPage,
    moveDocumentCaretToEnd,
    recordDocumentHistorySnapshot,
    redoDocumentHistory,
    rememberDocumentRange,
    rememberDocumentSelection,
    resetDocumentHistoryRuntime,
    restoreDocumentSelection,
    restoreDocumentSelectionSnapshot,
    setLastDocumentSelectionPage,
    undoDocumentHistory,
  };
}
