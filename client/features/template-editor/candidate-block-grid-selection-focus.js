const EDITING_FOCUS_SELECTOR = "input, textarea, select, button, [contenteditable='true']";

function getCandidateBlockGridOwnerDocument(gridElement, activeElement) {
  return (
    gridElement?.ownerDocument ||
    activeElement?.ownerDocument ||
    (typeof document !== "undefined" ? document : null)
  );
}

function isPassiveDocumentFocusElement(activeElement, ownerDocument) {
  return (
    !activeElement ||
    activeElement === ownerDocument?.body ||
    activeElement === ownerDocument?.documentElement
  );
}

export function shouldRefocusCandidateBlockGridElement(gridElement, activeElement = gridElement?.ownerDocument?.activeElement) {
  const ownerDocument = getCandidateBlockGridOwnerDocument(gridElement, activeElement);

  if (isPassiveDocumentFocusElement(activeElement, ownerDocument)) {
    return true;
  }

  if (activeElement === gridElement || gridElement?.contains?.(activeElement)) {
    return true;
  }

  return !activeElement?.closest?.(EDITING_FOCUS_SELECTOR);
}
