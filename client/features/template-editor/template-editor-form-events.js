import { getFormFieldValue } from "./layout-settings.js";

function getElementFromEventTarget(target) {
  if (!target) {
    return null;
  }

  return target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement || null;
}

function isCandidateBlockModalEditorTarget(target) {
  const element = getElementFromEventTarget(target);

  return Boolean(
    element?.closest?.("[data-candidate-block-modal-editor-surface], [data-candidate-block-focus-layer]"),
  );
}

function isCandidateBlockFocusEditorOpen() {
  return Boolean(document.querySelector("[data-candidate-block-focus-layer], .examlist-candidate-block-focus-layer"));
}

function isSelectedCandidateBlockGridTarget(target) {
  const element = getElementFromEventTarget(target);

  return Boolean(element?.closest?.("[data-candidate-block-grid].is-selected-candidate-block-grid"));
}

function isTemplateEditorControlTarget(target) {
  const element = getElementFromEventTarget(target);

  return Boolean(
    element?.closest?.(
      [
        "#templateEditorToolbarHost",
        "#templatePagePropertiesPanel",
        "#templateTagStrip",
        ".editor-sidebar-footer",
        ".template-page-properties-column",
        ".template-tag-panel",
      ].join(", "),
    ),
  );
}

export function bindTemplateEditorFormEvents({
  applyDocumentColor,
  applyDocumentFontFamily,
  applyDocumentFontSize,
  clearPendingDocumentCompositionSync,
  getClosestDocumentSurface,
  getDocumentSurfacePageId,
  insertDocumentImageFile,
  isDocumentSurfaceComposing,
  refreshDocumentEditorRuntime,
  rememberDocumentSelection,
  scheduleDocumentCompositionSync,
  setDocumentColorValue,
  setDocumentCompositionState,
  syncGenerationUnitPriorityRows,
  syncDocumentFontSizeMenuSelection,
  syncSelectedPageDocumentHtml,
  updateDataTagSampleDraftValue,
  updateSelectedPageField,
  updateSelectedPageMarginField,
  updateTemplateField,
}) {
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();

    if (isCandidateBlockModalEditorTarget(selection?.anchorNode) || isCandidateBlockModalEditorTarget(selection?.focusNode)) {
      return;
    }

    rememberDocumentSelection();

    const documentSurface = selection?.anchorNode ? getClosestDocumentSurface(selection.anchorNode) : null;

    if (!documentSurface) {
      return;
    }

    const pageId = getDocumentSurfacePageId(documentSurface);

    if (isDocumentSurfaceComposing(documentSurface, pageId)) {
      return;
    }

    refreshDocumentEditorRuntime(pageId);
  });

  document.addEventListener("compositionstart", (event) => {
    if (isCandidateBlockModalEditorTarget(event.target)) {
      return;
    }

    const documentSurface = event.target.closest("[data-editor-document-surface]");

    if (documentSurface) {
      setDocumentCompositionState(documentSurface, true);
    }
  });

  document.addEventListener("compositionend", (event) => {
    if (isCandidateBlockModalEditorTarget(event.target)) {
      return;
    }

    const documentSurface = event.target.closest("[data-editor-document-surface]");

    if (!documentSurface) {
      return;
    }

    scheduleDocumentCompositionSync(setDocumentCompositionState(documentSurface, false));
  });

  document.addEventListener("input", (event) => {
    if (isCandidateBlockModalEditorTarget(event.target)) {
      return;
    }

    const documentSurface = event.target.closest("[data-editor-document-surface]");

    if (documentSurface) {
      const pageId = getDocumentSurfacePageId(documentSurface);

      if (event.isComposing || isDocumentSurfaceComposing(documentSurface, pageId)) {
        return;
      }

      clearPendingDocumentCompositionSync(pageId);
      syncSelectedPageDocumentHtml({
        pageId,
        render: false,
        revertOnOverflow: true,
      });
      return;
    }

    if (event.target?.id === "templateEditorFontSize") {
      syncDocumentFontSizeMenuSelection("templateEditorFontSize", event.target.value);
      return;
    }

    if (event.target?.matches?.(".template-toolbar-color-input-hidden")) {
      setDocumentColorValue(event.target.id || "", event.target.value || "");
      return;
    }

    const dataTagSampleInput = event.target.closest("[data-data-tag-sample-key]");

    if (dataTagSampleInput) {
      updateDataTagSampleDraftValue(dataTagSampleInput.dataset.dataTagSampleKey || "", dataTagSampleInput.value || "", "sample");
      return;
    }

    const dataTagEmptyValueInput = event.target.closest("[data-data-tag-empty-value-key]");

    if (dataTagEmptyValueInput) {
      updateDataTagSampleDraftValue(
        dataTagEmptyValueInput.dataset.dataTagEmptyValueKey || "",
        dataTagEmptyValueInput.value || "",
        "empty",
      );
      return;
    }

    const generationUnitPriorityControl = event.target.closest("[data-generation-unit-priority]");

    if (generationUnitPriorityControl) {
      syncGenerationUnitPriorityRows?.(generationUnitPriorityControl);
      return;
    }

    const templateField = event.target.closest("[data-editor-template-field]");

    if (templateField && templateField.dataset.editorTemplateCommit !== "change") {
      updateTemplateField(templateField.dataset.editorTemplateField || "", getFormFieldValue(templateField));
      return;
    }

    const pageField = event.target.closest("[data-editor-page-field]");

    if (pageField) {
      updateSelectedPageField(pageField.dataset.editorPageField || "", getFormFieldValue(pageField));
      return;
    }

    const pageMarginField = event.target.closest("[data-editor-page-margin-field]");

    if (pageMarginField) {
      updateSelectedPageMarginField(pageMarginField.dataset.editorPageMarginField || "", getFormFieldValue(pageMarginField));
    }
  });

  document.addEventListener("focusout", (event) => {
    if (isCandidateBlockModalEditorTarget(event.target)) {
      return;
    }

    if (isCandidateBlockFocusEditorOpen()) {
      return;
    }

    if (isSelectedCandidateBlockGridTarget(event.relatedTarget)) {
      return;
    }

    const documentSurface = event.target.closest("[data-editor-document-surface]");

    if (documentSurface) {
      const pageId = getDocumentSurfacePageId(documentSurface);

      if (isDocumentSurfaceComposing(documentSurface, pageId)) {
        scheduleDocumentCompositionSync(setDocumentCompositionState(documentSurface, false));
        return;
      }

      syncSelectedPageDocumentHtml({
        pageId,
        preserveSelection: !isTemplateEditorControlTarget(event.relatedTarget),
        render: false,
        revertOnOverflow: true,
      });
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target?.id === "templateEditorImageInput") {
      insertDocumentImageFile(event.target.files?.[0]);
      event.target.value = "";
      return;
    }

    if (event.target?.id === "templateEditorFontFamily") {
      applyDocumentFontFamily(event.target.value || "");
      return;
    }

    if (event.target?.id === "templateEditorFontSize") {
      applyDocumentFontSize(event.target.value || "");
      return;
    }

    if (event.target?.matches?.(".template-toolbar-color-input-hidden")) {
      const colorValue = event.target.value || "";

      setDocumentColorValue(event.target.id || "", colorValue);
      applyDocumentColor(colorValue, {
        command: event.target.dataset.colorCommand || "",
        tableAction: event.target.dataset.colorTableAction || "",
      });
      return;
    }

    const templateField = event.target.closest("[data-editor-template-field]");

    if (templateField) {
      updateTemplateField(templateField.dataset.editorTemplateField || "", getFormFieldValue(templateField));
      return;
    }

    const generationUnitPriorityControl = event.target.closest("[data-generation-unit-priority]");

    if (generationUnitPriorityControl) {
      syncGenerationUnitPriorityRows?.(generationUnitPriorityControl);
      return;
    }

    const pageField = event.target.closest("[data-editor-page-field]");

    if (pageField) {
      updateSelectedPageField(pageField.dataset.editorPageField || "", getFormFieldValue(pageField));
      return;
    }

    const pageMarginField = event.target.closest("[data-editor-page-margin-field]");

    if (pageMarginField) {
      updateSelectedPageMarginField(pageMarginField.dataset.editorPageMarginField || "", getFormFieldValue(pageMarginField));
    }
  });
}
