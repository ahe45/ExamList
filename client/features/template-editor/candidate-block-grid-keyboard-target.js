const CANDIDATE_BLOCK_GRID_SELECTOR = "[data-candidate-block-grid]";
const DOCUMENT_SURFACE_SELECTOR = "[data-editor-document-surface]";
const EDITING_FOCUS_SELECTOR = "input, textarea, select, button, [contenteditable='true']";

function getElementConstructor(element) {
  return (
    element?.ownerDocument?.defaultView?.Element ||
    (typeof Element !== "undefined" ? Element : null)
  );
}

function getHtmlElementConstructor(element) {
  return (
    element?.ownerDocument?.defaultView?.HTMLElement ||
    (typeof HTMLElement !== "undefined" ? HTMLElement : null)
  );
}

export function isCandidateBlockGridExternalEditingControl(
  element,
  gridElement,
  surfaceElement,
  ElementConstructor = getElementConstructor(element),
) {
  if (ElementConstructor && element instanceof ElementConstructor && !element.isConnected) {
    return false;
  }

  const control = element?.closest?.(EDITING_FOCUS_SELECTOR) || null;

  return Boolean(
    control &&
      control !== gridElement &&
      !gridElement?.contains?.(control) &&
      control.closest?.(DOCUMENT_SURFACE_SELECTOR) !== surfaceElement
  );
}

export function shouldHandleCandidateBlockGridKeyboardDelete({
  activeElement = null,
  activeGridElement = null,
  activeSurfaceElement = null,
  gridElement = null,
  isActiveDocumentBody = false,
  isActiveDocumentElement = false,
  isActiveExternalEditingControl = false,
  isTargetDocumentBody = false,
  isTargetExternalEditingControl = false,
  surfaceElement = null,
  targetElement = null,
  targetGridElement = null,
  targetSurfaceElement = null,
} = {}) {
  if (!gridElement || !surfaceElement) {
    return false;
  }

  if (isTargetExternalEditingControl || isActiveExternalEditingControl) {
    return false;
  }

  return (
    targetGridElement === gridElement ||
    activeGridElement === gridElement ||
    targetSurfaceElement === surfaceElement ||
    activeSurfaceElement === surfaceElement ||
    isTargetDocumentBody ||
    isActiveDocumentBody ||
    isActiveDocumentElement ||
    targetElement === gridElement ||
    activeElement === gridElement
  );
}

export function isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, gridElement) {
  const HtmlElementConstructor = getHtmlElementConstructor(gridElement);

  if (!HtmlElementConstructor || !(gridElement instanceof HtmlElementConstructor) || !surfaceElement?.contains?.(gridElement)) {
    return false;
  }

  if (!gridElement.classList.contains("is-selected-candidate-block-grid")) {
    return false;
  }

  const ElementConstructor = getElementConstructor(gridElement);
  const target = ElementConstructor && event?.target instanceof ElementConstructor ? event.target : null;
  const ownerDocument = gridElement.ownerDocument || null;
  const activeElement = ownerDocument?.activeElement || null;

  return shouldHandleCandidateBlockGridKeyboardDelete({
    activeElement,
    activeGridElement: activeElement?.closest?.(CANDIDATE_BLOCK_GRID_SELECTOR) || null,
    activeSurfaceElement: activeElement?.closest?.(DOCUMENT_SURFACE_SELECTOR) || null,
    gridElement,
    isActiveDocumentBody: activeElement === ownerDocument?.body,
    isActiveDocumentElement: activeElement === ownerDocument?.documentElement,
    isActiveExternalEditingControl: isCandidateBlockGridExternalEditingControl(
      activeElement,
      gridElement,
      surfaceElement,
      ElementConstructor,
    ),
    isTargetDocumentBody: target === ownerDocument?.body,
    isTargetExternalEditingControl: isCandidateBlockGridExternalEditingControl(
      target,
      gridElement,
      surfaceElement,
      ElementConstructor,
    ),
    surfaceElement,
    targetElement: target,
    targetGridElement: target?.closest?.(CANDIDATE_BLOCK_GRID_SELECTOR) || null,
    targetSurfaceElement: target?.closest?.(DOCUMENT_SURFACE_SELECTOR) || null,
  });
}
