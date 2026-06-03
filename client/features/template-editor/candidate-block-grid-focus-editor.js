import { showToast } from "../../app/toast.js";
import {
  calculateCandidateBlockFocusLayout,
  calculateCanvasBackdropRect,
  calculateVisibleCanvasRect,
  parseCssPixelValue,
  toFinitePixelValue,
} from "./candidate-block-grid-focus-layout.js";
import {
  candidateBlockFocusTableObjectOuterHitSlop,
  candidateBlockGridColumnNameRowDefaultHeightPt,
  cssPixelToCandidateBlockColumnNameRowHeightPt,
  normalizeCandidateBlockColumnNameRowHeightPt,
  normalizeCandidateBlockColumnNameRowHeightPx,
  normalizeCandidateBlockTemplateHtml,
  pointValueToCssPixel,
} from "./candidate-block-grid-config.js";
import { normalizeCandidateBlockTables } from "./candidate-block-grid-dom.js";
import {
  renderCandidateBlockGridOnSurface,
  syncCandidateBlockTemplateFromSurface,
} from "./candidate-block-grid-surface.js";

const MODAL_EMPTY_HTML = "<p><br></p>";
const MODAL_TAB_DATA_BLOCK = "dataBlock";
const MODAL_TAB_EMPTY_BLOCK = "emptyBlock";
const MODAL_TAB_COLUMN_NAME = "columnName";
const MODAL_CONTENT_OVERFLOW_TOLERANCE_PX = 2;
const MODAL_OVERFLOW_MESSAGE = "데이터 블록 영역을 초과했습니다. 닫기 전 내용이나 개체 크기를 조정하세요.";
const MODAL_OVERFLOW_MESSAGE_INTERVAL_MS = 800;
const MODAL_CARET_HOST_SELECTOR = "td, th, p, div, li, blockquote, h1, h2, h3";
const modalCapturedEventOptions = true;

const candidateBlockFocusVariables = Object.freeze([
  "--examlist-candidate-block-focus-panel-left",
  "--examlist-candidate-block-focus-panel-top",
  "--examlist-candidate-block-focus-panel-width",
  "--examlist-candidate-block-focus-panel-height",
  "--examlist-candidate-block-focus-backdrop-left",
  "--examlist-candidate-block-focus-backdrop-top",
  "--examlist-candidate-block-focus-backdrop-width",
  "--examlist-candidate-block-focus-backdrop-height",
  "--examlist-candidate-block-focus-editor-width",
  "--examlist-candidate-block-focus-editor-height",
  "--examlist-candidate-block-focus-data-preview-height",
  "--examlist-candidate-block-focus-column-row-height",
  "--examlist-candidate-block-focus-editor-scale",
  "--examlist-candidate-block-focus-editor-visual-width",
  "--examlist-candidate-block-focus-editor-visual-height",
]);

let candidateBlockFocusState = null;

function getOwnerWindow(element) {
  return element?.ownerDocument?.defaultView || window;
}

function setDocumentFocusVariable(ownerDocument, name, value) {
  ownerDocument.documentElement.style.setProperty(name, value);
}

function clearDocumentFocusVariables(ownerDocument = document) {
  candidateBlockFocusVariables.forEach((variableName) => {
    ownerDocument.documentElement.style.removeProperty(variableName);
  });
}

function getElementChromeSize(element) {
  if (!(element instanceof HTMLElement)) {
    return { horizontal: 0, vertical: 0 };
  }

  const computedStyle = getOwnerWindow(element).getComputedStyle(element);

  return {
    horizontal:
      parseCssPixelValue(computedStyle.borderLeftWidth) +
      parseCssPixelValue(computedStyle.borderRightWidth) +
      parseCssPixelValue(computedStyle.paddingLeft) +
      parseCssPixelValue(computedStyle.paddingRight),
    vertical:
      parseCssPixelValue(computedStyle.borderTopWidth) +
      parseCssPixelValue(computedStyle.borderBottomWidth) +
      parseCssPixelValue(computedStyle.paddingTop) +
      parseCssPixelValue(computedStyle.paddingBottom),
  };
}

function getVisibleCanvasRect(surfaceElement) {
  const ownerWindow = getOwnerWindow(surfaceElement);
  const canvasElement = surfaceElement?.closest?.(".template-editor-page") || surfaceElement;
  const canvasRect = canvasElement?.getBoundingClientRect?.();

  return calculateVisibleCanvasRect(canvasRect, {
    height: ownerWindow.innerHeight,
    width: ownerWindow.innerWidth,
  });
}

function getCanvasBackdropRect(surfaceElement) {
  const ownerWindow = getOwnerWindow(surfaceElement);
  const canvasElement = surfaceElement?.closest?.(".template-editor-page") || surfaceElement;
  const canvasRect = canvasElement?.getBoundingClientRect?.();

  return calculateCanvasBackdropRect(canvasRect, {
    height: ownerWindow.innerHeight,
    width: ownerWindow.innerWidth,
  });
}

function getBlockLogicalBorderBoxSize(element, chromeSize = { horizontal: 0, vertical: 0 }) {
  if (!(element instanceof HTMLElement)) {
    return { height: 0, width: 0 };
  }

  const rect = element.getBoundingClientRect();
  const offsetWidth = toFinitePixelValue(element.offsetWidth, 0);
  const offsetHeight = toFinitePixelValue(element.offsetHeight, 0);
  const clientWidth = toFinitePixelValue(element.clientWidth, 0);
  const clientHeight = toFinitePixelValue(element.clientHeight, 0);

  return {
    height:
      offsetHeight ||
      (clientHeight > 0 ? clientHeight + Math.max(0, chromeSize.vertical) : 0) ||
      toFinitePixelValue(rect.height, 0),
    width:
      offsetWidth ||
      (clientWidth > 0 ? clientWidth + Math.max(0, chromeSize.horizontal) : 0) ||
      toFinitePixelValue(rect.width, 0),
  };
}

export function getCandidateBlockFocusBlockLogicalSize(blockElement) {
  const gridElement = blockElement.closest?.("[data-candidate-block-grid]") || null;
  const gridRect = gridElement?.getBoundingClientRect?.();
  const gridStyle = gridElement instanceof HTMLElement ? getOwnerWindow(gridElement).getComputedStyle(gridElement) : null;
  const chromeSize = getElementChromeSize(blockElement);
  const measuredBlockSize = getBlockLogicalBorderBoxSize(blockElement, chromeSize);
  const columnCount = Math.max(1, Number(gridElement?.dataset?.candidateBlockColumns) || 1);
  const rowCount = Math.max(1, Number(gridElement?.dataset?.candidateBlockRows) || 1);
  const hasColumnNameRow = gridElement?.dataset?.candidateBlockColumnNameRowEnabled === "true";
  const columnNameRowHeight = hasColumnNameRow
    ? pointValueToCssPixel(Number(gridElement?.dataset?.candidateBlockColumnNameRowHeightPt) || 0)
    : 0;
  const columnGap = Number.parseFloat(gridStyle?.columnGap || gridStyle?.gap || "0") || 0;
  const rowGap = hasColumnNameRow
    ? pointValueToCssPixel(Number(gridElement?.dataset?.candidateBlockGapYPt) || 0)
    : Number.parseFloat(gridStyle?.rowGap || gridStyle?.gap || "0") || 0;
  const gridTrackWidth = gridRect?.width
    ? (gridRect.width - columnGap * Math.max(0, columnCount - 1)) / columnCount
    : 0;
  const gridTrackHeight = gridRect?.height
    ? (gridRect.height - columnNameRowHeight - rowGap * Math.max(0, rowCount - 1)) / rowCount
    : 0;
  const width = measuredBlockSize.width || toFinitePixelValue(gridTrackWidth, 1);
  const height = measuredBlockSize.height || toFinitePixelValue(gridTrackHeight, 1);

  return {
    height: Math.max(1, Math.round(height - chromeSize.vertical)),
    width: Math.max(1, Math.round(width - chromeSize.horizontal)),
  };
}

function getCandidateBlockFocusLayout(surfaceElement, blockElement, logicalSize = null) {
  const canvasRect = getVisibleCanvasRect(surfaceElement);
  const resolvedLogicalSize = logicalSize || getCandidateBlockFocusBlockLogicalSize(blockElement);

  return calculateCandidateBlockFocusLayout(canvasRect, resolvedLogicalSize);
}

function getCandidateBlockFocusBackdropMarkup() {
  return `
    <span class="examlist-candidate-block-focus-backdrop-piece examlist-candidate-block-focus-backdrop-top" data-candidate-block-focus-backdrop-piece aria-hidden="true"></span>
    <span class="examlist-candidate-block-focus-backdrop-piece examlist-candidate-block-focus-backdrop-bottom" data-candidate-block-focus-backdrop-piece aria-hidden="true"></span>
    <span class="examlist-candidate-block-focus-backdrop-piece examlist-candidate-block-focus-backdrop-left" data-candidate-block-focus-backdrop-piece aria-hidden="true"></span>
    <span class="examlist-candidate-block-focus-backdrop-piece examlist-candidate-block-focus-backdrop-right" data-candidate-block-focus-backdrop-piece aria-hidden="true"></span>
  `;
}

function getCandidateBlockFocusBackdrop(ownerDocument = document, hostElement = null) {
  const existingBackdrop = ownerDocument.querySelector("[data-candidate-block-focus-backdrop]");
  const resolvedHost = hostElement instanceof HTMLElement ? hostElement : ownerDocument.body;

  if (existingBackdrop instanceof HTMLElement) {
    if (existingBackdrop.parentElement !== resolvedHost) {
      resolvedHost.append(existingBackdrop);
    }

    existingBackdrop.setAttribute("contenteditable", "false");
    existingBackdrop.innerHTML = getCandidateBlockFocusBackdropMarkup();
    return existingBackdrop;
  }

  const backdropElement = ownerDocument.createElement("div");

  backdropElement.className = "examlist-candidate-block-focus-backdrop";
  backdropElement.dataset.candidateBlockFocusBackdrop = "true";
  backdropElement.setAttribute("aria-hidden", "true");
  backdropElement.setAttribute("contenteditable", "false");
  backdropElement.innerHTML = getCandidateBlockFocusBackdropMarkup();
  resolvedHost.append(backdropElement);
  return backdropElement;
}

function getCandidateBlockFocusLayer(ownerDocument = document, hostElement = null) {
  const existingLayer = ownerDocument.querySelector("[data-candidate-block-focus-layer]");
  const resolvedHost = hostElement instanceof HTMLElement ? hostElement : ownerDocument.body;

  if (existingLayer instanceof HTMLElement) {
    if (existingLayer.parentElement !== resolvedHost) {
      resolvedHost.append(existingLayer);
    }

    existingLayer.setAttribute("contenteditable", "false");
    return existingLayer;
  }

  const layerElement = ownerDocument.createElement("div");

  layerElement.className = "examlist-candidate-block-focus-layer";
  layerElement.dataset.candidateBlockFocusLayer = "true";
  layerElement.setAttribute("aria-label", "데이터 블록 편집");
  layerElement.setAttribute("contenteditable", "false");
  layerElement.setAttribute("role", "dialog");
  layerElement.innerHTML = `
    <div class="examlist-candidate-block-focus-title">데이터 블록 편집</div>
    <button class="examlist-candidate-block-focus-close" data-candidate-block-focus-close type="button" aria-label="데이터 블록 편집 닫기">×</button>
    <div class="examlist-candidate-block-focus-tabs" role="tablist" aria-label="데이터 블록 편집 탭">
      <button class="examlist-candidate-block-focus-tab is-active" data-candidate-block-focus-tab="${MODAL_TAB_DATA_BLOCK}" type="button" role="tab" aria-selected="true">데이터 블록</button>
      <button class="examlist-candidate-block-focus-tab" data-candidate-block-focus-tab="${MODAL_TAB_EMPTY_BLOCK}" type="button" role="tab" aria-selected="false">빈 값</button>
      <button class="examlist-candidate-block-focus-tab" data-candidate-block-focus-tab="${MODAL_TAB_COLUMN_NAME}" type="button" role="tab" aria-selected="false">컬럼명</button>
    </div>
    <div class="examlist-candidate-block-focus-switch is-hidden" data-candidate-block-feature-switch-wrap="${MODAL_TAB_EMPTY_BLOCK}">
      <label class="examlist-candidate-block-focus-toggle">
        <span>빈 값 표시 사용</span>
        <input data-candidate-block-feature-switch="${MODAL_TAB_EMPTY_BLOCK}" type="checkbox" />
      </label>
    </div>
    <div class="examlist-candidate-block-focus-switch is-hidden" data-candidate-block-feature-switch-wrap="${MODAL_TAB_COLUMN_NAME}">
      <label class="examlist-candidate-block-focus-toggle">
        <span>컬럼명 row 사용</span>
        <input data-candidate-block-feature-switch="${MODAL_TAB_COLUMN_NAME}" type="checkbox" />
      </label>
      <label class="examlist-candidate-block-column-name-height-control">
        <span>행 높이(px)</span>
        <input
          data-candidate-block-column-name-row-height-px
          type="number"
          inputmode="numeric"
          autocomplete="off"
          min="${normalizeCandidateBlockColumnNameRowHeightPx(-10000)}"
          max="${normalizeCandidateBlockColumnNameRowHeightPx(10000)}"
          step="1"
          aria-label="컬럼명 row 높이"
        />
      </label>
    </div>
    <div class="examlist-candidate-block-modal-editor-viewport" data-candidate-block-focus-viewport>
      <div
        class="examlist-candidate-block examlist-candidate-block-modal-editor-surface is-candidate-block-template-source is-candidate-block-focus-editor"
        data-candidate-block-editor-surface-id="${MODAL_TAB_DATA_BLOCK}"
        data-candidate-block-instance="modal-editor"
        data-candidate-block-template-role="source"
        data-candidate-block-modal-editor-surface="true"
        data-template-editor-runtime-active-surface="true"
        aria-label="수험생 데이터 블록 편집 영역"
        contenteditable="true"
        spellcheck="false"
        tabindex="0"
      ></div>
      <div
        class="examlist-candidate-block is-hidden"
        data-candidate-block-editor-surface-id="${MODAL_TAB_EMPTY_BLOCK}"
        data-candidate-block-template-role="source"
        aria-label="빈 값 데이터 블록 편집 영역"
        contenteditable="false"
        spellcheck="false"
        tabindex="0"
      ></div>
      <div
        class="examlist-candidate-block is-candidate-block-column-name-editor is-hidden"
        data-candidate-block-editor-surface-id="${MODAL_TAB_COLUMN_NAME}"
        data-candidate-block-template-role="source"
        aria-label="컬럼명 row 편집 영역"
        contenteditable="false"
        spellcheck="false"
        tabindex="0"
      ></div>
      <div
        class="examlist-candidate-block is-candidate-block-template-preview is-candidate-block-column-data-preview is-hidden"
        data-candidate-block-column-data-preview="true"
        aria-label="데이터 블록 읽기 전용 미리보기"
        aria-readonly="true"
        contenteditable="false"
      ></div>
    </div>
  `;
  resolvedHost.append(layerElement);
  return layerElement;
}

function getModalSurfaceElement(layerElement) {
  return layerElement?.querySelector?.("[data-candidate-block-modal-editor-surface]") || null;
}

function getModalSurfaceElementByTab(layerElement, tabId = MODAL_TAB_DATA_BLOCK) {
  return layerElement?.querySelector?.(`[data-candidate-block-editor-surface-id="${tabId}"]`) || null;
}

function getColumnDataPreviewElement(layerElement) {
  return layerElement?.querySelector?.("[data-candidate-block-column-data-preview]") || null;
}

function getStateCandidateBlockGridConfig(state = candidateBlockFocusState) {
  const selectedPage = state?.selectedPage;

  if (!selectedPage) {
    return {
      blockTemplateHtml: MODAL_EMPTY_HTML,
      columnNameRow: {
        enabled: false,
        heightPt: candidateBlockGridColumnNameRowDefaultHeightPt,
        templateHtml: MODAL_EMPTY_HTML,
      },
      emptyBlockLayer: {
        enabled: false,
        templateHtml: MODAL_EMPTY_HTML,
      },
    };
  }

  selectedPage.settings = selectedPage?.settings && typeof selectedPage.settings === "object" ? selectedPage.settings : {};
  selectedPage.settings.candidateBlockGrid =
    selectedPage.settings.candidateBlockGrid && typeof selectedPage.settings.candidateBlockGrid === "object"
      ? selectedPage.settings.candidateBlockGrid
      : {};

  const config = selectedPage.settings.candidateBlockGrid;

  config.emptyBlockLayer = config.emptyBlockLayer && typeof config.emptyBlockLayer === "object"
    ? config.emptyBlockLayer
    : {};
  config.emptyBlockLayer.enabled = config.emptyBlockLayer.enabled === true || String(config.emptyBlockLayer.enabled || "").trim() === "true";
  config.emptyBlockLayer.templateHtml = normalizeCandidateBlockTemplateHtml(config.emptyBlockLayer.templateHtml);
  config.columnNameRow = config.columnNameRow && typeof config.columnNameRow === "object"
    ? config.columnNameRow
    : {};
  config.columnNameRow.enabled = config.columnNameRow.enabled === true || String(config.columnNameRow.enabled || "").trim() === "true";
  config.columnNameRow.templateHtml = normalizeCandidateBlockTemplateHtml(config.columnNameRow.templateHtml);
  config.columnNameRow.heightPt = normalizeCandidateBlockColumnNameRowHeightPt(
    config.columnNameRow.heightPt,
    candidateBlockGridColumnNameRowDefaultHeightPt,
  );

  return config;
}

function isModalTabFeatureEnabled(state = candidateBlockFocusState, tabId = state?.activeTab) {
  if (tabId === MODAL_TAB_DATA_BLOCK) {
    return true;
  }

  const config = getStateCandidateBlockGridConfig(state);

  if (tabId === MODAL_TAB_EMPTY_BLOCK) {
    return Boolean(config.emptyBlockLayer?.enabled);
  }

  if (tabId === MODAL_TAB_COLUMN_NAME) {
    return Boolean(config.columnNameRow?.enabled);
  }

  return true;
}

function getColumnNameRowLogicalHeight(state = candidateBlockFocusState) {
  const config = getStateCandidateBlockGridConfig(state);

  return normalizeCandidateBlockColumnNameRowHeightPx(
    pointValueToCssPixel(config.columnNameRow?.heightPt || candidateBlockGridColumnNameRowDefaultHeightPt),
  );
}

function getActiveModalLogicalSize(state = candidateBlockFocusState) {
  const blockSize = state?.logicalSize || { height: 1, width: 1 };

  if (state?.activeTab === MODAL_TAB_COLUMN_NAME) {
    return {
      height: blockSize.height + getColumnNameRowLogicalHeight(state),
      width: blockSize.width,
    };
  }

  return blockSize;
}

function getActiveModalEditorLogicalHeight(state = candidateBlockFocusState) {
  return state?.activeTab === MODAL_TAB_COLUMN_NAME
    ? getColumnNameRowLogicalHeight(state)
    : Math.max(1, Number(state?.logicalSize?.height) || 1);
}

function getModalTabTemplateHtml(state = candidateBlockFocusState, tabId = MODAL_TAB_DATA_BLOCK) {
  const config = getStateCandidateBlockGridConfig(state);

  if (tabId === MODAL_TAB_EMPTY_BLOCK) {
    return normalizeCandidateBlockTemplateHtml(config.emptyBlockLayer?.templateHtml);
  }

  if (tabId === MODAL_TAB_COLUMN_NAME) {
    return normalizeCandidateBlockTemplateHtml(config.columnNameRow?.templateHtml);
  }

  return normalizeCandidateBlockTemplateHtml(state?.blockElement?.innerHTML || config.blockTemplateHtml);
}

function addModalSurfaceEventListeners(surfaceElement) {
  surfaceElement?.addEventListener?.("beforeinput", handleModalBeforeInput, modalCapturedEventOptions);
  surfaceElement?.addEventListener?.("compositionstart", handleModalCompositionStart, modalCapturedEventOptions);
  surfaceElement?.addEventListener?.("compositionend", handleModalCompositionEnd, modalCapturedEventOptions);
  surfaceElement?.addEventListener?.("input", handleModalInput, modalCapturedEventOptions);
  surfaceElement?.addEventListener?.("keydown", handleModalKeyDown, modalCapturedEventOptions);
}

function removeModalSurfaceEventListeners(surfaceElement) {
  surfaceElement?.removeEventListener?.("beforeinput", handleModalBeforeInput, modalCapturedEventOptions);
  surfaceElement?.removeEventListener?.("compositionstart", handleModalCompositionStart, modalCapturedEventOptions);
  surfaceElement?.removeEventListener?.("compositionend", handleModalCompositionEnd, modalCapturedEventOptions);
  surfaceElement?.removeEventListener?.("input", handleModalInput, modalCapturedEventOptions);
  surfaceElement?.removeEventListener?.("keydown", handleModalKeyDown, modalCapturedEventOptions);
}

function setSurfaceEditableState(surfaceElement, enabled) {
  if (!(surfaceElement instanceof HTMLElement)) {
    return;
  }

  surfaceElement.setAttribute("contenteditable", enabled ? "true" : "false");
  surfaceElement.classList.toggle("is-candidate-block-modal-editor-disabled", !enabled);
  surfaceElement.toggleAttribute("aria-readonly", !enabled);
}

function getColumnNameRowHeightInput(layerElement) {
  const inputElement = layerElement?.querySelector?.("[data-candidate-block-column-name-row-height-px]");

  return inputElement instanceof HTMLInputElement ? inputElement : null;
}

function syncColumnNameRowHeightControl(state = candidateBlockFocusState) {
  const inputElement = getColumnNameRowHeightInput(state?.layerElement);

  if (!(inputElement instanceof HTMLInputElement)) {
    return;
  }

  const config = getStateCandidateBlockGridConfig(state);
  const isEnabled = Boolean(config.columnNameRow?.enabled);

  inputElement.value = String(getColumnNameRowLogicalHeight(state));
  inputElement.disabled = !isEnabled;
  inputElement.closest?.(".examlist-candidate-block-column-name-height-control")?.classList.toggle("is-disabled", !isEnabled);
}

function applyColumnNameRowHeightInput(inputElement, state = candidateBlockFocusState) {
  if (!(inputElement instanceof HTMLInputElement) || !state) {
    return false;
  }

  const config = getStateCandidateBlockGridConfig(state);

  if (!config.columnNameRow?.enabled) {
    syncColumnNameRowHeightControl(state);
    return false;
  }

  const currentHeightPt = normalizeCandidateBlockColumnNameRowHeightPt(
    config.columnNameRow?.heightPt,
    candidateBlockGridColumnNameRowDefaultHeightPt,
  );
  const currentHeightPx = pointValueToCssPixel(currentHeightPt);
  const displayedCurrentHeightPx = normalizeCandidateBlockColumnNameRowHeightPx(currentHeightPx);
  const nextHeightPx = normalizeCandidateBlockColumnNameRowHeightPx(inputElement.value, currentHeightPx);
  const nextHeightPt = cssPixelToCandidateBlockColumnNameRowHeightPt(nextHeightPx, currentHeightPt);
  const didChange = nextHeightPx !== displayedCurrentHeightPx;

  inputElement.value = String(nextHeightPx);

  if (!didChange) {
    return false;
  }

  config.columnNameRow.heightPt = nextHeightPt;
  state.needsGridRerender = true;
  syncColumnNameRowHeightControl(state);
  applyCandidateBlockFocusLayout(state);
  validateActiveCandidateBlockModalContent({ inputType: "insertText", restoreCaret: false });
  state.onDirty?.();
  return true;
}

function syncModalTabsUi(state = candidateBlockFocusState) {
  const layerElement = state?.layerElement;

  if (!(layerElement instanceof HTMLElement)) {
    return;
  }

  layerElement.querySelectorAll("[data-candidate-block-focus-tab]").forEach((tabElement) => {
    const isActive = tabElement.dataset.candidateBlockFocusTab === state.activeTab;

    tabElement.classList.toggle("is-active", isActive);
    tabElement.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  layerElement.querySelectorAll("[data-candidate-block-feature-switch-wrap]").forEach((wrapElement) => {
    wrapElement.classList.toggle(
      "is-hidden",
      wrapElement.dataset.candidateBlockFeatureSwitchWrap !== state.activeTab,
    );
  });

  const config = getStateCandidateBlockGridConfig(state);
  const emptySwitch = layerElement.querySelector(`[data-candidate-block-feature-switch="${MODAL_TAB_EMPTY_BLOCK}"]`);
  const columnSwitch = layerElement.querySelector(`[data-candidate-block-feature-switch="${MODAL_TAB_COLUMN_NAME}"]`);

  if (emptySwitch instanceof HTMLInputElement) {
    emptySwitch.checked = Boolean(config.emptyBlockLayer?.enabled);
  }

  if (columnSwitch instanceof HTMLInputElement) {
    columnSwitch.checked = Boolean(config.columnNameRow?.enabled);
  }

  syncColumnNameRowHeightControl(state);

  Object.entries(state.modalSurfaceElements || {}).forEach(([tabId, surfaceElement]) => {
    const isActive = tabId === state.activeTab;

    surfaceElement.classList.toggle("is-hidden", !isActive);
    surfaceElement.classList.toggle("examlist-candidate-block-modal-editor-surface", isActive);
    surfaceElement.classList.toggle("is-candidate-block-template-source", isActive);
    surfaceElement.classList.toggle("is-candidate-block-focus-editor", isActive);
    if (isActive) {
      surfaceElement.dataset.candidateBlockModalEditorSurface = "true";
      surfaceElement.dataset.candidateBlockInstance = "modal-editor";
      surfaceElement.dataset.templateEditorAllowOverflowSync = "true";
      surfaceElement.dataset.templateEditorRuntimeActiveSurface = "true";
    } else {
      surfaceElement.removeAttribute("data-candidate-block-instance");
      surfaceElement.removeAttribute("data-candidate-block-modal-editor-surface");
      surfaceElement.removeAttribute("data-template-editor-allow-overflow-sync");
      surfaceElement.removeAttribute("data-template-editor-runtime-active-surface");
    }
    setSurfaceEditableState(surfaceElement, isActive && isModalTabFeatureEnabled(state, tabId));
  });

  state.columnDataPreviewElement?.classList?.toggle("is-hidden", state.activeTab !== MODAL_TAB_COLUMN_NAME);
  state.layerElement.classList.toggle("is-candidate-block-feature-tab", state.activeTab !== MODAL_TAB_DATA_BLOCK);
  state.layerElement.classList.toggle("is-candidate-block-column-name-tab", state.activeTab === MODAL_TAB_COLUMN_NAME);
}

function refreshColumnDataPreview(state = candidateBlockFocusState) {
  const previewElement = state?.columnDataPreviewElement;

  if (!(previewElement instanceof HTMLElement)) {
    return;
  }

  previewElement.innerHTML = getModalTabTemplateHtml(state, MODAL_TAB_DATA_BLOCK);
  normalizeCandidateBlockTables(previewElement);
}

function setActiveModalSurface(state, nextTab) {
  const nextSurface = state?.modalSurfaceElements?.[nextTab] || null;

  if (!(nextSurface instanceof HTMLElement)) {
    return false;
  }

  const isSameSurface = state.modalSurfaceElement === nextSurface && state.hasModalSurfaceListeners;

  if (!isSameSurface && state.modalSurfaceElement instanceof HTMLElement) {
    removeModalSurfaceEventListeners(state.modalSurfaceElement);
    state.modalMutationObserver?.disconnect?.();
    state.modalMutationObserver = null;
  }

  state.activeTab = nextTab;
  state.modalSurfaceElement = nextSurface;
  if (!applyCandidateBlockFocusLayout(state)) {
    return false;
  }
  syncModalTabsUi(state);
  nextSurface.innerHTML = getModalTabTemplateHtml(state, nextTab);
  ensureModalEditableHost(nextSurface);
  normalizeCandidateBlockTables(nextSurface);
  refreshColumnDataPreview(state);
  state.beforeInputHtml = getNormalizedModalHtml(nextSurface);
  state.lastValidHtml = getNormalizedModalHtml(nextSurface);
  if (!isSameSurface) {
    addModalSurfaceEventListeners(nextSurface);
    state.hasModalSurfaceListeners = true;
    state.modalMutationObserver = observeModalContentChanges(state);
  }

  if (isModalTabFeatureEnabled(state, nextTab)) {
    state.ownerWindow.requestAnimationFrame(() => {
      if (candidateBlockFocusState === state && state.modalSurfaceElement === nextSurface) {
        placeCaretAtEndOfSurface(nextSurface, state.editor);
      }
    });
  }

  return true;
}

function getNormalizedModalHtml(modalSurfaceElement) {
  const normalizedHtml = String(modalSurfaceElement?.innerHTML || "").trim();

  return normalizedHtml || MODAL_EMPTY_HTML;
}

function hasMeaningfulModalContent(modalSurfaceElement) {
  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return false;
  }

  if (String(modalSurfaceElement.textContent || "").replace(/\u00a0/g, " ").trim()) {
    return true;
  }

  return Boolean(modalSurfaceElement.querySelector("img, table, hr, [data-template-tag-value], .template-token, .template-generated-object"));
}

function ensureModalEditableHost(modalSurfaceElement) {
  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return false;
  }

  if (hasMeaningfulModalContent(modalSurfaceElement)) {
    return false;
  }

  const hasSingleBlankHost =
    modalSurfaceElement.children.length === 1 &&
    /^(P|DIV)$/i.test(String(modalSurfaceElement.firstElementChild?.tagName || "")) &&
    !String(modalSurfaceElement.firstElementChild?.textContent || "").replace(/\u00a0/g, " ").trim() &&
    !modalSurfaceElement.firstElementChild?.querySelector?.("img, table, hr, [data-template-tag-value], .template-token, .template-generated-object");

  if (hasSingleBlankHost && modalSurfaceElement.firstElementChild?.querySelector?.("br")) {
    return false;
  }

  modalSurfaceElement.innerHTML = MODAL_EMPTY_HTML;
  return true;
}

function stopModalEditingEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
}

function showModalOverflowMessage(state = candidateBlockFocusState) {
  const ownerWindow = state?.ownerWindow || window;
  const now = ownerWindow.Date?.now?.() || Date.now();

  if (state && now - Number(state.lastOverflowMessageAt || 0) < MODAL_OVERFLOW_MESSAGE_INTERVAL_MS) {
    return;
  }

  if (state) {
    state.lastOverflowMessageAt = now;
  }

  showToast(MODAL_OVERFLOW_MESSAGE, { tone: "warning" });
}

function isModalSelectAllShortcut(event) {
  const key = String(event?.key || "").toLowerCase();
  const code = String(event?.code || "");

  return Boolean((event?.ctrlKey || event?.metaKey) && !event?.altKey && (key === "a" || code === "KeyA"));
}

function isModalCompositionInput(event, state = candidateBlockFocusState) {
  const inputType = String(event?.inputType || "");

  return Boolean(
    state?.isComposing ||
      event?.isComposing ||
      inputType === "insertCompositionText" ||
      inputType === "deleteCompositionText"
  );
}

function getElementFromNode(node) {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement || null;
}

function isNodeInsideElement(node, element) {
  return Boolean(node && element instanceof HTMLElement && (node === element || element.contains(node)));
}

function isModalSelectionInside(state = candidateBlockFocusState) {
  const modalSurfaceElement = state?.modalSurfaceElement;
  const selection = state?.ownerWindow?.getSelection?.() || window.getSelection?.();

  if (!(modalSurfaceElement instanceof HTMLElement) || !selection?.rangeCount) {
    return false;
  }

  const range = selection.getRangeAt(0);

  return (
    isNodeInsideElement(selection.anchorNode, modalSurfaceElement) ||
    isNodeInsideElement(selection.focusNode, modalSurfaceElement) ||
    isNodeInsideElement(range.commonAncestorContainer, modalSurfaceElement)
  );
}

function isFormEditingTargetOutsideModal(event) {
  const targetElement = event?.target instanceof Element ? event.target : null;
  const modalSurfaceElement = candidateBlockFocusState?.modalSurfaceElement;
  const editingControl = targetElement?.closest?.("input, textarea, select") || null;

  return Boolean(editingControl && !(modalSurfaceElement instanceof HTMLElement && modalSurfaceElement.contains(editingControl)));
}

function shouldHandleActiveModalKeyboardEvent(event) {
  const state = candidateBlockFocusState;
  const modalSurfaceElement = state?.modalSurfaceElement;

  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return false;
  }

  if (isEventTargetInsideActiveModal(event) || isModalSelectionInside(state)) {
    return true;
  }

  const activeElement = state.ownerDocument?.activeElement || document.activeElement;

  if (activeElement === modalSurfaceElement || modalSurfaceElement.contains(activeElement)) {
    return true;
  }

  if (isFormEditingTargetOutsideModal(event)) {
    return false;
  }

  return (
    isModalSelectAllShortcut(event) ||
    ["Backspace", "Delete"].includes(event?.key) ||
    ["deleteContentBackward", "deleteContentForward", "deleteByCut"].includes(String(event?.inputType || ""))
  );
}

function shouldHandleActiveModalCompositionEvent(event) {
  const state = candidateBlockFocusState;
  const modalSurfaceElement = state?.modalSurfaceElement;

  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return false;
  }

  if (isEventTargetInsideActiveModal(event) || isModalSelectionInside(state)) {
    return true;
  }

  const activeElement = state.ownerDocument?.activeElement || document.activeElement;

  return activeElement === modalSurfaceElement || modalSurfaceElement.contains(activeElement);
}

function shouldRestoreModalCaretFocus(state = candidateBlockFocusState) {
  const modalSurfaceElement = state?.modalSurfaceElement;
  const ownerDocument = state?.ownerDocument || document;
  const activeElement = ownerDocument.activeElement;

  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return false;
  }

  if (modalSurfaceElement.contains(activeElement)) {
    return !isModalSelectionInside(state);
  }

  return Boolean(
    activeElement === ownerDocument.body ||
      activeElement === ownerDocument.documentElement ||
      activeElement === state?.surfaceElement ||
      activeElement === state?.canvasElement ||
      state?.surfaceElement?.contains?.(activeElement)
  );
}

function restoreModalCaretFocusIfLoose(state = candidateBlockFocusState) {
  if (state?.isComposing) {
    return false;
  }

  if (!shouldRestoreModalCaretFocus(state)) {
    return false;
  }

  placeCaretAtEndOfSurface(state.modalSurfaceElement, state.editor);
  return true;
}

function getCurrentModalSelectionRoot(state = candidateBlockFocusState) {
  const modalSurfaceElement = state?.modalSurfaceElement;
  const selection = state?.ownerWindow?.getSelection?.() || window.getSelection?.();

  if (!(modalSurfaceElement instanceof HTMLElement) || !selection?.rangeCount) {
    return modalSurfaceElement instanceof HTMLElement ? modalSurfaceElement : null;
  }

  const boundaryElements = [getElementFromNode(selection.anchorNode), getElementFromNode(selection.focusNode)];
  const selectedHost = boundaryElements
    .map((element) => element?.closest?.(MODAL_CARET_HOST_SELECTOR) || null)
    .find((element) => element instanceof HTMLElement && element !== modalSurfaceElement && modalSurfaceElement.contains(element));

  return selectedHost || modalSurfaceElement;
}

function getSelectableTextNodes(rootElement) {
  const ownerDocument = rootElement?.ownerDocument || document;
  const ownerWindow = ownerDocument.defaultView || window;
  const treeWalker = ownerDocument.createTreeWalker(rootElement, ownerWindow.NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node = treeWalker.nextNode();

  while (node) {
    if (String(node.nodeValue || "").length > 0) {
      textNodes.push(node);
    }

    node = treeWalker.nextNode();
  }

  return textNodes;
}

function selectModalContents(state = candidateBlockFocusState) {
  const modalSurfaceElement = state?.modalSurfaceElement;
  const ownerDocument = state?.ownerDocument || document;
  const selection = state?.ownerWindow?.getSelection?.() || window.getSelection?.();

  if (!(modalSurfaceElement instanceof HTMLElement) || !selection) {
    return false;
  }

  if (state?.isComposing) {
    modalSurfaceElement.focus({ preventScroll: true });
    return true;
  }

  ensureModalEditableHost(modalSurfaceElement);

  if (!hasMeaningfulModalContent(modalSurfaceElement)) {
    placeCaretAtEndOfSurface(modalSurfaceElement, state?.editor);
    return true;
  }

  const selectionRoot = getCurrentModalSelectionRoot(state) || modalSurfaceElement;
  const textNodes = getSelectableTextNodes(selectionRoot);

  if (!textNodes.length) {
    placeCaretAtEndOfSurface(modalSurfaceElement, state?.editor);
    return true;
  }

  const firstNode = textNodes[0];
  const lastNode = textNodes[textNodes.length - 1];
  const range = ownerDocument.createRange();

  range.setStart(firstNode, 0);
  range.setEnd(lastNode, String(lastNode.nodeValue || "").length);
  selection.removeAllRanges();
  selection.addRange(range);
  modalSurfaceElement.focus({ preventScroll: true });

  if (state?.editor?.state?.templateEditor) {
    state.editor.state.templateEditor.savedRange = range.cloneRange();
  }

  return true;
}

function isModalInsertInputType(inputType) {
  return (
    !inputType ||
    inputType.startsWith("insert") ||
    inputType === "formatSetBlockTextDirection" ||
    inputType === "formatSetInlineTextDirection"
  );
}

function getMeaningfulModalObjectRects(modalSurfaceElement) {
  if (!(modalSurfaceElement instanceof HTMLElement) || !hasMeaningfulModalContent(modalSurfaceElement)) {
    return [];
  }

  const rects = [];

  modalSurfaceElement
    .querySelectorAll("img, table, hr, [data-template-tag-value], .template-token, .template-generated-object")
    .forEach((element) => {
      const rect = element.getBoundingClientRect?.();

      if (rect && (rect.width || rect.height)) {
        rects.push(rect);
      }
    });

  return rects;
}

function getModalContentOverflowInfo(modalSurfaceElement) {
  if (!(modalSurfaceElement instanceof HTMLElement)) {
    return { hasOverflow: false };
  }

  const surfaceRect = modalSurfaceElement.getBoundingClientRect();
  const tolerance = MODAL_CONTENT_OVERFLOW_TOLERANCE_PX;
  const hasLogicalOverflow =
    modalSurfaceElement.scrollWidth > modalSurfaceElement.clientWidth + tolerance ||
    modalSurfaceElement.scrollHeight > modalSurfaceElement.clientHeight + tolerance;

  if (hasLogicalOverflow) {
    return {
      hasOverflow: true,
      overflowRect: null,
      surfaceRect,
    };
  }

  const rects = getMeaningfulModalObjectRects(modalSurfaceElement);

  if (!surfaceRect.width || !surfaceRect.height || !rects.length) {
    return { hasOverflow: false };
  }

  const overflowRect =
    rects.find(
      (rect) =>
        rect.left < surfaceRect.left - tolerance ||
        rect.top < surfaceRect.top - tolerance ||
        rect.right > surfaceRect.right + tolerance ||
        rect.bottom > surfaceRect.bottom + tolerance,
    ) || null;

  return {
    hasOverflow: Boolean(overflowRect),
    overflowRect,
    surfaceRect,
  };
}

function restoreModalEditableHostSoon({ forceCaret = false } = {}) {
  const state = candidateBlockFocusState;

  if (!state?.ownerWindow || state.isComposing) {
    return;
  }

  const restore = () => {
    if (candidateBlockFocusState !== state || state.isComposing || !(state.modalSurfaceElement instanceof HTMLElement)) {
      return;
    }

    const didRestoreHost = ensureModalEditableHost(state.modalSurfaceElement);
    const shouldRestoreCaret =
      didRestoreHost ||
      forceCaret ||
      (!hasMeaningfulModalContent(state.modalSurfaceElement) && !isModalSelectionInside(state));

    if (shouldRestoreCaret) {
      placeCaretAtEndOfSurface(state.modalSurfaceElement, state.editor);
    }

    validateActiveCandidateBlockModalContent({ inputType: "restore", restoreCaret: false });
    scheduleActiveCandidateBlockModalSync();
  };

  if (!state.restoreFrame) {
    state.restoreFrame = state.ownerWindow.requestAnimationFrame(() => {
      state.restoreFrame = 0;
      restore();
    });
  }

  if (!state.restoreTimer) {
    state.restoreTimer = state.ownerWindow.setTimeout(() => {
      state.restoreTimer = 0;
      restore();
    }, 0);
  }
}

function setModalHtmlFromSnapshot(state, html) {
  if (!(state?.modalSurfaceElement instanceof HTMLElement)) {
    return;
  }

  state.isRestoringContent = true;
  state.modalSurfaceElement.innerHTML = String(html || "").trim() || MODAL_EMPTY_HTML;
  ensureModalEditableHost(state.modalSurfaceElement);
  state.isRestoringContent = false;
}

function validateActiveCandidateBlockModalContent({ inputType = "", restoreCaret = true } = {}) {
  const state = candidateBlockFocusState;

  if (!state?.modalSurfaceElement || state.isRestoringContent || state.isComposing) {
    return true;
  }

  ensureModalEditableHost(state.modalSurfaceElement);
  normalizeCandidateBlockTables(state.modalSurfaceElement);

  const overflowInfo = getModalContentOverflowInfo(state.modalSurfaceElement);
  state.hasOverflow = overflowInfo.hasOverflow;

  if (!overflowInfo.hasOverflow) {
    state.lastValidHtml = getNormalizedModalHtml(state.modalSurfaceElement);
    return true;
  }

  if (isModalInsertInputType(inputType)) {
    showModalOverflowMessage(state);
  }

  if (restoreCaret) {
    placeCaretAtEndOfSurface(state.modalSurfaceElement, state.editor);
  }

  return false;
}

function observeModalContentChanges(state) {
  if (!state?.ownerWindow?.MutationObserver || !(state.modalSurfaceElement instanceof HTMLElement)) {
    return null;
  }

  const observer = new state.ownerWindow.MutationObserver(() => {
    if (candidateBlockFocusState !== state || state.isRestoringContent || state.isComposing) {
      return;
    }

    if (state.mutationFrame) {
      return;
    }

    state.mutationFrame = state.ownerWindow.requestAnimationFrame(() => {
      state.mutationFrame = 0;

      if (candidateBlockFocusState !== state || state.isRestoringContent || state.isComposing) {
        return;
      }

      validateActiveCandidateBlockModalContent({ inputType: state.lastInputType || "insertFromMutation", restoreCaret: false });
      scheduleActiveCandidateBlockModalSync();
    });
  });

  observer.observe(state.modalSurfaceElement, {
    attributes: true,
    attributeFilter: ["class", "colspan", "height", "rowspan", "src", "style", "width"],
    characterData: true,
    childList: true,
    subtree: true,
  });

  return observer;
}

function syncActiveCandidateBlockModalEditor({ markDirty = false, validateOverflow = false } = {}) {
  const state = candidateBlockFocusState;

  if (
    !state ||
    !(state.blockElement instanceof HTMLElement) ||
    !(state.modalSurfaceElement instanceof HTMLElement) ||
    !(state.surfaceElement instanceof HTMLElement)
  ) {
    return false;
  }

  normalizeCandidateBlockTables(state.modalSurfaceElement);

  const overflowInfo = getModalContentOverflowInfo(state.modalSurfaceElement);
  state.hasOverflow = overflowInfo.hasOverflow;

  if (validateOverflow && overflowInfo.hasOverflow) {
    showModalOverflowMessage(state);
    return false;
  }

  if (!overflowInfo.hasOverflow) {
    state.lastValidHtml = getNormalizedModalHtml(state.modalSurfaceElement);
  }

  const normalizedHtml = getNormalizedModalHtml(state.modalSurfaceElement);

  if (state.activeTab === MODAL_TAB_DATA_BLOCK) {
    state.blockElement.innerHTML = normalizedHtml;
    normalizeCandidateBlockTables(state.blockElement);

    if (state.selectedPage) {
      syncCandidateBlockTemplateFromSurface(state.surfaceElement, state.selectedPage, state.blockElement);
    }

    refreshColumnDataPreview(state);
  } else {
    const config = getStateCandidateBlockGridConfig(state);

    if (state.activeTab === MODAL_TAB_EMPTY_BLOCK) {
      config.emptyBlockLayer.templateHtml = normalizedHtml;
    } else if (state.activeTab === MODAL_TAB_COLUMN_NAME) {
      config.columnNameRow.templateHtml = normalizedHtml;
      state.needsGridRerender = true;
    }
  }

  restoreModalCaretFocusIfLoose(state);

  if (markDirty) {
    state.onDirty?.();
  }

  return true;
}

function scheduleActiveCandidateBlockModalSync() {
  const state = candidateBlockFocusState;

  if (!state?.ownerWindow || state.isComposing) {
    return;
  }

  if (state.syncFrame) {
    return;
  }

  state.syncFrame = state.ownerWindow.requestAnimationFrame(() => {
    state.syncFrame = 0;
    syncActiveCandidateBlockModalEditor({ markDirty: true });
  });
}

function placeCaretAtEndOfSurface(surfaceElement, editor = null) {
  const ownerWindow = getOwnerWindow(surfaceElement);
  const ownerDocument = surfaceElement?.ownerDocument || document;
  const selection = ownerWindow.getSelection?.();
  const caretHosts = surfaceElement?.querySelectorAll?.(MODAL_CARET_HOST_SELECTOR) || [];
  const caretHost = caretHosts.length ? caretHosts[caretHosts.length - 1] : surfaceElement;

  if (!selection || !(caretHost instanceof HTMLElement)) {
    surfaceElement?.focus?.({ preventScroll: true });
    return;
  }

  const range = ownerDocument.createRange();

  range.selectNodeContents(caretHost);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  surfaceElement.focus({ preventScroll: true });

  if (editor?.state?.templateEditor) {
    editor.state.templateEditor.savedRange = range.cloneRange();
  }
}

function completeModalCompositionSoon(state = candidateBlockFocusState) {
  if (!state?.ownerWindow || state.compositionFrame) {
    return;
  }

  state.compositionFrame = state.ownerWindow.requestAnimationFrame(() => {
    state.compositionFrame = 0;

    if (candidateBlockFocusState !== state || state.isComposing || !(state.modalSurfaceElement instanceof HTMLElement)) {
      return;
    }

    if (ensureModalEditableHost(state.modalSurfaceElement)) {
      placeCaretAtEndOfSurface(state.modalSurfaceElement, state.editor);
    }

    validateActiveCandidateBlockModalContent({ inputType: state.lastInputType || "insertCompositionText", restoreCaret: false });
    scheduleActiveCandidateBlockModalSync();
  });
}

function handleBackdropPointerDown(event) {
  event.preventDefault();
  event.stopPropagation();
  closeCandidateBlockFocusEditor();
}

function isPointerNearActiveModalTableObject(event, state = candidateBlockFocusState) {
  const modalSurfaceElement = state?.modalSurfaceElement;
  const eventX = Number(event?.clientX);
  const eventY = Number(event?.clientY);

  if (
    !(modalSurfaceElement instanceof HTMLElement) ||
    !Number.isFinite(eventX) ||
    !Number.isFinite(eventY)
  ) {
    return false;
  }

  return Array.from(modalSurfaceElement.querySelectorAll("table")).some((tableElement) => {
    const rect = tableElement.getBoundingClientRect();

    return Boolean(
      rect.width >= 1 &&
        rect.height >= 1 &&
        eventX >= rect.left - candidateBlockFocusTableObjectOuterHitSlop &&
        eventX <= rect.right + candidateBlockFocusTableObjectOuterHitSlop &&
        eventY >= rect.top - candidateBlockFocusTableObjectOuterHitSlop &&
        eventY <= rect.bottom + candidateBlockFocusTableObjectOuterHitSlop
    );
  });
}

function handleLayerPointerDown(event) {
  const closeButton = event.target?.closest?.("[data-candidate-block-focus-close]");
  const tabButton = event.target?.closest?.("[data-candidate-block-focus-tab]");
  const modalSurfaceElement = candidateBlockFocusState?.modalSurfaceElement;

  if (closeButton) {
    event.preventDefault();
    event.stopPropagation();
    closeCandidateBlockFocusEditor();
    return;
  }

  if (tabButton) {
    const state = candidateBlockFocusState;
    const nextTab = tabButton.dataset.candidateBlockFocusTab;

    event.preventDefault();
    event.stopPropagation();
    if (!state || !nextTab || nextTab === state.activeTab) {
      return;
    }

    if (!syncActiveCandidateBlockModalEditor({ markDirty: true, validateOverflow: true })) {
      return;
    }

    setActiveModalSurface(state, nextTab);
    return;
  }

  if (event.target?.closest?.("[data-candidate-block-feature-switch-wrap]")) {
    return;
  }

  if (event.target?.closest?.(".template-editor-table-selection")) {
    return;
  }

  if (modalSurfaceElement instanceof HTMLElement && !modalSurfaceElement.contains(event.target)) {
    if (isPointerNearActiveModalTableObject(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    placeCaretAtEndOfSurface(modalSurfaceElement, candidateBlockFocusState?.editor);
  }
}

function handleLayerChange(event) {
  const heightInputElement = event.target instanceof HTMLInputElement
    ? event.target.closest("[data-candidate-block-column-name-row-height-px]")
    : null;

  if (heightInputElement instanceof HTMLInputElement) {
    applyColumnNameRowHeightInput(heightInputElement);
    return;
  }

  const inputElement = event.target instanceof HTMLInputElement
    ? event.target.closest("[data-candidate-block-feature-switch]")
    : null;
  const state = candidateBlockFocusState;

  if (!(inputElement instanceof HTMLInputElement) || !state) {
    return;
  }

  const featureTab = inputElement.dataset.candidateBlockFeatureSwitch;
  const config = getStateCandidateBlockGridConfig(state);

  if (featureTab === MODAL_TAB_EMPTY_BLOCK) {
    if (state.activeTab === MODAL_TAB_EMPTY_BLOCK && inputElement.checked === false) {
      syncActiveCandidateBlockModalEditor({ markDirty: true, validateOverflow: true });
    }
    config.emptyBlockLayer.enabled = inputElement.checked;
  } else if (featureTab === MODAL_TAB_COLUMN_NAME) {
    if (state.activeTab === MODAL_TAB_COLUMN_NAME && inputElement.checked === false) {
      syncActiveCandidateBlockModalEditor({ markDirty: true, validateOverflow: true });
    }
    config.columnNameRow.enabled = inputElement.checked;
    state.needsGridRerender = true;
  } else {
    return;
  }

  syncModalTabsUi(state);
  refreshColumnDataPreview(state);
  applyCandidateBlockFocusLayout(state);
  state.onDirty?.();

  if (inputElement.checked && state.modalSurfaceElement instanceof HTMLElement) {
    state.ownerWindow.requestAnimationFrame(() => {
      if (candidateBlockFocusState === state && isModalTabFeatureEnabled(state, state.activeTab)) {
        placeCaretAtEndOfSurface(state.modalSurfaceElement, state.editor);
      }
    });
  }
}

function handleLayerKeyDown(event) {
  const heightInputElement = event.target instanceof HTMLInputElement
    ? event.target.closest("[data-candidate-block-column-name-row-height-px]")
    : null;

  if (!(heightInputElement instanceof HTMLInputElement) || event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  applyColumnNameRowHeightInput(heightInputElement);
}

function isEventTargetInsideActiveModal(event) {
  const modalSurfaceElement = candidateBlockFocusState?.modalSurfaceElement;

  return (
    modalSurfaceElement instanceof HTMLElement &&
    event?.target instanceof Node &&
    modalSurfaceElement.contains(event.target)
  );
}

function handleModalInput(event) {
  const state = candidateBlockFocusState;
  const modalSurfaceElement = state?.modalSurfaceElement;
  const inputType = event?.inputType || state?.lastInputType || "";

  if (isModalCompositionInput(event, state)) {
    if (state) {
      state.lastInputType = inputType || "insertCompositionText";
    }

    return;
  }

  if (ensureModalEditableHost(modalSurfaceElement)) {
    placeCaretAtEndOfSurface(modalSurfaceElement, state?.editor);
  }

  validateActiveCandidateBlockModalContent({ inputType });
  restoreModalEditableHostSoon({
    forceCaret: !hasMeaningfulModalContent(modalSurfaceElement) || shouldRestoreModalCaretFocus(state),
  });
  scheduleActiveCandidateBlockModalSync();
}

function handleModalWindowInput(event) {
  if (!shouldHandleActiveModalKeyboardEvent(event)) {
    return;
  }

  handleModalInput(event);
}

function handleModalBeforeInput(event) {
  const inputType = String(event?.inputType || "");
  const state = candidateBlockFocusState;
  const modalSurfaceElement = state?.modalSurfaceElement;

  if (state) {
    state.lastInputType = inputType;
    state.beforeInputHtml = getNormalizedModalHtml(modalSurfaceElement);
  }

  if (isModalCompositionInput(event, state)) {
    return;
  }

  if (!["deleteContentBackward", "deleteContentForward", "deleteByCut"].includes(inputType)) {
    return;
  }

  if (hasMeaningfulModalContent(modalSurfaceElement)) {
    return;
  }

  stopModalEditingEvent(event);
  ensureModalEditableHost(modalSurfaceElement);
  placeCaretAtEndOfSurface(modalSurfaceElement, state?.editor);
  restoreModalEditableHostSoon({ forceCaret: true });
  scheduleActiveCandidateBlockModalSync();
}

function handleModalWindowBeforeInput(event) {
  if (!shouldHandleActiveModalKeyboardEvent(event)) {
    return;
  }

  handleModalBeforeInput(event);
}

function handleModalKeyDown(event) {
  const state = candidateBlockFocusState;

  if (state?.isComposing || event?.isComposing) {
    if (isModalSelectAllShortcut(event)) {
      stopModalEditingEvent(event);
      state?.modalSurfaceElement?.focus?.({ preventScroll: true });
    }

    return;
  }

  if (isModalSelectAllShortcut(event)) {
    if (state) {
      state.lastInputType = "";
      state.beforeInputHtml = getNormalizedModalHtml(state.modalSurfaceElement);
    }

    stopModalEditingEvent(event);
    selectModalContents(state);
    return;
  }

  if (state) {
    state.lastInputType = event.key === "Backspace" ? "deleteContentBackward" : event.key === "Delete" ? "deleteContentForward" : "";
    state.beforeInputHtml = getNormalizedModalHtml(state.modalSurfaceElement);
  }

  if (!["Backspace", "Delete"].includes(event.key)) {
    return;
  }

  const modalSurfaceElement = state?.modalSurfaceElement;

  if (hasMeaningfulModalContent(modalSurfaceElement)) {
    return;
  }

  stopModalEditingEvent(event);
  ensureModalEditableHost(modalSurfaceElement);
  placeCaretAtEndOfSurface(modalSurfaceElement, state?.editor);
  restoreModalEditableHostSoon({ forceCaret: true });
  scheduleActiveCandidateBlockModalSync();
}

function handleModalWindowKeyDown(event) {
  if (!shouldHandleActiveModalKeyboardEvent(event)) {
    return;
  }

  handleModalKeyDown(event);
}

function handleModalCompositionStart(event) {
  const state = candidateBlockFocusState;

  if (!state?.modalSurfaceElement) {
    return;
  }

  state.isComposing = true;
  state.lastInputType = "insertCompositionText";
  state.beforeInputHtml = getNormalizedModalHtml(state.modalSurfaceElement);
}

function handleModalWindowCompositionStart(event) {
  if (!shouldHandleActiveModalCompositionEvent(event)) {
    return;
  }

  handleModalCompositionStart(event);
}

function handleModalCompositionEnd(event) {
  const state = candidateBlockFocusState;

  if (!state?.modalSurfaceElement) {
    return;
  }

  state.isComposing = false;
  state.lastInputType = "insertCompositionText";
  completeModalCompositionSoon(state);
}

function handleModalWindowCompositionEnd(event) {
  if (!shouldHandleActiveModalCompositionEvent(event)) {
    return;
  }

  handleModalCompositionEnd(event);
}

function handleWindowLayoutChange() {
  applyCandidateBlockFocusLayout();
}

function applyCandidateBlockFocusLayout(state = candidateBlockFocusState) {
  const { blockElement, layerElement, modalSurfaceElement, surfaceElement } = state || {};

  if (
    !(blockElement instanceof HTMLElement) ||
    !(surfaceElement instanceof HTMLElement) ||
    !surfaceElement.contains(blockElement) ||
    !(layerElement instanceof HTMLElement) ||
    !(modalSurfaceElement instanceof HTMLElement)
  ) {
    closeCandidateBlockFocusEditor();
    return false;
  }

  const ownerDocument = blockElement.ownerDocument || document;
  const activeLogicalSize = getActiveModalLogicalSize(state);
  const activeEditorHeight = getActiveModalEditorLogicalHeight(state);
  const dataPreviewHeight = Math.max(1, Number(state.logicalSize?.height) || activeEditorHeight);
  const columnNameRowHeight = getColumnNameRowLogicalHeight(state);
  const layout = getCandidateBlockFocusLayout(surfaceElement, blockElement, activeLogicalSize);
  const backdropRect = getCanvasBackdropRect(surfaceElement);

  modalSurfaceElement.dataset.candidateBlockLogicalWidth = String(layout.editorWidth);
  modalSurfaceElement.dataset.candidateBlockLogicalHeight = String(activeEditorHeight);
  modalSurfaceElement.dataset.candidateBlockLogicalContentWidth = String(layout.editorWidth);
  modalSurfaceElement.dataset.candidateBlockLogicalContentHeight = String(activeEditorHeight);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-panel-left", `${layout.panelLeft}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-panel-top", `${layout.panelTop}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-panel-width", `${layout.panelWidth}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-panel-height", `${layout.panelHeight}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-editor-width", `${layout.editorWidth}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-editor-height", `${activeEditorHeight}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-data-preview-height", `${dataPreviewHeight}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-column-row-height", `${columnNameRowHeight}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-editor-scale", String(layout.scale));
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-editor-visual-width", `${layout.visualWidth}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-editor-visual-height", `${layout.visualHeight}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-backdrop-left", `${backdropRect.left}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-backdrop-top", `${backdropRect.top}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-backdrop-width", `${Math.round(backdropRect.width)}px`);
  setDocumentFocusVariable(ownerDocument, "--examlist-candidate-block-focus-backdrop-height", `${Math.round(backdropRect.height)}px`);
  return true;
}

function clearModalSelectionIfNeeded(state) {
  const selection = state.ownerWindow?.getSelection?.();
  const anchorElement =
    selection?.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection?.anchorNode?.parentElement || null;
  const focusElement =
    selection?.focusNode?.nodeType === Node.ELEMENT_NODE
      ? selection.focusNode
      : selection?.focusNode?.parentElement || null;

  if (state.modalSurfaceElement?.contains?.(anchorElement) || state.modalSurfaceElement?.contains?.(focusElement)) {
    selection?.removeAllRanges();

    if (state.editor?.state?.templateEditor) {
      state.editor.state.templateEditor.savedRange = null;
    }
  }
}

function withDocumentSurface(callback) {
  const activeSurface = candidateBlockFocusState?.modalSurfaceElement;

  if (!(activeSurface instanceof HTMLElement)) {
    return callback?.();
  }

  activeSurface.removeAttribute("data-template-editor-runtime-active-surface");

  try {
    return callback?.();
  } finally {
    activeSurface.dataset.templateEditorRuntimeActiveSurface = "true";
  }
}

function installGlobalCandidateBlockModalApi(ownerWindow = window) {
  ownerWindow.ExamListCandidateBlockModalEditor = {
    getActiveSurface: () => candidateBlockFocusState?.modalSurfaceElement || null,
    isOpen: () => Boolean(candidateBlockFocusState),
    syncActiveEditor: syncActiveCandidateBlockModalEditor,
    withDocumentSurface,
  };
}

export function isCandidateBlockFocusEditorOpen(blockElement = null) {
  if (!candidateBlockFocusState) {
    return false;
  }

  return blockElement ? candidateBlockFocusState.blockElement === blockElement : true;
}

export function openCandidateBlockFocusEditor({
  blockElement,
  editor = null,
  onDirty = null,
  selectedPage = null,
  surfaceElement,
} = {}) {
  if (!(blockElement instanceof HTMLElement) || !(surfaceElement instanceof HTMLElement) || !surfaceElement.contains(blockElement)) {
    return false;
  }

  if (candidateBlockFocusState?.blockElement === blockElement) {
    applyCandidateBlockFocusLayout(candidateBlockFocusState);
    return true;
  }

  closeCandidateBlockFocusEditor();

  const ownerDocument = blockElement.ownerDocument || document;
  const ownerWindow = getOwnerWindow(blockElement);
  const layerHostElement = surfaceElement;
  const backdropElement = getCandidateBlockFocusBackdrop(ownerDocument, layerHostElement);
  const layerElement = getCandidateBlockFocusLayer(ownerDocument, layerHostElement);
  const modalSurfaceElement = getModalSurfaceElement(layerElement);
  const emptySurfaceElement = getModalSurfaceElementByTab(layerElement, MODAL_TAB_EMPTY_BLOCK);
  const columnSurfaceElement = getModalSurfaceElementByTab(layerElement, MODAL_TAB_COLUMN_NAME);
  const columnDataPreviewElement = getColumnDataPreviewElement(layerElement);

  if (
    !(modalSurfaceElement instanceof HTMLElement) ||
    !(emptySurfaceElement instanceof HTMLElement) ||
    !(columnSurfaceElement instanceof HTMLElement)
  ) {
    return false;
  }

  modalSurfaceElement.innerHTML = String(blockElement.innerHTML || "").trim() || MODAL_EMPTY_HTML;
  ensureModalEditableHost(modalSurfaceElement);
  emptySurfaceElement.innerHTML = MODAL_EMPTY_HTML;
  columnSurfaceElement.innerHTML = MODAL_EMPTY_HTML;
  columnDataPreviewElement?.replaceChildren?.();

  candidateBlockFocusState = {
    activeTab: MODAL_TAB_DATA_BLOCK,
    backdropElement,
    blockElement,
    canvasElement: surfaceElement.closest(".template-editor-page") || surfaceElement,
    editor,
    layerElement,
    logicalSize: getCandidateBlockFocusBlockLogicalSize(blockElement),
    modalSurfaceElement,
    modalSurfaceElements: {
      [MODAL_TAB_DATA_BLOCK]: modalSurfaceElement,
      [MODAL_TAB_EMPTY_BLOCK]: emptySurfaceElement,
      [MODAL_TAB_COLUMN_NAME]: columnSurfaceElement,
    },
    columnDataPreviewElement,
    onDirty,
    ownerDocument,
    ownerWindow,
    selectedPage,
    beforeInputHtml: getNormalizedModalHtml(modalSurfaceElement),
    compositionFrame: 0,
    isComposing: false,
    isRestoringContent: false,
    lastInputType: "",
    lastOverflowMessageAt: 0,
    lastValidHtml: getNormalizedModalHtml(modalSurfaceElement),
    hasModalSurfaceListeners: false,
    needsGridRerender: false,
    mutationFrame: 0,
    restoreFrame: 0,
    restoreTimer: 0,
    surfaceElement,
    syncFrame: 0,
  };

  installGlobalCandidateBlockModalApi(ownerWindow);
  surfaceElement.classList.add("is-candidate-block-focus-active");
  candidateBlockFocusState.canvasElement.classList.add("is-candidate-block-focus-active");
  backdropElement.addEventListener("pointerdown", handleBackdropPointerDown);
  layerElement.addEventListener("pointerdown", handleLayerPointerDown);
  layerElement.addEventListener("change", handleLayerChange);
  layerElement.addEventListener("keydown", handleLayerKeyDown);
  ownerWindow.addEventListener("beforeinput", handleModalWindowBeforeInput, modalCapturedEventOptions);
  ownerWindow.addEventListener("compositionstart", handleModalWindowCompositionStart, modalCapturedEventOptions);
  ownerWindow.addEventListener("compositionend", handleModalWindowCompositionEnd, modalCapturedEventOptions);
  ownerWindow.addEventListener("input", handleModalWindowInput, modalCapturedEventOptions);
  ownerWindow.addEventListener("keydown", handleModalWindowKeyDown, modalCapturedEventOptions);
  ownerWindow.addEventListener("resize", handleWindowLayoutChange);
  ownerWindow.addEventListener("scroll", handleWindowLayoutChange, true);

  setActiveModalSurface(candidateBlockFocusState, MODAL_TAB_DATA_BLOCK);

  if (!applyCandidateBlockFocusLayout(candidateBlockFocusState)) {
    return false;
  }

  validateActiveCandidateBlockModalContent({ inputType: "open", restoreCaret: false });

  ownerWindow.requestAnimationFrame(() => {
    if (
      candidateBlockFocusState?.modalSurfaceElement !== modalSurfaceElement ||
      candidateBlockFocusState?.isComposing
    ) {
      return;
    }

    placeCaretAtEndOfSurface(modalSurfaceElement, editor);
  });
  return true;
}

export function refreshCandidateBlockFocusEditor() {
  return applyCandidateBlockFocusLayout();
}

export function closeCandidateBlockFocusEditor() {
  const state = candidateBlockFocusState;

  if (!state) {
    return false;
  }

  if (!syncActiveCandidateBlockModalEditor({ markDirty: true, validateOverflow: true })) {
    return false;
  }

  if (state.syncFrame) {
    state.ownerWindow?.cancelAnimationFrame?.(state.syncFrame);
  }

  if (state.restoreFrame) {
    state.ownerWindow?.cancelAnimationFrame?.(state.restoreFrame);
  }

  if (state.restoreTimer) {
    state.ownerWindow?.clearTimeout?.(state.restoreTimer);
  }

  if (state.compositionFrame) {
    state.ownerWindow?.cancelAnimationFrame?.(state.compositionFrame);
  }

  if (state.mutationFrame) {
    state.ownerWindow?.cancelAnimationFrame?.(state.mutationFrame);
  }

  state.modalMutationObserver?.disconnect?.();
  candidateBlockFocusState = null;
  clearModalSelectionIfNeeded(state);
  Object.values(state.modalSurfaceElements || {}).forEach((surfaceElement) => {
    removeModalSurfaceEventListeners(surfaceElement);
  });
  state.ownerWindow?.removeEventListener?.("beforeinput", handleModalWindowBeforeInput, modalCapturedEventOptions);
  state.ownerWindow?.removeEventListener?.("compositionstart", handleModalWindowCompositionStart, modalCapturedEventOptions);
  state.ownerWindow?.removeEventListener?.("compositionend", handleModalWindowCompositionEnd, modalCapturedEventOptions);
  state.ownerWindow?.removeEventListener?.("input", handleModalWindowInput, modalCapturedEventOptions);
  state.ownerWindow?.removeEventListener?.("keydown", handleModalWindowKeyDown, modalCapturedEventOptions);
  state.backdropElement?.removeEventListener?.("pointerdown", handleBackdropPointerDown);
  state.layerElement?.removeEventListener?.("pointerdown", handleLayerPointerDown);
  state.layerElement?.removeEventListener?.("change", handleLayerChange);
  state.layerElement?.removeEventListener?.("keydown", handleLayerKeyDown);
  state.ownerWindow?.removeEventListener?.("resize", handleWindowLayoutChange);
  state.ownerWindow?.removeEventListener?.("scroll", handleWindowLayoutChange, true);
  state.surfaceElement?.classList?.remove("is-candidate-block-focus-active");
  state.canvasElement?.classList?.remove("is-candidate-block-focus-active");
  state.backdropElement?.remove?.();
  state.layerElement?.remove?.();
  if (state.needsGridRerender && state.surfaceElement && state.selectedPage) {
    renderCandidateBlockGridOnSurface(state.surfaceElement, state.selectedPage);
  }
  clearDocumentFocusVariables(state.ownerDocument);
  return true;
}
