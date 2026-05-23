function isDocumentWhitespaceTextNode(node) {
  return node?.nodeType === Node.TEXT_NODE && !String(node.textContent || "").trim();
}

function isDocumentTokenElement(node) {
  return node instanceof HTMLElement && node.matches(".template-token[data-template-tag-value]");
}

export function createDocumentTokenDeletionActions({
  appState,
  getActiveDocumentRange,
  getDocumentNodeMaxOffset,
  getDocumentSurfaceByPageId,
  rememberDocumentRange,
  syncSelectedPageDocumentHtml,
}) {
  function setCollapsedDocumentSelection(node, offset, pageId = appState.templateEditor.selectedPageId) {
    if (!node) {
      return false;
    }

    const selection = window.getSelection();

    if (!selection) {
      return false;
    }

    const range = document.createRange();

    try {
      range.setStart(node, Math.min(offset, getDocumentNodeMaxOffset(node)));
      range.collapse(true);
    } catch (error) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);
    rememberDocumentRange(range, pageId);
    return true;
  }

  function getDocumentSelectionToken(pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const range = getActiveDocumentRange(surface);

    if (!surface || !range || !range.collapsed) {
      return null;
    }

    const startNode = range.startContainer;

    if (!startNode || !surface.contains(startNode)) {
      return null;
    }

    if (isDocumentTokenElement(startNode)) {
      return startNode;
    }

    const tokenElement =
      startNode.nodeType === Node.ELEMENT_NODE
        ? startNode.closest?.(".template-token[data-template-tag-value]") || null
        : startNode.parentElement?.closest(".template-token[data-template-tag-value]") || null;

    return tokenElement && surface.contains(tokenElement) ? tokenElement : null;
  }

  function getDocumentAdjacentNode(parentNode, startIndex, direction) {
    if (!parentNode?.childNodes) {
      return null;
    }

    const step = direction === "backward" ? -1 : 1;
    let currentIndex = startIndex;

    while (currentIndex >= 0 && currentIndex < parentNode.childNodes.length) {
      const siblingNode = parentNode.childNodes[currentIndex];

      if (!isDocumentWhitespaceTextNode(siblingNode)) {
        return siblingNode;
      }

      currentIndex += step;
    }

    return null;
  }

  function getDocumentBoundaryToken(node, direction) {
    let currentNode = node || null;

    while (currentNode) {
      if (isDocumentWhitespaceTextNode(currentNode)) {
        return null;
      }

      if (isDocumentTokenElement(currentNode)) {
        return currentNode;
      }

      if (!(currentNode instanceof Element) || currentNode.childNodes.length === 0) {
        return null;
      }

      currentNode =
        direction === "backward"
          ? getDocumentAdjacentNode(currentNode, currentNode.childNodes.length - 1, "backward")
          : getDocumentAdjacentNode(currentNode, 0, "forward");
    }

    return null;
  }

  function getAdjacentDocumentToken(direction, pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const range = getActiveDocumentRange(surface);

    if (!surface || !range || !range.collapsed) {
      return null;
    }

    let currentNode = range.startContainer;
    let currentOffset = range.startOffset;

    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const textLength = currentNode.textContent?.length || 0;
        const isBoundary = direction === "backward" ? currentOffset === 0 : currentOffset === textLength;

        if (!isBoundary) {
          return null;
        }
      }

      const adjacentNode =
        currentNode.nodeType === Node.TEXT_NODE
          ? getDocumentAdjacentNode(
              currentNode.parentNode,
              Array.prototype.indexOf.call(currentNode.parentNode?.childNodes || [], currentNode) + (direction === "backward" ? -1 : 1),
              direction,
            )
          : getDocumentAdjacentNode(currentNode, direction === "backward" ? currentOffset - 1 : currentOffset, direction);
      const adjacentToken = getDocumentBoundaryToken(adjacentNode, direction);

      if (adjacentToken) {
        return adjacentToken;
      }

      if (adjacentNode) {
        return null;
      }

      if (currentNode === surface) {
        return null;
      }

      const parentNode = currentNode.parentNode;

      if (!parentNode || !surface.contains(parentNode)) {
        return null;
      }

      const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, currentNode);

      currentOffset = direction === "backward" ? currentIndex : currentIndex + 1;
      currentNode = parentNode;
    }

    return null;
  }

  function removeAdjacentDocumentToken(direction, pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const targetToken = getDocumentSelectionToken(pageId) || getAdjacentDocumentToken(direction, pageId);
    const activeRange = getActiveDocumentRange(surface)?.cloneRange() || null;

    if (!surface || !targetToken) {
      return false;
    }

    const fallbackParent = targetToken.parentNode;
    const fallbackOffset = fallbackParent ? Array.prototype.indexOf.call(fallbackParent.childNodes, targetToken) : 0;

    targetToken.remove();

    if (activeRange?.startContainer?.isConnected) {
      setCollapsedDocumentSelection(activeRange.startContainer, activeRange.startOffset, pageId);
    } else if (fallbackParent) {
      setCollapsedDocumentSelection(fallbackParent, fallbackOffset, pageId);
    }

    syncSelectedPageDocumentHtml({
      pageId,
      preserveSelection: true,
      render: false,
    });
    return true;
  }

  function handleDocumentTokenDeletion(event, pageId = appState.templateEditor.selectedPageId) {
    const key = String(event.key || "");
    const direction = key === "Backspace" ? "backward" : key === "Delete" ? "forward" : "";

    if (!direction) {
      return false;
    }

    const didRemove = removeAdjacentDocumentToken(direction, pageId);

    if (!didRemove) {
      return false;
    }

    event.preventDefault();
    return true;
  }

  return {
    handleDocumentTokenDeletion,
  };
}
