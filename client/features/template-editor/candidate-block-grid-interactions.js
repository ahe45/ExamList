import {
  candidateBlockFocusTableObjectOuterHitSlop,
  candidateBlockGridDefaults,
  templateEditorTableObjectBorderHitSlop,
} from "./candidate-block-grid-config.js";
import { ensurePageCandidateBlockGridConfig } from "./candidate-block-grid-renderer.js";
import {
  getCandidateBlockGridElements,
  removeCandidateBlockGridFlowSpacers,
} from "./candidate-block-grid-dom.js";
import { isCandidateBlockTemplateSource } from "./candidate-block-grid-block-roles.js";

export function deleteCandidateBlockGridObject(
  surfaceElement,
  selectedPage,
  gridElement,
  clearSelection,
  isBlankHost,
) {
  if (!surfaceElement || !(gridElement instanceof HTMLElement) || !surfaceElement.contains(gridElement)) {
    return false;
  }

  const documentElement = surfaceElement.querySelector(".template-doc") || surfaceElement;
  const config = ensurePageCandidateBlockGridConfig(selectedPage);

  config.enabled = false;
  config.blockTemplateHtml = candidateBlockGridDefaults.blockTemplateHtml;
  config.columnNameRow = { ...candidateBlockGridDefaults.columnNameRow };
  config.emptyBlockLayer = { ...candidateBlockGridDefaults.emptyBlockLayer };
  removeCandidateBlockGridFlowSpacers(documentElement);
  gridElement.remove();
  clearSelection?.();

  if (isBlankHost?.(documentElement)) {
    documentElement.innerHTML = "<p><br></p>";
  }

  return true;
}

function isTemplateEditorOuterBorderPoint(event, element, hitSlop = templateEditorTableObjectBorderHitSlop) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const isInsideHorizontalBounds = event.clientX >= rect.left - hitSlop && event.clientX <= rect.right + hitSlop;
  const isInsideVerticalBounds = event.clientY >= rect.top - hitSlop && event.clientY <= rect.bottom + hitSlop;

  if (!isInsideHorizontalBounds || !isInsideVerticalBounds) {
    return false;
  }

  const edgeDistance = Math.min(
    Math.abs(event.clientX - rect.left),
    Math.abs(event.clientX - rect.right),
    Math.abs(event.clientY - rect.top),
    Math.abs(event.clientY - rect.bottom),
  );

  return edgeDistance <= hitSlop;
}

function getTemplateEditorTableObjectOuterHitSlop(tableElement, hitSlop = templateEditorTableObjectBorderHitSlop) {
  return isTemplateEditorCandidateBlockFocusTable(tableElement)
    ? Math.max(hitSlop, candidateBlockFocusTableObjectOuterHitSlop)
    : hitSlop;
}

function isTemplateEditorInnerOuterBorderPoint(event, element, hitSlop = templateEditorTableObjectBorderHitSlop) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    return false;
  }

  const insideHitSlop = Math.min(
    hitSlop,
    Math.max(2, Math.min(rect.width, rect.height) / 4),
  );
  const edgeDistance = Math.min(
    event.clientX - rect.left,
    rect.right - event.clientX,
    event.clientY - rect.top,
    rect.bottom - event.clientY,
  );

  return edgeDistance <= insideHitSlop;
}

function isTemplateEditorSelectableCandidateBlockTable(tableElement) {
  const blockElement = tableElement?.closest?.("[data-candidate-block-instance]") || null;

  return !(blockElement instanceof HTMLElement) ||
    (isCandidateBlockTemplateSource(blockElement) && blockElement.classList.contains("is-candidate-block-focus-editor"));
}

function isTemplateEditorCandidateBlockFocusTable(tableElement) {
  const blockElement = tableElement?.closest?.("[data-candidate-block-instance]") || null;

  return Boolean(
    blockElement instanceof HTMLElement &&
      isCandidateBlockTemplateSource(blockElement) &&
      blockElement.classList.contains("is-candidate-block-focus-editor"),
  );
}

export function isCandidateBlockGridVerticalBorderEvent(event, gridElement, hitSlop = templateEditorTableObjectBorderHitSlop) {
  if (!(gridElement instanceof HTMLElement)) {
    return false;
  }

  const rect = gridElement.getBoundingClientRect();
  const isInsideVerticalBounds = event.clientY >= rect.top - hitSlop && event.clientY <= rect.bottom + hitSlop;

  return Boolean(
    isInsideVerticalBounds &&
      (
        Math.abs(event.clientX - rect.left) <= hitSlop ||
        Math.abs(event.clientX - rect.right) <= hitSlop
      ),
  );
}

export function isTemplateEditorTableObjectBorderEvent(event, surfaceElement) {
  const target = event?.target instanceof Element ? event.target : null;
  const directTableElement = target?.closest?.("table") || null;

  if (
    directTableElement instanceof HTMLElement &&
    surfaceElement?.contains?.(directTableElement) &&
    isTemplateEditorSelectableCandidateBlockTable(directTableElement)
  ) {
    const outerHitSlop = getTemplateEditorTableObjectOuterHitSlop(directTableElement);

    return isTemplateEditorOuterBorderPoint(event, directTableElement, outerHitSlop) ||
      (
        isTemplateEditorCandidateBlockFocusTable(directTableElement) &&
        isTemplateEditorInnerOuterBorderPoint(event, directTableElement)
      );
  }

  return Array.from(surfaceElement?.querySelectorAll?.("table") || []).some((tableElement) =>
    tableElement instanceof HTMLElement &&
      surfaceElement.contains(tableElement) &&
      isTemplateEditorSelectableCandidateBlockTable(tableElement) &&
      (
        isTemplateEditorOuterBorderPoint(
          event,
          tableElement,
          getTemplateEditorTableObjectOuterHitSlop(tableElement),
        ) ||
        (
          isTemplateEditorCandidateBlockFocusTable(tableElement) &&
          isTemplateEditorInnerOuterBorderPoint(event, tableElement)
        )
      ),
  );
}

export function getCandidateBlockGridBorderEventElement(event, surfaceElement) {
  if (!surfaceElement?.contains || !surfaceElement?.querySelectorAll) {
    return null;
  }

  const target = event?.target instanceof Element ? event.target : null;
  const directGridElement = target?.closest?.("[data-candidate-block-grid]") || null;
  const gridElements = getCandidateBlockGridElements(surfaceElement);
  const candidates =
    directGridElement instanceof HTMLElement && surfaceElement.contains(directGridElement)
      ? [directGridElement, ...gridElements.filter((gridElement) => gridElement !== directGridElement)]
      : gridElements;

  return candidates.find((gridElement) => isTemplateEditorOuterBorderPoint(event, gridElement)) || null;
}

export function clearCandidateBlockGridBorderHover(surfaceElement, preservedGridElement = null) {
  getCandidateBlockGridElements(surfaceElement).forEach((gridElement) => {
    if (gridElement !== preservedGridElement) {
      gridElement.classList.remove("is-candidate-block-grid-border-hover");
    }
  });
}

export function syncCandidateBlockGridBorderHover(event, surfaceElement) {
  const gridElement = getCandidateBlockGridBorderEventElement(event, surfaceElement);
  const isTableObjectBorder = isTemplateEditorTableObjectBorderEvent(event, surfaceElement);

  if (isTableObjectBorder && !isCandidateBlockGridVerticalBorderEvent(event, gridElement)) {
    clearCandidateBlockGridBorderHover(surfaceElement);
    return null;
  }

  clearCandidateBlockGridBorderHover(surfaceElement, gridElement);
  gridElement?.classList?.add("is-candidate-block-grid-border-hover");
  return gridElement;
}

function getActiveCandidateBlockTableSelection(surfaceElement, editor = null) {
  const tableSelection = editor?.state?.templateEditor?.tableSelection || null;
  const tableElement = tableSelection?.table || null;
  const selectedCells = Array.isArray(tableSelection?.selectedCells)
    ? tableSelection.selectedCells.filter((cell) => cell instanceof HTMLElement && tableElement?.contains(cell))
    : [];
  const blockElement = tableElement?.closest?.("[data-candidate-block-instance]") || null;

  if (
    !(tableElement instanceof HTMLTableElement) ||
    !(blockElement instanceof HTMLElement) ||
    !isCandidateBlockTemplateSource(blockElement) ||
    !surfaceElement?.contains?.(tableElement) ||
    !selectedCells.length
  ) {
    return null;
  }

  return {
    blockElement,
    selectedCells,
    tableElement,
  };
}

function clearCandidateBlockTableSelectionState(tableElement, editor = null) {
  tableElement?.querySelectorAll?.(".is-selected-cell").forEach((cellElement) => {
    cellElement.classList.remove("is-selected-cell");
  });

  if (editor?.state?.templateEditor) {
    editor.state.templateEditor.tableSelection = null;
  }
}

function placeCaretInCandidateBlock(blockElement, editor = null) {
  if (!(blockElement instanceof HTMLElement)) {
    return;
  }

  const caretHost = blockElement.querySelector("p, div") || blockElement;
  const selection = window.getSelection?.();

  if (!selection) {
    return;
  }

  const range = document.createRange();

  range.selectNodeContents(caretHost);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);

  if (editor?.state?.templateEditor) {
    editor.state.templateEditor.savedRange = range.cloneRange();
  }
}

export function deleteCandidateBlockTableSelection(surfaceElement, editor = null) {
  const activeSelection = getActiveCandidateBlockTableSelection(surfaceElement, editor);

  if (!activeSelection) {
    return null;
  }

  const { blockElement, selectedCells, tableElement } = activeSelection;
  const allCells = Array.from(tableElement.querySelectorAll("td, th"));
  const selectedCellSet = new Set(selectedCells);
  const isEntireTableSelected = allCells.length > 0 && allCells.every((cellElement) => selectedCellSet.has(cellElement));

  if (isEntireTableSelected) {
    blockElement.innerHTML = "<p><br></p>";
    blockElement.classList.remove("has-candidate-block-table");
    clearCandidateBlockTableSelectionState(tableElement, editor);
    placeCaretInCandidateBlock(blockElement, editor);
    return blockElement;
  }

  selectedCells.forEach((cellElement) => {
    cellElement.innerHTML = "<br>";
    cellElement.classList.remove("is-selected-cell");
  });
  clearCandidateBlockTableSelectionState(tableElement, editor);
  placeCaretInCandidateBlock(blockElement, editor);
  return blockElement;
}
