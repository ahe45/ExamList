import {
  isCandidateBlockGridContentPage,
  isPhotoCandidateBlockGridPage,
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
  resetCandidateBlockGridInteractionSessions,
  startCandidateBlockGridMoveSession,
  startCandidateBlockGridResizeSession,
  writeCandidateBlockGridSizeToConfig,
} from "./candidate-block-grid-sessions.js";
import { objectFlowLayoutChangeEventName } from "./object-flow-reflow.js";
import {
  closeCandidateBlockFocusEditor,
  isCandidateBlockFocusEditorOpen,
  openCandidateBlockFocusEditor,
} from "./candidate-block-grid-focus-editor.js";
import {
  clearCandidateBlockGridSelection,
  getSelectedCandidateBlockGridElement,
  selectCandidateBlockGridElement,
} from "./candidate-block-grid-selection.js";
import {
  extractCandidateBlockTemplateHtml,
  getCandidateBlockGridElements,
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

function isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, gridElement) {
  if (!(gridElement instanceof HTMLElement) || !surfaceElement?.contains?.(gridElement)) {
    return false;
  }

  if (!gridElement.classList.contains("is-selected-candidate-block-grid")) {
    return false;
  }

  const target = event?.target instanceof Element ? event.target : null;
  const activeElement = gridElement.ownerDocument?.activeElement || null;
  const targetGridElement = target?.closest?.("[data-candidate-block-grid]") || null;
  const activeGridElement = activeElement?.closest?.("[data-candidate-block-grid]") || null;
  const targetSurfaceElement = target?.closest?.("[data-editor-document-surface]") || null;
  const activeSurfaceElement = activeElement?.closest?.("[data-editor-document-surface]") || null;
  const isEditingControl = (element) => {
    if (element instanceof Element && !element.isConnected) {
      return false;
    }

    const control = element?.closest?.("input, textarea, select, button, [contenteditable='true']") || null;

    return Boolean(
      control &&
        control !== gridElement &&
        !gridElement.contains(control) &&
        control.closest?.("[data-editor-document-surface]") !== surfaceElement
    );
  };

  if (isEditingControl(target) || isEditingControl(activeElement)) {
    return false;
  }

  return (
    targetGridElement === gridElement ||
    activeGridElement === gridElement ||
    targetSurfaceElement === surfaceElement ||
    activeSurfaceElement === surfaceElement ||
    target === gridElement.ownerDocument?.body ||
    activeElement === gridElement.ownerDocument?.body ||
    activeElement === gridElement.ownerDocument?.documentElement
  );
}

function isIgnorableCandidateBlockBoundaryNode(node) {
  if (node?.nodeType === Node.TEXT_NODE) {
    return !String(node.textContent || "").trim();
  }

  return node instanceof HTMLElement && node.tagName === "BR";
}

function getAdjacentCandidateBlockBoundaryNode(parentNode, startIndex, direction) {
  if (!parentNode?.childNodes) {
    return null;
  }

  const step = direction === "backward" ? -1 : 1;
  let index = startIndex;

  while (index >= 0 && index < parentNode.childNodes.length) {
    const node = parentNode.childNodes[index];

    if (!isIgnorableCandidateBlockBoundaryNode(node)) {
      return node;
    }

    index += step;
  }

  return null;
}

function getCandidateBlockGridFromBoundaryNode(node, direction) {
  let currentNode = node || null;

  while (currentNode) {
    if (currentNode instanceof HTMLElement && currentNode.matches("[data-candidate-block-grid], .examlist-candidate-block-grid")) {
      return currentNode;
    }

    if (!(currentNode instanceof HTMLElement) || !currentNode.childNodes.length) {
      return null;
    }

    currentNode =
      direction === "backward"
        ? getAdjacentCandidateBlockBoundaryNode(currentNode, currentNode.childNodes.length - 1, "backward")
        : getAdjacentCandidateBlockBoundaryNode(currentNode, 0, "forward");
  }

  return null;
}

function getCandidateBlockGridAdjacentToRange(range, direction, surfaceElement) {
  let currentNode = range?.startContainer || null;
  let currentOffset = range?.startOffset || 0;

  while (currentNode) {
    let adjacentNode = null;

    if (currentNode.nodeType === Node.TEXT_NODE) {
      const textLength = currentNode.textContent?.length || 0;
      const isBoundary = direction === "backward" ? currentOffset === 0 : currentOffset === textLength;

      if (!isBoundary) {
        return null;
      }

      adjacentNode = getAdjacentCandidateBlockBoundaryNode(
        currentNode.parentNode,
        Array.prototype.indexOf.call(currentNode.parentNode?.childNodes || [], currentNode) + (direction === "backward" ? -1 : 1),
        direction,
      );
    } else {
      adjacentNode = getAdjacentCandidateBlockBoundaryNode(
        currentNode,
        direction === "backward" ? currentOffset - 1 : currentOffset,
        direction,
      );
    }

    const adjacentGridElement = getCandidateBlockGridFromBoundaryNode(adjacentNode, direction);

    if (adjacentGridElement instanceof HTMLElement && surfaceElement.contains(adjacentGridElement)) {
      return adjacentGridElement;
    }

    if (adjacentNode) {
      return null;
    }

    if (currentNode === surfaceElement) {
      return null;
    }

    const parentNode = currentNode.parentNode;

    if (!parentNode || !surfaceElement.contains(parentNode)) {
      return null;
    }

    const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, currentNode);

    currentOffset = direction === "backward" ? currentIndex : currentIndex + 1;
    currentNode = parentNode;
  }

  return null;
}

function getCandidateBlockBoundaryHostElement(range, surfaceElement) {
  let currentNode = range?.startContainer || null;

  if (currentNode?.nodeType === Node.TEXT_NODE) {
    currentNode = currentNode.parentElement;
  }

  while (currentNode instanceof HTMLElement && currentNode !== surfaceElement) {
    if (currentNode.matches("[data-candidate-block-grid], .examlist-candidate-block-grid")) {
      return null;
    }

    if (
      currentNode.matches("p, div, h1, h2, h3, blockquote, ul, ol") &&
      !currentNode.closest("[data-candidate-block-grid], .examlist-candidate-block-grid")
    ) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
}

function isBlankCandidateBlockBoundaryHost(element) {
  const normalizedHtml = String(element?.innerHTML || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s+/g, "")
    .trim();

  return normalizedHtml === "";
}

function getCandidateBlockGridSibling(element, direction, surfaceElement) {
  const parentNode = element?.parentNode || null;

  if (!parentNode) {
    return null;
  }

  const currentIndex = Array.prototype.indexOf.call(parentNode.childNodes, element);
  const siblingNode = getAdjacentCandidateBlockBoundaryNode(
    parentNode,
    currentIndex + (direction === "backward" ? -1 : 1),
    direction,
  );
  const gridElement = getCandidateBlockGridFromBoundaryNode(siblingNode, direction);

  return gridElement instanceof HTMLElement && surfaceElement.contains(gridElement) ? gridElement : null;
}

function isBlankBoundaryHostAdjacentToCandidateBlockGrid(range, surfaceElement) {
  const hostElement = getCandidateBlockBoundaryHostElement(range, surfaceElement);

  return Boolean(
    hostElement &&
      isBlankCandidateBlockBoundaryHost(hostElement) &&
      (
        getCandidateBlockGridSibling(hostElement, "backward", surfaceElement) ||
        getCandidateBlockGridSibling(hostElement, "forward", surfaceElement)
      )
  );
}

function doesRangeIncludeCandidateBlockGrid(range, surfaceElement) {
  if (!range || range.collapsed) {
    return false;
  }

  return getCandidateBlockGridElements(surfaceElement).some((gridElement) => {
    try {
      return range.intersectsNode(gridElement);
    } catch (error) {
      return false;
    }
  });
}

function shouldPreventCandidateBlockGridNativeDeletion(event, surfaceElement) {
  const direction = event?.key === "Backspace" ? "backward" : event?.key === "Delete" ? "forward" : "";

  if (!direction || !(surfaceElement instanceof HTMLElement)) {
    return false;
  }

  const selection = window.getSelection?.();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

  if (!range || !surfaceElement.contains(range.commonAncestorContainer)) {
    return false;
  }

  if (!range.collapsed) {
    return doesRangeIncludeCandidateBlockGrid(range, surfaceElement);
  }

  if (isBlankBoundaryHostAdjacentToCandidateBlockGrid(range, surfaceElement)) {
    return true;
  }

  return Boolean(getCandidateBlockGridAdjacentToRange(range, direction, surfaceElement));
}

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

export { getCandidateBlockGridConfig, isPhotoCandidateBlockGridPage } from "./candidate-block-grid-config.js";
export { collapseCandidateBlockGridForStorage, removeCandidateBlockGridRuntimeControls } from "./candidate-block-grid-dom.js";
export { buildCandidateBlockGridHtml } from "./candidate-block-grid-renderer.js";
export { resetCandidateBlockGridState } from "./candidate-block-grid-selection.js";
export { syncCandidateBlockTemplateFromSurface } from "./candidate-block-grid-surface.js";

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

export function bindCandidateBlockGridControls({ editor = null, onDirty = null, pagePropertiesHost, selectedPage, surfaceElement }) {
  if (!pagePropertiesHost || !selectedPage || !surfaceElement) {
    return null;
  }

  pagePropertiesHost.querySelector(".examlist-candidate-block-grid-field")?.remove();

  if (!isCandidateBlockGridContentPage(selectedPage)) {
    return () => {
      pagePropertiesHost.querySelector(".examlist-candidate-block-grid-field")?.remove();
    };
  }

  const sectionElement = createCandidateBlockGridControls(selectedPage);
  const recognitionMarksElement = pagePropertiesHost.querySelector(".examlist-recognition-marks-field");

  if (recognitionMarksElement) {
    recognitionMarksElement.before(sectionElement);
  } else {
    pagePropertiesHost.append(sectionElement);
  }

  syncCandidateBlockGridControls(sectionElement, selectedPage);
  hydrateCandidateBlockGridObjects(surfaceElement);

  if (isPhotoCandidateBlockGridPage(selectedPage)) {
    renderCandidateBlockGridOnSurface(surfaceElement, selectedPage);
  }

  const markDirty = () => {

    if (typeof onDirty === "function") {
      onDirty();
    }
  };

  const applyFromControls = () => {
    closeCandidateBlockFocusEditor();
    commitCandidateBlockGridControlsToPage({ pagePropertiesHost, selectedPage, surfaceElement });
    markDirty();
  };

  const handleControlInput = (event) => {
    const control = getCandidateBlockGridSettingControl(event);

    if (!control) {
      return;
    }

    if (isCandidateBlockGridNumberControl(control)) {
      commitCandidateBlockGridControlsToPage({
        pagePropertiesHost,
        selectedPage,
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

    if (createButton.disabled || !isCandidateBlockGridContentPage(selectedPage)) {
      event.preventDefault();
      syncCandidateBlockGridControls(sectionElement, selectedPage);
      return;
    }

    applyFromControls();
    insertCandidateBlockGridAtSelection(surfaceElement, selectedPage);
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

    if (moveHandle && gridElement) {
      closeCandidateBlockFocusEditor();
      startCandidateBlockGridMoveSession(gridElement, event, selectedPage, markDirty, selectCandidateBlockGridElement);
      return;
    }

    if (resizeHandle && gridElement) {
      closeCandidateBlockFocusEditor();
      startCandidateBlockGridResizeSession(
        gridElement,
        event,
        selectedPage,
        markDirty,
        resizeHandle.dataset.candidateBlockGridResizeCorner,
        selectCandidateBlockGridElement,
      );
      return;
    }

    const isTableObjectBorder = isTemplateEditorTableObjectBorderEvent(event, surfaceElement);
    const isTableResizeHover =
      surfaceElement.classList.contains("is-table-column-hover") ||
      surfaceElement.classList.contains("is-table-row-hover");

    if (borderGridElement && (!isTableObjectBorder || isCandidateBlockGridVerticalBorderEvent(event, borderGridElement))) {
      closeCandidateBlockFocusEditor();
      selectCandidateBlockGridElement(borderGridElement);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      gridElement &&
      sourceBlockElement instanceof HTMLElement &&
      surfaceElement.contains(sourceBlockElement) &&
      !isCandidateBlockFocusEditorOpen(sourceBlockElement) &&
      !borderGridElement
    ) {
      openCandidateBlockFocusEditor({ blockElement: sourceBlockElement, editor, onDirty: markDirty, selectedPage, surfaceElement });
      clearCandidateBlockGridSelection();
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
      openCandidateBlockFocusEditor({ blockElement, editor, onDirty: markDirty, selectedPage, surfaceElement });
      clearCandidateBlockGridSelection();
      event.preventDefault();
      event.stopPropagation();
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
  const handleSurfaceKeyDown = (event) => {
    if (event.key === "Escape" && isCandidateBlockFocusEditorOpen()) {
      closeCandidateBlockFocusEditor();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === "Enter" && event.target?.closest?.("[data-candidate-block-grid]") && !event.target?.closest?.("[data-candidate-block-instance]")) {
      event.preventDefault();
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
      event.preventDefault();
      event.stopPropagation();
      syncCandidateBlockTemplateFromSurface(surfaceElement, selectedPage, editedTableBlock);
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
      isCandidateBlockGridKeyboardDeleteTarget(event, surfaceElement, selectedGridElement) &&
      deleteCandidateBlockGridObject(
        surfaceElement,
        selectedPage,
        selectedGridElement,
        clearCandidateBlockGridSelection,
        isBlankCandidateBlockGridHost,
      )
    ) {
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

    if (
      deleteCandidateBlockGridObject(
        surfaceElement,
        selectedPage,
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

    writeCandidateBlockGridSizeToConfig(selectedPage, gridElement);
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

    syncCandidateBlockTemplateFromSurface(surfaceElement, selectedPage, editedBlock);
    markDirty();
  };

  sectionElement.addEventListener("input", handleControlInput);
  sectionElement.addEventListener("change", handleControlChange);
  sectionElement.addEventListener("focusout", handleControlFocusOut);
  sectionElement.addEventListener("click", handleCreateClick);
  candidateBlockPreviewInteractionEvents.forEach((eventName) => {
    surfaceElement.addEventListener(eventName, handlePreviewInteraction, true);
  });
  surfaceElement.addEventListener("pointerdown", handleSurfacePointerDown);
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
    surfaceElement.removeEventListener("pointerdown", handleSurfacePointerDown);
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
