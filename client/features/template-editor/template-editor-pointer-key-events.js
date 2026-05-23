import { splitCurrentDocumentCell } from "./document-table-actions.js";

const DOCUMENT_TOOLBAR_ACTION_SELECTOR = [
  "[data-action='apply-document-command']",
  "[data-action='insert-data-tag']",
  "[data-action='toggle-document-font-size-menu']",
  "[data-action='set-document-font-size-option']",
  "[data-action='toggle-document-color-panel']",
  "[data-action='open-document-color-picker']",
  "[data-action='apply-document-color-preset']",
  "[data-action='toggle-document-table-insert-panel']",
  "[data-action='confirm-document-table-insert']",
  "[data-action='toggle-document-cell-split-panel']",
  "[data-action='step-document-cell-split-count']",
  "[data-action='confirm-document-cell-split']",
  "[data-action='apply-document-table-action']",
  "[data-action='insert-document-divider']",
  "[data-action='insert-document-image']",
  "[data-action='insert-document-photo']",
  "[data-action='insert-document-barcode']",
  "[data-action='insert-document-qrcode']",
].join(", ");

const DOCUMENT_TOOLBAR_FIELD_SELECTOR = [
  "#templateEditorFontFamily",
  "#templateEditorFontSize",
  "#templateEditorTextColor",
  "#templateEditorTextShading",
  "#templateEditorCellShading",
  "#templateEditorTableRows",
  "#templateEditorTableColumns",
  "#templateEditorCellSplitCount",
  "#templateEditorCellSplitPanel",
  ".template-toolbar-color-panel",
  ".template-toolbar-combo-menu",
].join(", ");

const EDITOR_SIDEBAR_ACTION_SELECTOR = [
  "[data-action='save-template-layout']",
  "[data-action='open-template-preview']",
  "[data-action='open-data-tag-sample-modal']",
  "[data-action='open-generation-unit-settings-modal']",
  "[data-action='select-editor-page']",
].join(", ");

function isCandidateBlockModalEditorTarget(target) {
  return Boolean(target?.closest?.("[data-candidate-block-modal-editor-surface], [data-candidate-block-focus-layer]"));
}

function isCandidateBlockModalEditorOpen() {
  return Boolean(window.ExamListCandidateBlockModalEditor?.isOpen?.());
}

function isDocumentToolbarTarget(target) {
  return Boolean(target?.closest?.(".editor-toolbar, #templateEditorToolbarHost, .template-toolbar-table-insert-popover"));
}

function getKeyboardEventDocumentSurface(event) {
  const target = event.target instanceof Element ? event.target : null;
  const activeElement = document.activeElement;

  return (
    target?.closest?.("[data-editor-document-surface]") ||
    (activeElement?.matches?.("[data-editor-document-surface]")
      ? activeElement
      : activeElement?.closest?.("[data-editor-document-surface]")) ||
    null
  );
}

function focusSelectedCandidateBlockGrid(gridElement) {
  if (!(gridElement instanceof HTMLElement)) {
    return;
  }

  const surfaceElement = gridElement.closest("[data-editor-document-surface]");

  gridElement.tabIndex = 0;
  window.getSelection?.()?.removeAllRanges?.();
  surfaceElement?.blur?.();
  gridElement.focus({ preventScroll: true });
  window.requestAnimationFrame(() => {
    if (gridElement.isConnected) {
      gridElement.focus({ preventScroll: true });
    }
  });
  [0, 50, 150].forEach((delay) => {
    window.setTimeout(() => {
      if (gridElement.isConnected) {
        gridElement.focus({ preventScroll: true });
      }
    }, delay);
  });
}

function handleSelectedCandidateBlockGridBackspace(event) {
  if (event.defaultPrevented || event.key !== "Backspace" || isCandidateBlockModalEditorTarget(event.target)) {
    return;
  }

  const surfaceElement = getKeyboardEventDocumentSurface(event);
  const selectedGrid = surfaceElement?.querySelector?.("[data-candidate-block-grid].is-selected-candidate-block-grid") || null;

  if (!(selectedGrid instanceof HTMLElement)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  focusSelectedCandidateBlockGrid(selectedGrid);
}

function handleGeneratedObjectInsertButtonClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const insertButton = target?.closest?.('[data-template-insert="barcode"], [data-template-insert="qrcode"]') || null;
  const toolbarHost = document.getElementById("templateEditorToolbarHost");
  const picker = document.querySelector("[data-examlist-generated-object-source-picker]");

  if (!insertButton || !toolbarHost?.contains(insertButton) || !(picker instanceof HTMLElement)) {
    return;
  }

  const objectType = String(insertButton.dataset.templateInsert || "").trim() === "qrcode" ? "qrcode" : "barcode";
  const pickerTitle = picker.querySelector("[data-examlist-generated-object-source-picker-title]");

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  picker.dataset.examlistGeneratedObjectType = objectType;
  if (pickerTitle) {
    pickerTitle.textContent = objectType === "qrcode" ? "QR코드 데이터" : "바코드 데이터";
  }
  picker.classList.remove("hidden");
  picker.setAttribute("aria-hidden", "false");
}

function normalizeWheelDelta(event) {
  const lineHeight = 16;
  const pageHeight = event.currentTarget?.clientHeight || window.innerHeight || 800;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return {
      x: event.deltaX * lineHeight,
      y: event.deltaY * lineHeight,
    };
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return {
      x: event.deltaX * pageHeight,
      y: event.deltaY * pageHeight,
    };
  }

  return {
    x: event.deltaX,
    y: event.deltaY,
  };
}

function handleTemplateEditorCanvasWheel(event, updateDocumentImageSelectionOverlay) {
  if (event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  const canvasElement = target?.closest?.(".template-editor-page");

  if (!canvasElement) {
    return;
  }

  const canScrollY = canvasElement.scrollHeight > canvasElement.clientHeight + 1;
  const canScrollX = canvasElement.scrollWidth > canvasElement.clientWidth + 1;

  if (!canScrollY && !canScrollX) {
    return;
  }

  const delta = normalizeWheelDelta(event);
  const deltaX = event.shiftKey && Math.abs(delta.x) < Math.abs(delta.y) ? delta.y : delta.x;
  const deltaY = event.shiftKey && canScrollX ? 0 : delta.y;
  const maxScrollLeft = Math.max(0, canvasElement.scrollWidth - canvasElement.clientWidth);
  const maxScrollTop = Math.max(0, canvasElement.scrollHeight - canvasElement.clientHeight);
  const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, canvasElement.scrollLeft + deltaX));
  const nextScrollTop = Math.min(maxScrollTop, Math.max(0, canvasElement.scrollTop + deltaY));

  if (nextScrollLeft === canvasElement.scrollLeft && nextScrollTop === canvasElement.scrollTop) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  canvasElement.scrollLeft = nextScrollLeft;
  canvasElement.scrollTop = nextScrollTop;
  updateDocumentImageSelectionOverlay();
}

export function bindTemplateEditorPointerKeyEvents({
  appState,
  applyDocumentFontSize,
  canManageTemplates,
  clearDocumentImageSelection,
  closeDocumentToolbarPanels,
  getClosestDocumentSurface,
  getDocumentImageTarget,
  handleDocumentImageMove,
  handleDocumentImageResize,
  handleDocumentTokenDeletion,
  insertDocumentTable,
  redoDocumentHistory,
  releaseDocumentImageMoveSession,
  releaseDocumentImageResizeSession,
  selectDocumentImage,
  setDocumentFontSizeMenuVisibility,
  setDocumentPopoverVisibility,
  startDocumentImageMoveSession,
  startDocumentImageResizeSession,
  syncSelectedPageDocumentHtml,
  undoDocumentHistory,
  updateDocumentImageSelectionOverlay,
}) {
  document.addEventListener("keydown", handleSelectedCandidateBlockGridBackspace, true);
  document.addEventListener("pointerdown", handleGeneratedObjectInsertButtonClick, true);
  document.addEventListener("click", handleGeneratedObjectInsertButtonClick, true);

  document.addEventListener("mousedown", (event) => {
    if (isCandidateBlockModalEditorTarget(event.target)) {
      return;
    }

    const documentToolbarButton = event.target.closest(DOCUMENT_TOOLBAR_ACTION_SELECTOR);

    if (documentToolbarButton) {
      event.preventDefault();
      return;
    }

    const editorSidebarButton = event.target.closest(EDITOR_SIDEBAR_ACTION_SELECTOR);

    if (editorSidebarButton) {
      event.preventDefault();
      return;
    }

    const documentToolbarField = event.target.closest(DOCUMENT_TOOLBAR_FIELD_SELECTOR);

    if (documentToolbarField) {
      return;
    }

    if (!event.target.closest(".editor-toolbar")) {
      closeDocumentToolbarPanels({});
    }

    const imageResizeHandle = event.target.closest(".template-editor-image-resize-handle");

    if (imageResizeHandle) {
      event.preventDefault();
      startDocumentImageResizeSession(event, appState.templateEditor.selectedPageId, imageResizeHandle.dataset.templateResizeCorner);
      return;
    }

    const documentImage = getDocumentImageTarget(event.target);

    if (documentImage) {
      if (event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const documentSurface = getClosestDocumentSurface(documentImage);
      const pageId = documentSurface?.dataset.pageId || appState.templateEditor.selectedPageId;

      selectDocumentImage(documentImage, pageId);
      updateDocumentImageSelectionOverlay(pageId);

      if (canManageTemplates() && event.button === 0) {
        startDocumentImageMoveSession(documentImage, event, pageId);
      }

      event.preventDefault();
      return;
    }

    const documentSurface = event.target.closest("[data-editor-document-surface]");

    if (documentSurface) {
      clearDocumentImageSelection({ pageId: documentSurface.dataset.pageId || appState.templateEditor.selectedPageId });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (isCandidateBlockModalEditorTarget(event.target) || (isCandidateBlockModalEditorOpen() && isDocumentToolbarTarget(event.target))) {
      return;
    }

    if (event.target?.id === "templateEditorFontSize" && event.key === "Enter") {
      event.preventDefault();
      applyDocumentFontSize(event.target.value || "");
      setDocumentFontSizeMenuVisibility("templateEditorFontSize", false);
      return;
    }

    if (
      (event.target?.id === "templateEditorTableRows" || event.target?.id === "templateEditorTableColumns") &&
      event.key === "Enter"
    ) {
      event.preventDefault();
      insertDocumentTable(
        document.getElementById("templateEditorTableRows")?.value || "3",
        document.getElementById("templateEditorTableColumns")?.value || "2",
      );
      setDocumentPopoverVisibility("templateEditorTableInsertPanel", false);
      return;
    }

    if (event.target?.id === "templateEditorCellSplitCount" && event.key === "Enter") {
      event.preventDefault();
      splitCurrentDocumentCell({ onMutate: () => syncSelectedPageDocumentHtml({ render: false }) });
      setDocumentPopoverVisibility("templateEditorCellSplitPanel", false);
      return;
    }

    const activeElement = document.activeElement;
    const activeDocumentSurface =
      activeElement?.matches?.("[data-editor-document-surface]") ? activeElement : activeElement?.closest?.("[data-editor-document-surface]");
    const isHistoryModifierPressed = (event.ctrlKey || event.metaKey) && !event.altKey;
    const normalizedKey = String(event.key || "").toLowerCase();

    if (activeDocumentSurface && isHistoryModifierPressed && normalizedKey === "z" && !event.shiftKey) {
      event.preventDefault();
      undoDocumentHistory(activeDocumentSurface.dataset.pageId || appState.templateEditor.selectedPageId);
      return;
    }

    if (
      activeDocumentSurface &&
      isHistoryModifierPressed &&
      ((normalizedKey === "z" && event.shiftKey) || normalizedKey === "y")
    ) {
      event.preventDefault();
      redoDocumentHistory(activeDocumentSurface.dataset.pageId || appState.templateEditor.selectedPageId);
      return;
    }

    if (activeDocumentSurface && !isHistoryModifierPressed && (event.key === "Backspace" || event.key === "Delete")) {
      if (handleDocumentTokenDeletion(event, activeDocumentSurface.dataset.pageId || appState.templateEditor.selectedPageId)) {
        return;
      }
    }

    const isEditingField =
      activeElement?.matches?.("input, textarea, select, [contenteditable='true']") ||
      activeElement?.closest?.("[contenteditable='true']");

    if (isEditingField) {
      return;
    }

    if (event.key === "Escape" && appState.templateEditor.selectedImageElement) {
      clearDocumentImageSelection();
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (appState.templateEditor.imageResizeSession) {
      handleDocumentImageResize(event);
      return;
    }

    if (appState.templateEditor.imageMoveSession) {
      handleDocumentImageMove(event);
    }
  });

  document.addEventListener("mouseup", () => {
    if (appState.templateEditor.imageResizeSession) {
      releaseDocumentImageResizeSession({ sync: true });
      return;
    }

    if (appState.templateEditor.imageMoveSession) {
      releaseDocumentImageMoveSession({ sync: true });
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (getDocumentImageTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener(
    "wheel",
    (event) => {
      handleTemplateEditorCanvasWheel(event, updateDocumentImageSelectionOverlay);
    },
    { passive: false },
  );

  document.addEventListener(
    "scroll",
    (event) => {
      if (
        event.target instanceof Element &&
        (event.target.closest(".template-editor-page") || event.target.matches(".template-editor-page"))
      ) {
        updateDocumentImageSelectionOverlay();
      }
    },
    true,
  );

  window.addEventListener("resize", () => {
    updateDocumentImageSelectionOverlay();
  });
}
