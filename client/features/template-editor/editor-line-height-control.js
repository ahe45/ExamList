import {
  defaultEditorLineHeight,
  lineHeightMaximum,
  lineHeightMinimum,
  lineHeightStep,
  normalizeLineHeightValue,
} from "./editor-text-control-config.js";
import {
  getClosestEditorTextBlock,
  getRestorableEditorTextControlSelection,
  getSelectedTableCells,
  getSelectionRangeInsideSurface,
  rememberEditorTextControlSelection,
  restoreEditorTextControlSelection,
} from "./editor-text-selection.js";
import { positionFontSizeSection } from "./editor-text-toolbar-layout.js";

const pointsPerCssPixel = 0.75;
const textBlockTags = new Set(["P", "H1", "H2", "H3", "LI", "BLOCKQUOTE", "DIV"]);

function getCandidateBlockModalSurface(surfaceElement) {
  const modalSurfaceElement = window.ExamListCandidateBlockModalEditor?.getActiveSurface?.() || null;

  return modalSurfaceElement instanceof HTMLElement && surfaceElement?.contains?.(modalSurfaceElement)
    ? modalSurfaceElement
    : null;
}

function getActiveLineHeightSurface(surfaceElement) {
  return getCandidateBlockModalSurface(surfaceElement) || surfaceElement;
}

function getLineHeightBlocksInRange(surfaceElement, range) {
  if (!surfaceElement || !range) {
    return [];
  }

  if (range.collapsed) {
    return [getClosestEditorTextBlock(surfaceElement, range.startContainer)].filter(Boolean);
  }

  const blocks = Array.from(surfaceElement.querySelectorAll("p,h1,h2,h3,li,blockquote,td,th,div"))
    .filter((element) => element !== surfaceElement && !element.classList.contains("template-doc"))
    .filter((element) => {
      try {
        return range.intersectsNode(element);
      } catch (_error) {
        return false;
      }
    });

  if (blocks.length) {
    return Array.from(new Set(blocks));
  }

  return [getClosestEditorTextBlock(surfaceElement, range.commonAncestorContainer)].filter(Boolean);
}

function getLineHeightTargets(surfaceElement) {
  const selectedCells = getSelectedTableCells(surfaceElement);

  if (selectedCells.length) {
    return selectedCells;
  }

  const activeRange = getSelectionRangeInsideSurface(surfaceElement) || getRestorableEditorTextControlSelection(surfaceElement);

  return getLineHeightBlocksInRange(surfaceElement, activeRange);
}

function getPointValueFromCssLength(value = "") {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return Number.NaN;
  }

  if (normalizedValue.endsWith("pt")) {
    return Number.parseFloat(normalizedValue);
  }

  if (normalizedValue.endsWith("px")) {
    return Number.parseFloat(normalizedValue) * pointsPerCssPixel;
  }

  return Number.NaN;
}

function getPixelValueFromCssLength(value = "", fontSizePx = 0) {
  const normalizedValue = String(value || "").trim();
  const numericValue = Number.parseFloat(normalizedValue);

  if (!Number.isFinite(numericValue)) {
    return Number.NaN;
  }

  if (normalizedValue.endsWith("px")) {
    return numericValue;
  }

  if (normalizedValue.endsWith("pt")) {
    return numericValue / pointsPerCssPixel;
  }

  if (normalizedValue.endsWith("em") && Number.isFinite(fontSizePx) && fontSizePx > 0) {
    return numericValue * fontSizePx;
  }

  return Number.NaN;
}

function getCalcPixelValue(value = "", fontSizePx = 0) {
  const normalizedValue = String(value || "").trim();
  const calcMatch = normalizedValue.match(/^calc\((.*)\)$/i);

  if (!calcMatch) {
    return Number.NaN;
  }

  const totalPixelValue = calcMatch[1]
    .split("+")
    .map((part) => getPixelValueFromCssLength(part, fontSizePx))
    .reduce((total, partValue) => Number.isFinite(total) && Number.isFinite(partValue) ? total + partValue : Number.NaN, 0);

  return Number.isFinite(totalPixelValue) ? totalPixelValue : Number.NaN;
}

function getLineSpacingFromCalcValue(value = "") {
  const normalizedValue = String(value || "").trim();
  const calcMatch = normalizedValue.match(/^calc\(\s*1em\s*\+\s*(-?\d+(?:\.\d+)?)pt\s*\)$/i);

  return calcMatch ? Number.parseFloat(calcMatch[1]) : Number.NaN;
}

function getLineSpacingPointValue(element) {
  const style = element ? window.getComputedStyle(element) : null;
  const inlineLineHeight = String(element?.style?.lineHeight || "").trim();
  const inlineSpacing = getLineSpacingFromCalcValue(inlineLineHeight);
  const computedLineHeight = String(style?.lineHeight || "").trim();
  const computedFontSize = Number.parseFloat(style?.fontSize || "");
  const inlineCalcPixelValue = getCalcPixelValue(inlineLineHeight, computedFontSize);

  if (Number.isFinite(inlineSpacing)) {
    return inlineSpacing;
  }

  if (Number.isFinite(inlineCalcPixelValue) && Number.isFinite(computedFontSize) && computedFontSize > 0) {
    return Math.max(0, (inlineCalcPixelValue - computedFontSize) * pointsPerCssPixel);
  }

  if (!computedLineHeight || computedLineHeight === "normal") {
    return defaultEditorLineHeight;
  }

  if (computedLineHeight.endsWith("px") && Number.isFinite(computedFontSize) && computedFontSize > 0) {
    return Math.max(0, (Number.parseFloat(computedLineHeight) - computedFontSize) * pointsPerCssPixel);
  }

  const computedSpacing = getLineSpacingFromCalcValue(computedLineHeight);

  if (Number.isFinite(computedSpacing)) {
    return computedSpacing;
  }

  const computedCalcPixelValue = getCalcPixelValue(computedLineHeight, computedFontSize);

  if (Number.isFinite(computedCalcPixelValue) && Number.isFinite(computedFontSize) && computedFontSize > 0) {
    return Math.max(0, (computedCalcPixelValue - computedFontSize) * pointsPerCssPixel);
  }

  const lineHeightPoints = getPointValueFromCssLength(computedLineHeight);

  if (Number.isFinite(lineHeightPoints) && Number.isFinite(computedFontSize) && computedFontSize > 0) {
    return Math.max(0, lineHeightPoints - computedFontSize * pointsPerCssPixel);
  }

  const numericLineHeight = Number.parseFloat(computedLineHeight);

  if (Number.isFinite(numericLineHeight) && Number.isFinite(computedFontSize) && computedFontSize > 0) {
    return Math.max(0, (numericLineHeight - 1) * computedFontSize * pointsPerCssPixel);
  }

  return defaultEditorLineHeight;
}

function updateLineHeightControlValue(surfaceElement, inputElement) {
  if (!inputElement) {
    return;
  }

  const target = getLineHeightTargets(surfaceElement)[0];

  inputElement.value = normalizeLineHeightValue(target ? getLineSpacingPointValue(target) : defaultEditorLineHeight);
}

function syncLineHeightMutation(editor, surfaceElement) {
  const activeSurface = getActiveLineHeightSurface(surfaceElement);

  activeSurface?.dispatchEvent(new Event("input", { bubbles: true }));

  if (typeof editor?.sync === "function") {
    editor.sync({ focusEditor: true, preserveSelection: true, allowOverflow: Boolean(getCandidateBlockModalSurface(surfaceElement)) });
  }
}

function applyLineHeightToSelection(editor, surfaceElement, rawValue) {
  const lineHeightValue = normalizeLineHeightValue(rawValue);
  const lineHeightNumber = Number(lineHeightValue);
  const lineHeightCssValue = lineHeightNumber <= 0 ? "1" : `calc(1em + ${lineHeightValue}pt)`;
  const activeSurface = getActiveLineHeightSurface(surfaceElement);

  restoreEditorTextControlSelection(activeSurface);

  const targets = getLineHeightTargets(activeSurface);

  if (!targets.length) {
    return false;
  }

  targets.forEach((element) => {
    element.style.lineHeight = lineHeightCssValue;

    if (textBlockTags.has(element.tagName)) {
      element.style.marginTop = "0";
      element.style.marginBottom = `${lineHeightValue}pt`;
    }
  });

  syncLineHeightMutation(editor, surfaceElement);
  rememberEditorTextControlSelection(activeSurface);
  return true;
}

function createLineHeightControl() {
  const sectionElement = document.createElement("div");

  sectionElement.className = "template-toolbar-section template-toolbar-section-compact examlist-line-height-control";
  sectionElement.innerHTML = `
    <span class="template-toolbar-section-label">줄 간격</span>
    <div class="template-toolbar-group-controls">
      <div class="examlist-line-height-stepper">
        <input
          class="template-toolbar-number template-toolbar-line-height-input"
          type="number"
          min="${lineHeightMinimum}"
          max="${lineHeightMaximum}"
          step="${lineHeightStep}"
          value="${defaultEditorLineHeight}"
          aria-label="줄 간격"
        />
      </div>
      <span class="template-toolbar-value-unit" aria-hidden="true">pt</span>
    </div>
  `;

  return sectionElement;
}

export function bindLineHeightControl({ editor, surfaceElement, toolbarHost }) {
  if (!editor || !surfaceElement || !toolbarHost) {
    return null;
  }

  toolbarHost.querySelector(".examlist-line-height-control")?.remove();

  const lineHeightControl = createLineHeightControl();
  const fontSizeSection = positionFontSizeSection(toolbarHost);
  const fontSizeSectionRow = toolbarHost.querySelector(".template-toolbar-font-size-combo")?.closest(".template-toolbar-section-row");

  if (fontSizeSection) {
    fontSizeSection.after(lineHeightControl);
  } else if (fontSizeSectionRow) {
    fontSizeSectionRow.after(lineHeightControl);
  } else {
    toolbarHost.prepend(lineHeightControl);
  }

  const lineHeightInput = lineHeightControl.querySelector(".template-toolbar-line-height-input");

  const handleToolbarPointerDown = () => {
    rememberEditorTextControlSelection(getActiveLineHeightSurface(surfaceElement));
  };
  const handleSelectionChange = () => {
    const activeSurface = getActiveLineHeightSurface(surfaceElement);
    const range = getSelectionRangeInsideSurface(activeSurface);

    if (!range) {
      return;
    }

    rememberEditorTextControlSelection(activeSurface);
    updateLineHeightControlValue(activeSurface, lineHeightInput);
  };
  const handleApply = () => {
    if (applyLineHeightToSelection(editor, surfaceElement, lineHeightInput.value)) {
      lineHeightInput.value = normalizeLineHeightValue(lineHeightInput.value);
      updateLineHeightControlValue(getActiveLineHeightSurface(surfaceElement), lineHeightInput);
    }
  };
  const handleKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleApply();
  };
  lineHeightControl.addEventListener("pointerdown", handleToolbarPointerDown, true);
  lineHeightInput.addEventListener("change", handleApply);
  lineHeightInput.addEventListener("keydown", handleKeyDown);
  document.addEventListener("selectionchange", handleSelectionChange);
  updateLineHeightControlValue(getActiveLineHeightSurface(surfaceElement), lineHeightInput);

  return () => {
    lineHeightControl.removeEventListener("pointerdown", handleToolbarPointerDown, true);
    lineHeightInput.removeEventListener("change", handleApply);
    lineHeightInput.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("selectionchange", handleSelectionChange);
    lineHeightControl.remove();
  };
}
