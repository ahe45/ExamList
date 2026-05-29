import {
  clearCandidateBlockGridMoveSession,
  resetCandidateBlockGridInteractionSessions,
} from "./candidate-block-grid-sessions.js";
import { ensureCandidateBlockGridObjectControls } from "./candidate-block-grid-object-controls.js";
import { shouldRefocusCandidateBlockGridElement } from "./candidate-block-grid-selection-focus.js";

let selectedCandidateBlockGridElement = null;

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
