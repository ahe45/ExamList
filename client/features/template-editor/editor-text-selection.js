let lastTextControlSelectionRange = null;

export function resetEditorTextControlSelection() {
  lastTextControlSelectionRange = null;
}

export function getSelectionRangeInsideSurface(surfaceElement) {
  if (!surfaceElement || typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection?.();

  if (!selection?.rangeCount || !surfaceElement.contains(selection.anchorNode)) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!surfaceElement.contains(range.startContainer) || !surfaceElement.contains(range.endContainer)) {
    return null;
  }

  return range;
}

export function rememberEditorTextControlSelection(surfaceElement) {
  const range = getSelectionRangeInsideSurface(surfaceElement);

  if (range) {
    lastTextControlSelectionRange = range.cloneRange();
  }
}

export function canRestoreEditorTextControlSelection(surfaceElement) {
  return Boolean(
    surfaceElement &&
      lastTextControlSelectionRange &&
      lastTextControlSelectionRange.startContainer?.isConnected &&
      lastTextControlSelectionRange.endContainer?.isConnected &&
      surfaceElement.contains(lastTextControlSelectionRange.startContainer) &&
      surfaceElement.contains(lastTextControlSelectionRange.endContainer),
  );
}

export function getRestorableEditorTextControlSelection(surfaceElement) {
  return canRestoreEditorTextControlSelection(surfaceElement) ? lastTextControlSelectionRange : null;
}

export function restoreEditorTextControlSelection(surfaceElement) {
  if (!canRestoreEditorTextControlSelection(surfaceElement)) {
    return false;
  }

  const selection = window.getSelection?.();

  if (!selection) {
    return false;
  }

  selection.removeAllRanges();
  selection.addRange(lastTextControlSelectionRange);
  surfaceElement.focus();
  return true;
}

export function getSelectedTableCells(surfaceElement) {
  return Array.from(
    new Set(
      Array.from(
        surfaceElement?.querySelectorAll?.("td.is-selected-cell, th.is-selected-cell, td.is-active-cell, th.is-active-cell") || [],
      ),
    ),
  );
}

export function getClosestEditorTextBlock(surfaceElement, node) {
  const startElement = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const blockElement = startElement?.closest?.("p,h1,h2,h3,li,blockquote,td,th,div");

  if (
    !blockElement ||
    blockElement === surfaceElement ||
    blockElement.classList.contains("template-doc") ||
    !surfaceElement?.contains(blockElement)
  ) {
    return null;
  }

  return blockElement;
}
