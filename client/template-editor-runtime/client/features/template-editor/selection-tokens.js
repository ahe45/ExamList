(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.ExamListTemplateEditorSelectionTokens = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function createTemplateEditorSelectionTokenController({
    getTemplateEditorSurface,
    setTemplateEditorCollapsedSelection,
    state,
    syncTemplateEditorContent,
  }) {
    function isTemplateEditorWhitespaceTextNode(node) {
      return node?.nodeType === Node.TEXT_NODE && !String(node.textContent || "").trim();
    }

    function isTemplateEditorTokenElement(node) {
      return node instanceof HTMLElement && node.matches(".template-token[data-template-tag-value]");
    }

    function getTemplateEditorSelectionToken() {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return null;
      }

      const selection = window.getSelection();
      const range =
        selection && selection.rangeCount > 0 && templateEditorSurface.contains(selection.anchorNode)
          ? selection.getRangeAt(0)
          : state.templateEditor.savedRange;

      if (!range || !range.collapsed) {
        return null;
      }

      const startNode = range.startContainer;

      if (!startNode || !templateEditorSurface.contains(startNode)) {
        return null;
      }

      if (isTemplateEditorTokenElement(startNode)) {
        return startNode;
      }

      const tokenElement =
        startNode.nodeType === Node.ELEMENT_NODE
          ? startNode.closest?.(".template-token[data-template-tag-value]") || null
          : startNode.parentElement?.closest(".template-token[data-template-tag-value]") || null;

      return tokenElement && templateEditorSurface.contains(tokenElement) ? tokenElement : null;
    }

    function getTemplateEditorAdjacentNode(parentNode, startIndex, direction) {
      if (!parentNode?.childNodes) {
        return null;
      }

      const step = direction === "backward" ? -1 : 1;
      let currentIndex = startIndex;

      while (currentIndex >= 0 && currentIndex < parentNode.childNodes.length) {
        const siblingNode = parentNode.childNodes[currentIndex];

        if (!isTemplateEditorWhitespaceTextNode(siblingNode)) {
          return siblingNode;
        }

        currentIndex += step;
      }

      return null;
    }

    function getTemplateEditorBoundaryToken(node, direction) {
      let currentNode = node || null;

      while (currentNode) {
        if (isTemplateEditorWhitespaceTextNode(currentNode)) {
          return null;
        }

        if (isTemplateEditorTokenElement(currentNode)) {
          return currentNode;
        }

        if (!(currentNode instanceof Element) || currentNode.childNodes.length === 0) {
          return null;
        }

        currentNode =
          direction === "backward"
            ? getTemplateEditorAdjacentNode(currentNode, currentNode.childNodes.length - 1, "backward")
            : getTemplateEditorAdjacentNode(currentNode, 0, "forward");
      }

      return null;
    }

    function getTemplateEditorAdjacentToken(direction) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return null;
      }

      const selection = window.getSelection();
      const range =
        selection && selection.rangeCount > 0 && templateEditorSurface.contains(selection.anchorNode)
          ? selection.getRangeAt(0)
          : state.templateEditor.savedRange;

      if (!range || !range.collapsed) {
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
            ? getTemplateEditorAdjacentNode(
                currentNode.parentNode,
                Array.prototype.indexOf.call(currentNode.parentNode?.childNodes || [], currentNode) + (direction === "backward" ? -1 : 1),
                direction,
              )
            : getTemplateEditorAdjacentNode(
                currentNode,
                direction === "backward" ? currentOffset - 1 : currentOffset,
                direction,
              );

        const adjacentToken = getTemplateEditorBoundaryToken(adjacentNode, direction);

        if (adjacentToken) {
          return adjacentToken;
        }

        if (adjacentNode) {
          return null;
        }

        if (currentNode === templateEditorSurface) {
          return null;
        }

        const parentNode = currentNode.parentNode;

        if (!parentNode || !templateEditorSurface.contains(parentNode)) {
          return null;
        }

        const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, currentNode);
        currentOffset = direction === "backward" ? currentIndex : currentIndex + 1;
        currentNode = parentNode;
      }

      return null;
    }

    function removeTemplateEditorAdjacentToken(direction) {
      const templateEditorSurface = getTemplateEditorSurface();
      const targetToken = getTemplateEditorSelectionToken() || getTemplateEditorAdjacentToken(direction);

      if (!templateEditorSurface || !targetToken) {
        return false;
      }

      const selection = window.getSelection();
      const activeRange =
        selection && selection.rangeCount > 0 && templateEditorSurface.contains(selection.anchorNode)
          ? selection.getRangeAt(0).cloneRange()
          : state.templateEditor.savedRange?.cloneRange();
      const fallbackParent = targetToken.parentNode;
      const fallbackOffset = fallbackParent ? Array.prototype.indexOf.call(fallbackParent.childNodes, targetToken) : 0;

      targetToken.remove();

      if (activeRange && activeRange.startContainer && activeRange.startContainer.isConnected) {
        setTemplateEditorCollapsedSelection(activeRange.startContainer, activeRange.startOffset);
      } else if (fallbackParent) {
        setTemplateEditorCollapsedSelection(fallbackParent, fallbackOffset);
      }

      if (typeof syncTemplateEditorContent === "function") {
        syncTemplateEditorContent({ preserveSelection: true, focusEditor: true });
      }
      return true;
    }

    function handleTemplateEditorTokenDeletion(event) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!templateEditorSurface) {
        return false;
      }

      const key = String(event.key || "");
      const direction = key === "Backspace" ? "backward" : key === "Delete" ? "forward" : "";

      if (!direction) {
        return false;
      }

      const didRemove = removeTemplateEditorAdjacentToken(direction);

      if (!didRemove) {
        return false;
      }

      event.preventDefault();
      return true;
    }

    return Object.freeze({
      handleTemplateEditorTokenDeletion,
    });
  }

  return Object.freeze({
    createTemplateEditorSelectionTokenController,
  });
});
