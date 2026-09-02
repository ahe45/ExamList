import {
  isCandidateBlockGridContentPage,
  isPhotoCandidateBlockGridPage,
  objectResizeCorners,
} from "./candidate-block-grid-config.js";
import {
  createCandidateBlockGridControls,
  readCandidateBlockGridControls,
  syncCandidateBlockGridControls,
} from "./candidate-block-grid-controls.js";
import { ensurePageCandidateBlockGridConfig } from "./candidate-block-grid-renderer.js";
import { hydrateCandidateBlockGridObjects } from "./candidate-block-grid-object-controls.js";
import {
  clearCandidateBlockGridBorderHover,
  deleteCandidateBlockGridObject,
  deleteCandidateBlockTableSelection,
  getCandidateBlockGridBorderEventElement,
  isCandidateBlockGridVerticalBorderEvent,
  isTemplateEditorTableObjectBorderEvent,
  syncCandidateBlockGridBorderHover,
} from "./candidate-block-grid-interactions.js";
import {
  handleCandidateBlockGridMove,
  handleCandidateBlockGridMoveEnd,
  handleCandidateBlockGridResizeEnd,
  handleCandidateBlockGridResizeMove,
  nudgeCandidateBlockGridPosition,
  resetCandidateBlockGridInteractionSessions,
  startCandidateBlockGridMoveSession,
  startCandidateBlockGridResizeSession,
  writeCandidateBlockGridSizeToConfig,
} from "./candidate-block-grid-sessions.js";
import { objectFlowLayoutChangeEventName } from "./object-flow-reflow.js";
import {
  cancelCandidateBlockFocusEditor,
  closeCandidateBlockFocusEditor,
  isCandidateBlockFocusEditorOpen,
  openCandidateBlockFocusEditor,
} from "./candidate-block-grid-focus-editor.js";
import { isCandidateBlockGridKeyboardDeleteTarget } from "./candidate-block-grid-keyboard-target.js";
import {
  clearCandidateBlockGridSelection,
  getSelectedCandidateBlockGridElement,
  selectCandidateBlockGridElement,
} from "./candidate-block-grid-selection.js";
import {
  extractCandidateBlockTemplateHtml,
  removeCandidateBlockGridElements,
  scheduleCandidateBlockGridOutsideCaretPlacement,
} from "./candidate-block-grid-dom.js";
import {
  insertCandidateBlockGridAtSelection,
  isBlankCandidateBlockGridHost,
  renderCandidateBlockGridOnSurface,
  syncCandidateBlockTemplateFromSurface,
} from "./candidate-block-grid-surface.js";
import {
  getCandidateBlockTemplateSourceElement,
  isCandidateBlockTemplatePreview,
  isCandidateBlockTemplateSource,
} from "./candidate-block-grid-block-roles.js";
import {
  shouldPreventCandidateBlockGridNativeDeletion,
} from "./candidate-block-grid-boundary.js";
import { getSelectedPage } from "./state.js";

const candidateBlockPreviewInteractionEvents = Object.freeze([
  "beforeinput",
  "contextmenu",
  "dragstart",
  "keydown",
  "selectstart",
]);

function getCandidateBlockPreviewEventElement(event, surfaceElement) {
  const target = event?.target instanceof Element ? event.target : null;
  const blockElement = target?.closest?.("[data-candidate-block-instance]") || null;

  if (
    blockElement instanceof HTMLElement &&
    surfaceElement?.contains?.(blockElement) &&
    isCandidateBlockTemplatePreview(blockElement)
  ) {
    return blockElement;
  }

  return null;
}

function clearCandidateBlockPreviewRuntimeState(blockElement, surfaceElement, editor = null) {
  blockElement.querySelectorAll(".is-active-cell, .is-selected-cell, .is-selected-object, .is-selected-table-object").forEach((element) => {
    element.classList.remove("is-active-cell", "is-selected-cell", "is-selected-object", "is-selected-table-object");
  });

  surfaceElement?.classList?.remove("is-table-column-hover", "is-table-row-hover", "is-table-object-border-hover");

  const editorState = editor?.state?.templateEditor || null;

  if (!editorState) {
    return;
  }

  const selectedTableElement = editorState.selectedTableElement;
  const selectedTableBlock = selectedTableElement?.closest?.("[data-candidate-block-instance]") || null;

  if (selectedTableBlock === blockElement) {
    editorState.selectedTableElement = null;
  }

  const tableSelection = editorState.tableSelection;
  const tableSelectionBlock = tableSelection?.table?.closest?.("[data-candidate-block-instance]") || null;

  if (tableSelectionBlock === blockElement) {
    editorState.tableSelection = null;
  }

  const selection = window.getSelection?.();
  const anchorElement =
    selection?.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection?.anchorNode?.parentElement || null;
  const focusElement =
    selection?.focusNode?.nodeType === Node.ELEMENT_NODE
      ? selection.focusNode
      : selection?.focusNode?.parentElement || null;

  if (blockElement.contains(anchorElement) || blockElement.contains(focusElement)) {
    selection?.removeAllRanges();
    editorState.savedRange = null;
  }
}

function isCandidateBlockGridNumberControl(control) {
  return control instanceof HTMLInputElement &&
    control.type === "number" &&
    Boolean(control.closest?.(".examlist-candidate-block-grid-field"));
}

function getCandidateBlockGridSettingControl(event) {
  const target = event?.target instanceof Element ? event.target : null;

  return target?.closest?.("[data-examlist-block-grid-setting]") || null;
}

export { shouldPreventCandidateBlockGridNativeDeletion };

function getKeyboardSelectedCandidateBlockGridElement(surfaceElement) {
  const selectedGridElement = getSelectedCandidateBlockGridElement();

  if (
    selectedGridElement instanceof HTMLElement &&
    surfaceElement?.contains?.(selectedGridElement) &&
    selectedGridElement.classList.contains("is-selected-candidate-block-grid")
  ) {
    return selectedGridElement;
  }

  return surfaceElement?.querySelector?.("[data-candidate-block-grid].is-selected-candidate-block-grid") || null;
}

function refocusCandidateBlockGridElement(gridElement) {
  const ownerWindow = gridElement?.ownerDocument?.defaultView || null;
  const surfaceElement = gridElement?.closest?.("[data-editor-document-surface]") || null;

  if (surfaceElement?.ownerDocument?.activeElement === surfaceElement) {
    ownerWindow?.getSelection?.()?.removeAllRanges?.();
    surfaceElement.blur?.();
  }

  const selectedGridElement = selectCandidateBlockGridElement(gridElement);

  [0, 50, 150].forEach((delay) => {
    ownerWindow?.setTimeout?.(() => {
      if (selectedGridElement?.isConnected) {
        selectCandidateBlockGridElement(selectedGridElement);
      }
    }, delay);
  });

  return selectedGridElement;
}

function getCandidateBlockGridKeyboardNudgeDelta(key) {
  if (key === "ArrowUp") {
    return { x: 0, y: -1 };
  }

  if (key === "ArrowDown") {
    return { x: 0, y: 1 };
  }

  if (key === "ArrowLeft") {
    return { x: -1, y: 0 };
  }

  if (key === "ArrowRight") {
    return { x: 1, y: 0 };
  }

  return null;
}

export { getCandidateBlockGridConfig, isPhotoCandidateBlockGridPage } from "./candidate-block-grid-config.js";
export { collapseCandidateBlockGridForStorage, removeCandidateBlockGridRuntimeControls } from "./candidate-block-grid-dom.js";
export { buildCandidateBlockGridHtml } from "./candidate-block-grid-renderer.js";
export { resetCandidateBlockGridState } from "./candidate-block-grid-selection.js";
export { syncCandidateBlockTemplateFromSurface } from "./candidate-block-grid-surface.js";

function resolveCandidateBlockGridSelectedPage(appState, fallbackPage) {
  const selectedPageId = appState?.templateEditor?.selectedPageId;

  if (fallbackPage && (!selectedPageId || fallbackPage.id === selectedPageId)) {
    return fallbackPage;
  }

  return getSelectedPage(appState?.templateEditor) || fallbackPage || null;
}

export function commitCandidateBlockGridControlsToPage({ pagePropertiesHost, selectedPage, surfaceElement, syncControls = true } = {}) {
  const sectionElement = pagePropertiesHost?.querySelector?.(".examlist-candidate-block-grid-field") || null;

  if (!sectionElement || !selectedPage) {
    return false;
  }

  const previousConfig = ensurePageCandidateBlockGridConfig(selectedPage);
  const hasGridOnSurface = Boolean(surfaceElement?.querySelector?.("[data-candidate-block-grid]"));
  const activeTemplateHtml =
    (surfaceElement ? extractCandidateBlockTemplateHtml(surfaceElement) : "") ||
    previousConfig.blockTemplateHtml;
  const nextConfig = readCandidateBlockGridControls(sectionElement, {
    ...previousConfig,
    blockTemplateHtml: activeTemplateHtml,
  });

  if (nextConfig.variant === "photo" && hasGridOnSurface) {
    nextConfig.enabled = true;
  }

  selectedPage.settings.candidateBlockGrid = nextConfig;

  if (syncControls) {
    syncCandidateBlockGridControls(sectionElement, selectedPage);
  }

  if (!surfaceElement) {
    return true;
  }

  if (nextConfig.variant === "photo") {
    const shouldRestoreSelection = Boolean(
      surfaceElement.querySelector("[data-candidate-block-grid].is-selected-candidate-block-grid"),
    );

    if (nextConfig.enabled && hasGridOnSurface) {
      renderCandidateBlockGridOnSurface(surfaceElement, selectedPage);

      if (shouldRestoreSelection) {
        selectCandidateBlockGridElement(surfaceElement.querySelector("[data-candidate-block-grid]"), { focus: false });
      }
    }
  } else {
    const documentElement = surfaceElement.querySelector(".template-doc") || surfaceElement;

    nextConfig.enabled = false;
    selectedPage.settings.candidateBlockGrid = nextConfig;
    removeCandidateBlockGridElements(documentElement);
    clearCandidateBlockGridSelection();

    if (isBlankCandidateBlockGridHost(documentElement)) {
      documentElement.innerHTML = "<p><br></p>";
    }
  }

  return true;
}

export function bindCandidateBlockGridControls({
  appState = null,
  editor = null,
  onDirty = null,
  pagePropertiesHost,
  readOnly = false,
  selectedPage,
  surfaceElement,
}) {
  if (!pagePropertiesHost || !selectedPage || !surfaceElement) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-candidate-block-grid-field")?.remove();

  const getActiveSelectedPage = () => resolveCandidateBlockGridSelectedPage(appState, selectedPage);
  const getActiveContentPage = () => {
    const activePage = getActiveSelectedPage();
    return isCandidateBlockGridContentPage(activePage) ? activePage : null;
  };
  const initialSelectedPage = getActiveContentPage();

  if (!initialSelectedPage) {
    return () => {
      pagePropertiesHost.querySelector(".examlist-candidate-block-grid-field")?.remove();
    };
  }

  const sectionElement = createCandidateBlockGridControls(initialSelectedPage);
  const recognitionMarksElement = pagePropertiesHost.querySelector(".examlist-recognition-marks-field");

  if (recognitionMarksElement) {
    recognitionMarksElement.before(sectionElement);
  } else {
    pagePropertiesHost.append(sectionElement);
  }

  syncCandidateBlockGridControls(sectionElement, initialSelectedPage);
  hydrateCandidateBlockGridObjects(surfaceElement);

  if (isPhotoCandidateBlockGridPage(initialSelectedPage)) {
    renderCandidateBlockGridOnSurface(surfaceElement, initialSelectedPage);
  }

  const restoreMissingObjectControls = () => {
    const hasIncompleteControls = Array.from(surfaceElement.querySelectorAll("[data-candidate-block-grid]")).some(
      (gridElement) =>
        gridElement.querySelectorAll("[data-candidate-block-grid-move-handle]").length !== 1 ||
        gridElement.querySelectorAll("[data-candidate-block-grid-resize-handle]").length !== objectResizeCorners.length,
    );

    if (hasIncompleteControls) {
      hydrateCandidateBlockGridObjects(surfaceElement);
    }
  };
  const ObjectControlsMutationObserver = surfaceElement.ownerDocument?.defaultView?.MutationObserver;
  const objectControlsObserver = ObjectControlsMutationObserver
    ? new ObjectControlsMutationObserver(restoreMissingObjectControls)
    : null;

  objectControlsObserver?.observe(surfaceElement, { childList: true, subtree: true });

  if (readOnly) {
    sectionElement.querySelectorAll("button, input, select, textarea").forEach((controlElement) => {
      if ("disabled" in controlElement) {
        controlElement.disabled = true;
      }

      controlElement.setAttribute("aria-disabled", "true");
    });

    return () => {
      objectControlsObserver?.disconnect();
      closeCandidateBlockFocusEditor();
      clearCandidateBlockGridSelection();
      clearCandidateBlockGridBorderHover(surfaceElement);
      resetCandidateBlockGridInteractionSessions();
      sectionElement.remove();
    };
  }

  const markDirty = () => {

    if (typeof onDirty === "function") {
      onDirty();
    }
  };

  const applyFromControls = () => {
    const activePage = getActiveContentPage();

    if (!activePage) {
      return false;
    }

    closeCandidateBlockFocusEditor();
    commitCandidateBlockGridControlsToPage({ pagePropertiesHost, selectedPage: activePage, surfaceElement });
    markDirty();
    return true;
  };

  const handleControlInput = (event) => {
    const control = getCandidateBlockGridSettingControl(event);

    if (!control) {
      return;
    }

    if (isCandidateBlockGridNumberControl(control)) {
      const activePage = getActiveContentPage();

      if (!activePage) {
        return;
      }

      commitCandidateBlockGridControlsToPage({
        pagePropertiesHost,
        selectedPage: activePage,
        surfaceElement,
        syncControls: false,
      });
      markDirty();
      return;
    }

    applyFromControls();
  };
  const handleControlChange = (event) => {
    if (!getCandidateBlockGridSettingControl(event)) {
      return;
    }

    applyFromControls();
  };
  const handleControlFocusOut = (event) => {
    const control = getCandidateBlockGridSettingControl(event);

    if (!isCandidateBlockGridNumberControl(control)) {
      return;
    }

    applyFromControls();
  };
  const handleCreateClick = (event) => {
    const createButton = event.target?.closest?.("[data-examlist-block-grid-create]");

    if (!createButton) {
      return;
    }

    const activePage = getActiveContentPage();

    if (createButton.disabled || !activePage) {
      event.preventDefault();
      syncCandidateBlockGridControls(sectionElement, getActiveSelectedPage());
      return;
    }

    if (!applyFromControls()) {
      return;
    }

    insertCandidateBlockGridAtSelection(surfaceElement, activePage);
    markDirty();
  };
  const handleSurfacePointerDown = (event) => {
    if (isCandidateBlockFocusEditorOpen()) {
      if (!event.target?.closest?.("[data-candidate-block-focus-layer]")) {
        clearCandidateBlockGridBorderHover(surfaceElement);
        clearCandidateBlockGridSelection();
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    const moveHandle = event.target?.closest?.("[data-candidate-block-grid-move-handle]");
    const resizeHandle = event.target?.closest?.("[data-candidate-block-grid-resize-handle]");
    const gridElement = event.target?.closest?.("[data-candidate-block-grid]");
    const borderGridElement = getCandidateBlockGridBorderEventElement(event, surfaceElement);
    const blockElement = event.target?.closest?.("[data-candidate-block-instance]");
    const sourceBlockElement = getCandidateBlockTemplateSourceElement(gridElement);
    const activePage = getActiveContentPage();

    if (moveHandle && gridElement) {
      closeCandidateBlockFocusEditor();
      if (activePage) {
        startCandidateBlockGridMoveSession(gridElement, event, activePage, markDirty, selectCandidateBlockGridElement);
      }
      return;
    }

    if (resizeHandle && gridElement) {
      closeCandidateBlockFocusEditor();
      if (activePage) {
        startCandidateBlockGridResizeSession(
          gridElement,
          event,
          activePage,
          markDirty,
          resizeHandle.dataset.candidateBlockGridResizeCorner,
          selectCandidateBlockGridElement,
        );
      }
      return;
    }

    const isTableObjectBorder = isTemplateEditorTableObjectBorderEvent(event, surfaceElement);
    const isTableResizeHover =
      surfaceElement.classList.contains("is-table-column-hover") ||
      surfaceElement.classList.contains("is-table-row-hover");

    if (
      gridElement &&
      blockElement instanceof HTMLElement &&
      sourceBlockElement instanceof HTMLElement &&
      surfaceElement.contains(sourceBlockElement) &&
      !isCandidateBlockFocusEditorOpen(sourceBlockElement)
    ) {
      if (!activePage) {
        return;
      }

      const opened = openCandidateBlockFocusEditor({
        blockElement: sourceBlockElement,
        editor,
        onDirty: markDirty,
        selectedPage: activePage,
        surfaceElement,
      });
      if (!opened) {
        return;
      }
      clearCandidateBlockGridSelection();
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (borderGridElement && (!isTableObjectBorder || isCandidateBlockGridVerticalBorderEvent(event, borderGridElement))) {
      closeCandidateBlockFocusEditor();
      selectCandidateBlockGridElement(borderGridElement);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      blockElement &&
      isCandidateBlockTemplateSource(blockElement) &&
      !isCandidateBlockFocusEditorOpen(blockElement) &&
      !isTableObjectBorder &&
      !isTableResizeHover
    ) {
      if (!activePage) {
        return;
      }

      const opened = openCandidateBlockFocusEditor({
        blockElement,
        editor,
        onDirty: markDirty,
        selectedPage: activePage,
        surfaceElement,
      });
      if (!opened) {
        return;
      }
      clearCandidateBlockGridSelection();
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (blockElement && isTableObjectBorder) {
      clearCandidateBlockGridSelection();
      return;
    }

    if (gridElement) {
      clearCandidateBlockGridSelection();
      return;
    }

    const didPlaceOutsideCaret = scheduleCandidateBlockGridOutsideCaretPlacement(event, surfaceElement);

    if (didPlaceOutsideCaret && event.cancelable) {
      event.preventDefault();
    }

    clearCandidateBlockGridSelection();
  };
  const handleWindowPointerDown = (event) => {
    const target = event.target instanceof Node ? event.target : null;

    if (!target || !surfaceElement.contains(target)) {
      return;
    }

    handleSurfacePointerDown(event);
  };
  const handleSurfacePointerMove = (event) => {
    if (isCandidateBlockFocusEditorOpen()) {
      clearCandidateBlockGridBorderHover(surfaceElement);
      return;
    }

    syncCandidateBlockGridBorderHover(event, surfaceElement);
  };
  const handleSurfacePointerLeave = () => {
    clearCandidateBlockGridBorderHover(surfaceElement);
  };
  const handleCandidateBlockGridKeyboardNudge = (event) => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target?.closest?.("[data-candidate-block-focus-layer], [data-candidate-block-modal-editor-surface]")
    ) {
      return false;
    }

    const delta = getCandidateBlockGridKeyboardNudgeDelta(event.key);

    if (!delta) {
      return false;
    }

    const selectedGridElement = getKeyboardSelectedCandidateBlockGridElement(surfaceElement);
    const activePage = getActiveContentPage();

    if (
      !(selectedGridElement instanceof HTMLElement) ||
      !activePage ||
      !isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, selectedGridElement)
    ) {
      return false;
    }

    if (!nudgeCandidateBlockGridPosition(selectedGridElement, delta.x, delta.y, activePage, markDirty, selectCandidateBlockGridElement)) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return true;
  };
  const handleSurfaceKeyDown = (event) => {
    if (event.key === "Escape" && isCandidateBlockFocusEditorOpen()) {
      cancelCandidateBlockFocusEditor();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === "Enter" && event.target?.closest?.("[data-candidate-block-grid]") && !event.target?.closest?.("[data-candidate-block-instance]")) {
      event.preventDefault();
      return;
    }

    if (handleCandidateBlockGridKeyboardNudge(event)) {
      return;
    }

    if (!["Backspace", "Delete"].includes(event.key)) {
      return;
    }

    const selectedTableElement = editor?.state?.templateEditor?.selectedTableElement || null;

    if (selectedTableElement instanceof HTMLElement && surfaceElement.contains(selectedTableElement)) {
      return;
    }

    const editedTableBlock = deleteCandidateBlockTableSelection(surfaceElement, editor);

    if (editedTableBlock) {
      const activePage = getActiveContentPage();

      if (!activePage) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      syncCandidateBlockTemplateFromSurface(surfaceElement, activePage, editedTableBlock);
      editor?.sync?.({ preserveSelection: true, focusEditor: true });
      markDirty();
      return;
    }

    if (event.target?.closest?.("[data-candidate-block-focus-layer], [data-candidate-block-modal-editor-surface]")) {
      return;
    }

    const selectedGridElement = getKeyboardSelectedCandidateBlockGridElement(surfaceElement);

    if (
      event.key === "Backspace" &&
      isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, selectedGridElement)
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      refocusCandidateBlockGridElement(selectedGridElement);
      return;
    }

    if (
      event.key === "Delete" &&
      isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, selectedGridElement)
    ) {
      const activePage = getActiveContentPage();

      if (
        !activePage ||
        !deleteCandidateBlockGridObject(
          surfaceElement,
          activePage,
          selectedGridElement,
          clearCandidateBlockGridSelection,
          isBlankCandidateBlockGridHost,
        )
      ) {
        return;
      }

      closeCandidateBlockFocusEditor();
      event.preventDefault();
      event.stopImmediatePropagation?.();
      markDirty();
      return;
    }

    if (shouldPreventCandidateBlockGridNativeDeletion(event, surfaceElement)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const handleDocumentKeyDown = (event) => {
    if (handleCandidateBlockGridKeyboardNudge(event)) {
      return;
    }

    if (event.defaultPrevented || !["Backspace", "Delete"].includes(event.key)) {
      return;
    }

    if (event.target?.closest?.("[data-candidate-block-focus-layer], [data-candidate-block-modal-editor-surface]")) {
      return;
    }

    const selectedGridElement = getKeyboardSelectedCandidateBlockGridElement(surfaceElement);

    if (!isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, selectedGridElement)) {
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      refocusCandidateBlockGridElement(selectedGridElement);
      return;
    }

    const activePage = getActiveContentPage();

    if (
      activePage &&
      deleteCandidateBlockGridObject(
        surfaceElement,
        activePage,
        selectedGridElement,
        clearCandidateBlockGridSelection,
        isBlankCandidateBlockGridHost,
      )
    ) {
      closeCandidateBlockFocusEditor();
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      markDirty();
    }
  };
  const handlePreviewInteraction = (event) => {
    const previewBlockElement = getCandidateBlockPreviewEventElement(event, surfaceElement);

    if (!previewBlockElement) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    event.stopPropagation();
    event.stopImmediatePropagation?.();
    clearCandidateBlockPreviewRuntimeState(previewBlockElement, surfaceElement, editor);
  };
  const handleObjectFlowLayoutChange = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const gridElement = target?.closest?.("[data-candidate-block-grid], .examlist-candidate-block-grid") || null;

    if (!(gridElement instanceof HTMLElement) || !surfaceElement.contains(gridElement)) {
      return;
    }

    const activePage = getActiveContentPage();

    if (!activePage) {
      return;
    }

    writeCandidateBlockGridSizeToConfig(activePage, gridElement);
    markDirty();
  };
  const handleSurfaceInput = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const editedBlock = target?.closest?.("[data-candidate-block-instance]") || null;

    if (
      !(editedBlock instanceof HTMLElement) ||
      !surfaceElement.contains(editedBlock) ||
      editedBlock.matches?.("[data-candidate-block-modal-editor-surface]")
    ) {
      return;
    }

    const activePage = getActiveContentPage();

    if (!activePage) {
      return;
    }

    syncCandidateBlockTemplateFromSurface(surfaceElement, activePage, editedBlock);
    markDirty();
  };

  sectionElement.addEventListener("input", handleControlInput);
  sectionElement.addEventListener("change", handleControlChange);
  sectionElement.addEventListener("focusout", handleControlFocusOut);
  sectionElement.addEventListener("click", handleCreateClick);
  candidateBlockPreviewInteractionEvents.forEach((eventName) => {
    surfaceElement.addEventListener(eventName, handlePreviewInteraction, true);
  });
  // Candidate-block focus/move/resize owns its pointer gesture. Capture from
  // the window so this handler runs before document/surface capture listeners
  // can normalize the editor DOM and detach the original event target.
  surfaceElement.ownerDocument?.defaultView?.addEventListener?.("pointerdown", handleWindowPointerDown, true);
  surfaceElement.addEventListener("pointermove", handleSurfacePointerMove);
  surfaceElement.addEventListener("pointerleave", handleSurfacePointerLeave);
  surfaceElement.addEventListener("keydown", handleSurfaceKeyDown);
  surfaceElement.addEventListener("input", handleSurfaceInput);
  surfaceElement.addEventListener(objectFlowLayoutChangeEventName, handleObjectFlowLayoutChange);
  surfaceElement.ownerDocument?.addEventListener?.("keydown", handleDocumentKeyDown, true);
  window.addEventListener("pointermove", handleCandidateBlockGridMove);
  window.addEventListener("pointerup", handleCandidateBlockGridMoveEnd);
  window.addEventListener("pointercancel", handleCandidateBlockGridMoveEnd);
  window.addEventListener("pointermove", handleCandidateBlockGridResizeMove);
  window.addEventListener("pointerup", handleCandidateBlockGridResizeEnd);
  window.addEventListener("pointercancel", handleCandidateBlockGridResizeEnd);

  return () => {
    objectControlsObserver?.disconnect();
    closeCandidateBlockFocusEditor();
    clearCandidateBlockGridSelection();
    clearCandidateBlockGridBorderHover(surfaceElement);
    resetCandidateBlockGridInteractionSessions();
    sectionElement.removeEventListener("input", handleControlInput);
    sectionElement.removeEventListener("change", handleControlChange);
    sectionElement.removeEventListener("focusout", handleControlFocusOut);
    sectionElement.removeEventListener("click", handleCreateClick);
    candidateBlockPreviewInteractionEvents.forEach((eventName) => {
      surfaceElement.removeEventListener(eventName, handlePreviewInteraction, true);
    });
    surfaceElement.ownerDocument?.defaultView?.removeEventListener?.("pointerdown", handleWindowPointerDown, true);
    surfaceElement.removeEventListener("pointermove", handleSurfacePointerMove);
    surfaceElement.removeEventListener("pointerleave", handleSurfacePointerLeave);
    surfaceElement.removeEventListener("keydown", handleSurfaceKeyDown);
    surfaceElement.removeEventListener("input", handleSurfaceInput);
    surfaceElement.removeEventListener(objectFlowLayoutChangeEventName, handleObjectFlowLayoutChange);
    surfaceElement.ownerDocument?.removeEventListener?.("keydown", handleDocumentKeyDown, true);
    window.removeEventListener("pointermove", handleCandidateBlockGridMove);
    window.removeEventListener("pointerup", handleCandidateBlockGridMoveEnd);
    window.removeEventListener("pointercancel", handleCandidateBlockGridMoveEnd);
    window.removeEventListener("pointermove", handleCandidateBlockGridResizeMove);
    window.removeEventListener("pointerup", handleCandidateBlockGridResizeEnd);
    window.removeEventListener("pointercancel", handleCandidateBlockGridResizeEnd);
    sectionElement.remove();
  };
}
