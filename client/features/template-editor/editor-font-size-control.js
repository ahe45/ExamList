import {
  fontSizeMaximum,
  fontSizeMinimum,
  fontSizeStep,
  normalizeFontSizeValue,
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

const cssPixelsPerPoint = 96 / 72;

function getPointFontSizeValue(computedFontSize = "", fallbackValue = 11) {
  const parsedValue = Number.parseFloat(computedFontSize);

  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return Math.round(parsedValue / cssPixelsPerPoint);
}

function getFontSizeCandidates(surfaceElement) {
  const selectedCells = getSelectedTableCells(surfaceElement);

  if (selectedCells.length) {
    return selectedCells;
  }

  const activeRange = getSelectionRangeInsideSurface(surfaceElement) || getRestorableEditorTextControlSelection(surfaceElement);

  if (!surfaceElement || !activeRange) {
    return [];
  }

  if (activeRange.collapsed) {
    return [getClosestEditorTextBlock(surfaceElement, activeRange.startContainer)].filter(Boolean);
  }

  return Array.from(surfaceElement.querySelectorAll("span,font,b,strong,em,i,u,p,h1,h2,h3,li,blockquote,td,th,div"))
    .filter((element) => element !== surfaceElement && !element.classList.contains("template-doc"))
    .filter((element) => {
      try {
        return activeRange.intersectsNode(element);
      } catch (_error) {
        return false;
      }
    });
}

function getCurrentFontSizeValue(surfaceElement, inputElement) {
  const fallbackValue = Number(inputElement?.value) || 11;
  const candidates = getFontSizeCandidates(surfaceElement);
  const explicitTarget = candidates.find((element) => String(element.style?.fontSize || "").trim());
  const target = explicitTarget || candidates[0] || null;
  const computedFontSize = target ? window.getComputedStyle(target).fontSize : "";

  return normalizeFontSizeValue(getPointFontSizeValue(computedFontSize, fallbackValue), fallbackValue);
}

export function bindFontSizeStepper({ editor, surfaceElement, toolbarHost }) {
  positionFontSizeSection(toolbarHost);

  const fontSizeCombo = toolbarHost?.querySelector?.(".template-toolbar-font-size-combo");
  const fontSizeInput = fontSizeCombo?.querySelector?.(".template-toolbar-font-size-input");

  if (!editor || !surfaceElement || !fontSizeCombo || !fontSizeInput) {
    return null;
  }

  fontSizeCombo.querySelector(".examlist-font-size-stepper-controls")?.remove();
  fontSizeCombo.classList.add("examlist-font-size-combo");
  fontSizeInput.type = "number";
  fontSizeInput.min = String(fontSizeMinimum);
  fontSizeInput.max = String(fontSizeMaximum);
  fontSizeInput.step = String(fontSizeStep);
  fontSizeInput.classList.remove("template-toolbar-number-stepper-input");

  let isSyncingFontSizeInput = false;
  let lastPointerValue = "";

  const syncFontSizeInputMenu = () => {
    isSyncingFontSizeInput = true;
    fontSizeInput.dispatchEvent(new Event("input", { bubbles: true }));
    isSyncingFontSizeInput = false;
  };
  const applyFontSizeFromInput = (rawFontSizeValue = fontSizeInput.value) => {
    restoreEditorTextControlSelection(surfaceElement);
    const fontSizeValue = normalizeFontSizeValue(rawFontSizeValue, getCurrentFontSizeValue(surfaceElement, fontSizeInput));
    const syncAppliedFontSizeValue = () => {
      fontSizeInput.value = fontSizeValue;
      fontSizeInput.dataset.templateEditorCurrentFontSize = `${fontSizeValue}pt`;
      syncFontSizeInputMenu();
    };

    syncAppliedFontSizeValue();
    editor.applyCommand?.("fontSizePx", fontSizeValue);
    syncAppliedFontSizeValue();
    window.requestAnimationFrame(syncAppliedFontSizeValue);
    rememberEditorTextControlSelection(surfaceElement);
  };
  const isFontSizeStepperInputEvent = (event) => {
    const inputType = String(event?.inputType || "").trim();

    return !inputType;
  };
  const handlePointerDown = () => {
    rememberEditorTextControlSelection(surfaceElement);
    fontSizeInput.value = getCurrentFontSizeValue(surfaceElement, fontSizeInput);
    lastPointerValue = fontSizeInput.value;
  };
  const handlePointerUp = () => {
    const nextFontSizeValue = fontSizeInput.value;

    window.requestAnimationFrame(() => {
      if (nextFontSizeValue !== lastPointerValue) {
        applyFontSizeFromInput(nextFontSizeValue);
      }
    });
  };
  const handleInput = (event) => {
    if (isSyncingFontSizeInput || !isFontSizeStepperInputEvent(event)) {
      return;
    }

    const nextFontSizeValue = fontSizeInput.value;

    window.requestAnimationFrame(() => applyFontSizeFromInput(nextFontSizeValue));
  };
  const handleKeyUp = (event) => {
    if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) {
      return;
    }

    const nextFontSizeValue = fontSizeInput.value;

    window.requestAnimationFrame(() => applyFontSizeFromInput(nextFontSizeValue));
  };
  const handleChange = () => {
    applyFontSizeFromInput();
  };

  fontSizeInput.addEventListener("pointerdown", handlePointerDown, true);
  fontSizeInput.addEventListener("pointerup", handlePointerUp, true);
  fontSizeInput.addEventListener("input", handleInput);
  fontSizeInput.addEventListener("keyup", handleKeyUp);
  fontSizeInput.addEventListener("change", handleChange);

  return () => {
    fontSizeInput.removeEventListener("pointerdown", handlePointerDown, true);
    fontSizeInput.removeEventListener("pointerup", handlePointerUp, true);
    fontSizeInput.removeEventListener("input", handleInput);
    fontSizeInput.removeEventListener("keyup", handleKeyUp);
    fontSizeInput.removeEventListener("change", handleChange);
    fontSizeCombo.classList.remove("examlist-font-size-combo");
  };
}
