import {
  clearCandidateBlockGridMoveSession,
  resetCandidateBlockGridInteractionSessions,
} from "./candidate-block-grid-sessions.js";
import { ensureCandidateBlockGridObjectControls } from "./candidate-block-grid-object-controls.js";

let selectedCandidateBlockGridElement = null;

function shouldRefocusCandidateBlockGridElement(gridElement) {
  const ownerDocument = gridElement?.ownerDocument || document;
  const activeElement = ownerDocument.activeElement;

  if (!activeElement || activeElement === ownerDocument.body || activeElement === ownerDocument.documentElement) {
    return true;
  }

  if (activeElement === gridElement || gridElement?.contains?.(activeElement)) {
    return true;
  }

  return !activeElement.closest?.("input, textarea, select, button, [contenteditable='true']");
}

export function getSelectedCandidateBlockGridElement() {
  return selectedCandidateBlockGridElement;
}

export function resetCandidateBlockGridState() {
  selectedCandidateBlockGridElement = null;
  resetCandidateBlockGridInteractionSessions();
}

export function clearCandidateBlockGridSelection() {
  clearCandidateBlockGridMoveSession();

  selectedCandidateBlockGridElement?.classList?.remove("is-selected-candidate-block-grid");
  selectedCandidateBlockGridElement = null;
}

export function selectCandidateBlockGridElement(gridElement, { focus = true } = {}) {
  if (!(gridElement instanceof HTMLElement)) {
    clearCandidateBlockGridSelection();
    return null;
  }

  if (selectedCandidateBlockGridElement !== gridElement) {
    clearCandidateBlockGridSelection();
  }

  selectedCandidateBlockGridElement = gridElement;
  ensureCandidateBlockGridObjectControls(gridElement);
  gridElement.classList.add("is-selected-candidate-block-grid");

  if (focus) {
    gridElement.focus({ preventScroll: true });

    const ownerWindow = gridElement.ownerDocument?.defaultView || null;

    ownerWindow.requestAnimationFrame?.(() => {
      if (selectedCandidateBlockGridElement === gridElement && shouldRefocusCandidateBlockGridElement(gridElement)) {
        gridElement.focus({ preventScroll: true });
      }
    });
  }

  return gridElement;
}
