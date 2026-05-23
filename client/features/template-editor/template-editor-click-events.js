import { syncTemplateEditorRuntimeToState } from "./editor-runtime-adapter.js";
import { applyDocumentTableAction, splitCurrentDocumentCell } from "./document-table-actions.js";

function isTemplateEditorRuntimeObjectInteractionActive() {
  const templateEditorState = window.ExamListTemplateEditorRuntime?.state?.templateEditor || null;
  const surfaceElement = document.getElementById("templateEditorSurface");
  const interactionUntil = Number(window.__examlistTemplateEditorObjectInteractionUntil || 0);

  return Boolean(
    interactionUntil > Date.now() ||
      templateEditorState?.imageMoveSession ||
      templateEditorState?.imageResizeSession ||
      templateEditorState?.tableObjectMoveSession ||
      templateEditorState?.tableObjectResizeSession ||
      surfaceElement?.classList?.contains("is-image-moving") ||
      surfaceElement?.classList?.contains("is-image-resizing") ||
      surfaceElement?.classList?.contains("is-table-object-moving") ||
      surfaceElement?.classList?.contains("is-table-object-resizing"),
  );
}

export function bindTemplateEditorClickEvents({
  appState,
  applyDocumentColor,
  applyDocumentCommand,
  applyDocumentFontSize,
  closeDataTagSampleModal,
  closeGenerationUnitSettingsModal,
  closeTemplatePreview,
  insertDataTag,
  insertDocumentBarcode,
  insertDocumentDivider,
  insertDocumentPhoto,
  insertDocumentQrCode,
  insertDocumentTable,
  onStateChange,
  openDataTagSampleModal,
  openGenerationUnitSettingsModal,
  openTemplatePreview,
  refreshDocumentEditorRuntime,
  rememberDocumentSelection,
  requestUnsavedTemplateEditorAction,
  resetDataTagSampleModal,
  saveTemplateLayout,
  saveGenerationUnitSettingsModal,
  saveDataTagSampleModal,
  setDocumentColorPanelVisibility,
  setDocumentColorValue,
  setDocumentFontSizeMenuVisibility,
  setDocumentPopoverVisibility,
  setSelectedPage,
  syncSelectedPageDocumentHtml,
  triggerDocumentImageSelection,
}) {
  document.addEventListener("click", async (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    const actionName = actionTarget.dataset.action;
    const canRunDuringObjectInteraction = [
      "save-template-layout",
      "open-template-preview",
      "close-template-preview",
      "open-data-tag-sample-modal",
      "close-data-tag-sample-modal",
      "reset-data-tag-sample-modal",
      "save-data-tag-sample-modal",
      "open-generation-unit-settings-modal",
      "close-generation-unit-settings-modal",
      "save-generation-unit-settings-modal",
    ].includes(actionName);

    if (!canRunDuringObjectInteraction && isTemplateEditorRuntimeObjectInteractionActive()) {
      return;
    }

    if (actionName === "save-template-layout") {
      await saveTemplateLayout();
      return;
    }

    if (actionName === "open-template-preview") {
      await openTemplatePreview();
      return;
    }

    if (actionName === "open-data-tag-sample-modal") {
      await openDataTagSampleModal();
      return;
    }

    if (actionName === "open-generation-unit-settings-modal") {
      await openGenerationUnitSettingsModal();
      return;
    }

    if (actionName === "close-generation-unit-settings-modal") {
      await closeGenerationUnitSettingsModal();
      return;
    }

    if (actionName === "save-generation-unit-settings-modal") {
      await saveGenerationUnitSettingsModal();
      return;
    }

    if (actionName === "close-data-tag-sample-modal") {
      await closeDataTagSampleModal();
      return;
    }

    if (actionName === "reset-data-tag-sample-modal") {
      await resetDataTagSampleModal();
      return;
    }

    if (actionName === "save-data-tag-sample-modal") {
      await saveDataTagSampleModal();
      return;
    }

    if (actionName === "close-template-preview") {
      closeTemplatePreview();
      return;
    }

    if (actionName === "apply-document-command") {
      applyDocumentCommand(actionTarget.dataset.command || "", actionTarget.dataset.commandValue || "");
      return;
    }

    if (actionName === "toggle-document-font-size-menu") {
      const inputId = actionTarget.dataset.fontSizeInput || "";
      const comboElement = actionTarget.closest(".template-toolbar-font-size-combo");
      const nextOpen = comboElement?.querySelector(".template-toolbar-combo-menu")?.classList.contains("hidden") ?? true;

      setDocumentFontSizeMenuVisibility(inputId, nextOpen);
      return;
    }

    if (actionName === "set-document-font-size-option") {
      const fontSizeValue = actionTarget.dataset.fontSizeOption || "";

      applyDocumentFontSize(fontSizeValue);
      setDocumentFontSizeMenuVisibility("templateEditorFontSize", false);
      return;
    }

    if (actionName === "toggle-document-color-panel") {
      const panelId = actionTarget.dataset.colorPanelId || "";
      const pickerId = actionTarget.dataset.colorPickerId || "";
      const panelElement = panelId ? document.getElementById(panelId) : null;
      const nextOpen = panelElement?.classList.contains("hidden") ?? true;

      setDocumentColorPanelVisibility(pickerId, panelId, nextOpen);
      return;
    }

    if (actionName === "open-document-color-picker") {
      const inputId = actionTarget.dataset.colorInput || "";
      document.getElementById(inputId)?.click();
      return;
    }

    if (actionName === "apply-document-color-preset") {
      const colorValue = actionTarget.dataset.colorPreset || "";
      const inputId = actionTarget.dataset.colorInput || "";

      setDocumentColorValue(inputId, colorValue);
      applyDocumentColor(colorValue, {
        command: actionTarget.dataset.colorCommand || "",
        tableAction: actionTarget.dataset.colorTableAction || "",
      });
      return;
    }

    if (actionName === "toggle-document-table-insert-panel") {
      const panelElement = document.getElementById("templateEditorTableInsertPanel");
      const nextOpen = panelElement?.classList.contains("hidden") ?? true;

      setDocumentPopoverVisibility("templateEditorTableInsertPanel", nextOpen);
      return;
    }

    if (actionName === "confirm-document-table-insert") {
      const rowCount = document.getElementById("templateEditorTableRows")?.value || "3";
      const columnCount = document.getElementById("templateEditorTableColumns")?.value || "2";

      insertDocumentTable(rowCount, columnCount);
      setDocumentPopoverVisibility("templateEditorTableInsertPanel", false);
      return;
    }

    if (actionName === "toggle-document-cell-split-panel") {
      const panelElement = document.getElementById("templateEditorCellSplitPanel");
      const nextOpen = panelElement?.classList.contains("hidden") ?? true;

      setDocumentPopoverVisibility("templateEditorCellSplitPanel", nextOpen);
      return;
    }

    if (actionName === "step-document-cell-split-count") {
      const splitCountInput = document.getElementById("templateEditorCellSplitCount");

      if (!splitCountInput) {
        return;
      }

      const currentValue = Math.round(Number(splitCountInput.value) || 2);
      const direction = actionTarget.dataset.direction === "up" ? 1 : -1;

      splitCountInput.value = String(Math.max(currentValue + direction, 2));
      return;
    }

    if (actionName === "confirm-document-cell-split") {
      splitCurrentDocumentCell({ onMutate: () => syncSelectedPageDocumentHtml({ render: false }) });
      setDocumentPopoverVisibility("templateEditorCellSplitPanel", false);
      return;
    }

    if (actionName === "apply-document-table-action") {
      applyDocumentTableAction(actionTarget.dataset.tableAction || "", {
        onMutate: () => syncSelectedPageDocumentHtml({ render: false }),
        onSelectionChange: rememberDocumentSelection,
      });
      return;
    }

    if (actionName === "insert-document-divider") {
      insertDocumentDivider();
      return;
    }

    if (actionName === "insert-document-image") {
      triggerDocumentImageSelection();
      return;
    }

    if (actionName === "insert-document-photo") {
      insertDocumentPhoto();
      return;
    }

    if (actionName === "insert-document-barcode") {
      insertDocumentBarcode();
      return;
    }

    if (actionName === "insert-document-qrcode") {
      insertDocumentQrCode();
      return;
    }

    if (actionName === "select-editor-page") {
      const nextPageId = actionTarget.dataset.pageId || "";

      if (!nextPageId || nextPageId === appState.templateEditor.selectedPageId) {
        return;
      }

      const switchPage = async () => {
        syncTemplateEditorRuntimeToState({ appState });
        setSelectedPage(nextPageId);
        await onStateChange();
        refreshDocumentEditorRuntime();
      };

      await requestUnsavedTemplateEditorAction(switchPage, { reason: "page-switch" });
      return;
    }

    if (actionName === "insert-data-tag") {
      insertDataTag(
        actionTarget.dataset.tagKey || "",
        actionTarget.dataset.tagLabel || "",
        actionTarget.querySelector(".template-tag-button-icon")?.innerHTML || "",
      );
    }
  });
}
