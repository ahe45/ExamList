import { getFormFieldValue } from "./layout-settings.js";
import {
  getDataTagFormatInputError,
  renderDataTagFormatPreview,
} from "./data-tag-format-options.js";
import { getDataTagSampleValueError } from "./data-tag-value-formatting.js";

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
        ".template-editor-canvas-zoom-controls",
      ].join(", "),
    ),
  );
}

function syncDataTagFormatInputFeedback(formatInput) {
  const modalElement = formatInput?.closest?.(".data-tag-format-modal-overlay");

  if (!modalElement) {
    return;
  }

  const formatType = String(formatInput.dataset.dataTagFormatType || "").trim();
  const formatValue = String(formatInput.value || "");
  const errorMessage = getDataTagFormatInputError(formatType, formatValue);
  const previewText = errorMessage
    ? "형식을 수정하면 예시가 표시됩니다."
    : renderDataTagFormatPreview(formatType, formatValue) || "형식을 입력하면 예시가 표시됩니다.";
  const previewElement = modalElement.querySelector("[data-data-tag-format-preview-value]");
  const errorElement = modalElement.querySelector("[data-data-tag-format-error]");
  const presetSelect = modalElement.querySelector("[data-data-tag-format-field='preset']");
  const saveButton = modalElement.querySelector("[data-action='save-data-tag-format-modal']");

  if (previewElement) {
    previewElement.textContent = previewText;
  }

  if (errorElement) {
    errorElement.textContent = errorMessage;
    errorElement.classList.toggle("hidden", !errorMessage);
  }

  if (presetSelect) {
    const matchingOption = Array.from(presetSelect.options || []).find((option) => option.value === formatValue);

    presetSelect.value = matchingOption ? formatValue : "__custom__";
  }

  if (saveButton) {
    saveButton.disabled = Boolean(errorMessage);
  }
}

function applyDataTagFormatPreset(presetSelect, updateDataTagFormatDraftValue) {
  const presetValue = String(presetSelect?.value || "");

  if (presetValue === "__custom__") {
    return;
  }

  const modalElement = presetSelect.closest?.(".data-tag-format-modal-overlay");
  const formatInput = modalElement?.querySelector?.("[data-data-tag-format-field='format']");

  if (!formatInput) {
    return;
  }

  formatInput.value = presetValue;
  updateDataTagFormatDraftValue?.(presetValue);
  syncDataTagFormatInputFeedback(formatInput);
}

function syncDataTagSampleInputFeedback(sampleInput) {
  const modalElement = sampleInput?.closest?.(".data-tag-sample-modal-overlay");

  if (!modalElement) {
    return;
  }

  const key = String(sampleInput.dataset.dataTagSampleKey || "").trim();
  const errorMessage = getDataTagSampleValueError(key, sampleInput.value || "");
  const rowElement = sampleInput.closest?.(".data-tag-sample-row");
  const errorElement = rowElement?.querySelector?.("[data-data-tag-sample-error]");
  const saveButton = modalElement.querySelector("[data-action='save-data-tag-sample-modal']");

  if (errorElement) {
    errorElement.textContent = errorMessage;
    errorElement.classList.toggle("hidden", !errorMessage);
  }

  if (errorMessage) {
    sampleInput.setAttribute("aria-invalid", "true");
    if (errorElement?.id) {
      sampleInput.setAttribute("aria-describedby", errorElement.id);
    }
  } else {
    sampleInput.removeAttribute("aria-invalid");
    sampleInput.removeAttribute("aria-describedby");
  }

  if (saveButton) {
    const hasErrors = Array.from(modalElement.querySelectorAll("[data-data-tag-sample-key]")).some((inputElement) =>
      Boolean(getDataTagSampleValueError(inputElement.dataset.dataTagSampleKey || "", inputElement.value || ""))
    );

    saveButton.disabled = hasErrors;
  }
}

function createTemplateEditorObjectSelectionSnapshot(documentSurface) {
  if (!documentSurface?.querySelectorAll) {
    return null;
  }

  const runtime = typeof window !== "undefined" ? window.ExamListTemplateEditorRuntime || null : null;
  const runtimeState = runtime?.state?.templateEditor || null;
  const selectedElements = Array.from(
    documentSurface.querySelectorAll("img.is-selected-object, table.is-selected-object, table.is-selected-table-object"),
  );
  const selectedImageElement = runtimeState?.selectedImageElement || null;
  const selectedTableElement = runtimeState?.selectedTableElement || null;

  if (!selectedElements.length && !selectedImageElement && !selectedTableElement) {
    return null;
  }

  return {
    runtime,
    selectedElements,
    selectedImageElement,
    selectedTableElement,
  };
}

function restoreTemplateEditorObjectSelectionSnapshot(snapshot, documentSurface) {
  if (!snapshot || !documentSurface?.contains) {
    return;
  }

  const runtimeState = snapshot.runtime?.state?.templateEditor || null;
  let didRestore = false;

  snapshot.selectedElements.forEach((element) => {
    if (!documentSurface.contains(element)) {
      return;
    }

    if (element instanceof HTMLImageElement) {
      element.classList.add("template-editor-image-object", "is-selected-object");
      element.classList.toggle("is-cell-contained-object", Boolean(element.closest("td, th")));
      didRestore = true;
      return;
    }

    if (element instanceof HTMLTableElement) {
      element.classList.add("is-selected-object", "is-selected-table-object");
      didRestore = true;
    }
  });

  if (snapshot.selectedImageElement instanceof HTMLImageElement && documentSurface.contains(snapshot.selectedImageElement)) {
    snapshot.selectedImageElement.classList.add("template-editor-image-object", "is-selected-object");
    snapshot.selectedImageElement.classList.toggle(
      "is-cell-contained-object",
      Boolean(snapshot.selectedImageElement.closest("td, th")),
    );

    if (runtimeState) {
      runtimeState.selectedImageElement = snapshot.selectedImageElement;
    }

    snapshot.runtime?.updateImageSelectionOverlay?.();
    didRestore = true;
  }

  if (snapshot.selectedTableElement instanceof HTMLTableElement && documentSurface.contains(snapshot.selectedTableElement)) {
    snapshot.selectedTableElement.classList.add("is-selected-object", "is-selected-table-object");

    if (runtimeState) {
      runtimeState.selectedTableElement = snapshot.selectedTableElement;
    }

    snapshot.runtime?.updateTableObjectOverlay?.();
    didRestore = true;
  }

  if (didRestore) {
    documentSurface.dispatchEvent(new Event("input"));
  }
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
  updateDataTagFormatDraftValue,
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
      syncDataTagSampleInputFeedback(dataTagSampleInput);
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

    const dataTagFormatInput = event.target.closest("[data-data-tag-format-field='format']");

    if (dataTagFormatInput) {
      updateDataTagFormatDraftValue?.(dataTagFormatInput.value || "");
      syncDataTagFormatInputFeedback(dataTagFormatInput);
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
      const shouldRestoreObjectSelection = isTemplateEditorControlTarget(event.relatedTarget);
      const objectSelectionSnapshot = shouldRestoreObjectSelection
        ? createTemplateEditorObjectSelectionSnapshot(documentSurface)
        : null;

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
      restoreTemplateEditorObjectSelectionSnapshot(objectSelectionSnapshot, documentSurface);
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

    const dataTagFormatPresetControl = event.target.closest("[data-data-tag-format-field='preset']");

    if (dataTagFormatPresetControl) {
      applyDataTagFormatPreset(dataTagFormatPresetControl, updateDataTagFormatDraftValue);
      return;
    }

    const dataTagFormatControl = event.target.closest("[data-data-tag-format-field='format']");

    if (dataTagFormatControl) {
      updateDataTagFormatDraftValue?.(dataTagFormatControl.value || "");
      syncDataTagFormatInputFeedback(dataTagFormatControl);
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
