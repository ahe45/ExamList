import { handleCandidateDetailAction, handleCandidateDetailInput, handleCandidateDetailPhotoChange } from "./candidate-detail-events.js";
import {
  handleCandidateFilterCompositionEnd,
  handleCandidateFilterCompositionStart,
  handleCandidateFilterChange,
  handleCandidateFilterInput,
  handleCandidateTableAction,
  handleCandidateTableChange,
  handleCandidateTableClick,
  handleCandidateTableKeyDown,
} from "./candidate-table-events.js";
import { handleCandidateUploadAction, handleCandidateUploadChange } from "./candidate-upload-events.js";

export function bindCandidateEventHandlers(context) {
  document.addEventListener("keydown", async (event) => {
    await handleCandidateTableKeyDown(event, context);
  });

  document.addEventListener("change", async (event) => {
    if (await handleCandidateUploadChange(event, context)) {
      return;
    }

    if (await handleCandidateFilterChange(event, context)) {
      return;
    }

    if (await handleCandidateTableChange(event, context)) {
      return;
    }

    await handleCandidateDetailPhotoChange(event, context);
  });

  document.addEventListener("input", async (event) => {
    if (await handleCandidateFilterInput(event, context)) {
      return;
    }

    handleCandidateDetailInput(event, context);
  });

  document.addEventListener("compositionstart", (event) => {
    handleCandidateFilterCompositionStart(event);
  });

  document.addEventListener("compositionend", async (event) => {
    await handleCandidateFilterCompositionEnd(event, context);
  });

  document.addEventListener("click", async (event) => {
    if (await handleCandidateTableClick(event, context)) {
      return;
    }

    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.action;

    if (await handleCandidateTableAction(actionTarget, action, context)) {
      return;
    }

    if (await handleCandidateUploadAction(actionTarget, action, context)) {
      return;
    }

    await handleCandidateDetailAction(actionTarget, action, context);
  });
}
