import {
  handlePdfAuditLogAction,
  handlePdfAuditLogChange,
  handlePdfAuditLogClick,
  handlePdfAuditLogInput,
  handlePdfAuditLogKeyDown,
} from "./pdf-generation-audit-events.js";
import {
  handlePdfGenerationCreateModalAction,
  handlePdfGenerationCreateModalChange,
  handlePdfGenerationCreateModalSubmit,
} from "./pdf-generation-create-modal-events.js";
import { handlePdfGenerationDeleteAction } from "./pdf-generation-delete-events.js";
import {
  handlePdfGenerationDownloadAction,
  handlePdfGenerationDownloadChange,
  handlePdfGenerationDownloadSubmit,
} from "./pdf-generation-download-events.js";
import {
  handlePdfGenerationListAction,
  handlePdfGenerationListChange,
  handlePdfGenerationListClick,
  handlePdfGenerationListInput,
  handlePdfGenerationListKeyDown,
  handlePdfGenerationListMouseDown,
  handlePdfGenerationListSubmit,
} from "./pdf-generation-list-events.js";

export function bindPdfGenerationEventHandlers(context) {
  document.addEventListener("submit", async (event) => {
    if (await handlePdfGenerationCreateModalSubmit(event, context)) {
      return;
    }

    if (await handlePdfGenerationDownloadSubmit(event, context)) {
      return;
    }

    await handlePdfGenerationListSubmit(event, context);
  });

  document.addEventListener("input", async (event) => {
    if (await handlePdfGenerationListInput(event, context)) {
      return;
    }

    await handlePdfAuditLogInput(event, context);
  });

  document.addEventListener("keydown", async (event) => {
    if (await handlePdfGenerationListKeyDown(event, context)) {
      return;
    }

    await handlePdfAuditLogKeyDown(event, context);
  });

  document.addEventListener("mousedown", (event) => {
    handlePdfGenerationListMouseDown(event, context);
  });

  document.addEventListener("click", async (event) => {
    if (await handlePdfGenerationListClick(event, context)) {
      return;
    }

    if (await handlePdfAuditLogClick(event, context)) {
      return;
    }

    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    const action = actionTarget.dataset.action;

    if (await handlePdfGenerationListAction(actionTarget, action, context)) {
      return;
    }

    if (await handlePdfGenerationCreateModalAction(actionTarget, action, context)) {
      return;
    }

    if (await handlePdfGenerationDownloadAction(actionTarget, action, context)) {
      return;
    }

    if (await handlePdfGenerationDeleteAction(actionTarget, action, context)) {
      return;
    }

    await handlePdfAuditLogAction(actionTarget, action, context);
  });

  document.addEventListener("change", async (event) => {
    if (await handlePdfAuditLogChange(event, context)) {
      return;
    }

    if (await handlePdfGenerationListChange(event, context)) {
      return;
    }

    if (await handlePdfGenerationCreateModalChange(event, context)) {
      return;
    }

    await handlePdfGenerationDownloadChange(event, context);
  });
}
