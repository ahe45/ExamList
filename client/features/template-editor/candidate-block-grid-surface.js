import { showToast } from "../../app/toast.js";
import { normalizeTokenLabels } from "./data-tags-adapter.js";
import {
  candidateBlockGridDefaults,
  isCandidateBlockGridContentPage,
} from "./candidate-block-grid-config.js";
import {
  clampCandidateBlockGridPositionToDocument,
  createCandidateBlockGridElement,
  ensurePageCandidateBlockGridConfig,
} from "./candidate-block-grid-renderer.js";
import { hydrateCandidateBlockGridObjects } from "./candidate-block-grid-object-controls.js";
import {
  clearCandidateBlockGridSelection,
  selectCandidateBlockGridElement,
} from "./candidate-block-grid-selection.js";
import {
  ensureCandidateBlockGridOutsideEditableHost,
  getCandidateBlockGridElements,
  normalizeCandidateBlockTables,
  normalizeCandidateBlockTemplateHtmlFromElement,
  removeCandidateBlockGridElements,
  removeCandidateBlockGridFlowSpacers,
} from "./candidate-block-grid-dom.js";
import {
  applyCandidateBlockTemplateRoles,
  getCandidateBlockTemplateSourceElement,
  isCandidateBlockTemplateSource,
} from "./candidate-block-grid-block-roles.js";

function getActiveCandidateBlockElement(surfaceElement, sourceBlock = null) {
  const sourceElement = sourceBlock?.closest?.("[data-candidate-block-instance]") || null;

  if (
    sourceElement instanceof HTMLElement &&
    surfaceElement?.contains?.(sourceElement) &&
    isCandidateBlockTemplateSource(sourceElement)
  ) {
    return sourceElement;
  }

  return null;
}

function getFirstCandidateBlockElement(surfaceElement) {
  return getCandidateBlockTemplateSourceElement(surfaceElement);
}

export function isBlankCandidateBlockGridHost(documentElement) {
  const clone = documentElement?.cloneNode?.(true);

  if (!clone) {
    return true;
  }

  removeCandidateBlockGridElements(clone);

  const normalizedHtml = String(clone.innerHTML || "")
    .replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();

  return normalizedHtml === "";
}

export function syncCandidateBlockTemplateFromSurface(surfaceElement, selectedPage, sourceBlock = null, options = {}) {
  if (!surfaceElement || !selectedPage) {
    return null;
  }

  const config = ensurePageCandidateBlockGridConfig(selectedPage);

  if (config.variant !== "photo") {
    return config;
  }

  getCandidateBlockGridElements(surfaceElement).forEach((gridElement) => applyCandidateBlockTemplateRoles(gridElement));
  normalizeCandidateBlockTables(surfaceElement);

  const activeBlock =
    getActiveCandidateBlockElement(surfaceElement, sourceBlock) ||
    (options.allowFallback ? getFirstCandidateBlockElement(surfaceElement) : null);

  if (!(activeBlock instanceof HTMLElement)) {
    return config;
  }

  normalizeCandidateBlockTables(activeBlock);
  const nextTemplateHtml = normalizeCandidateBlockTemplateHtmlFromElement(activeBlock, config.blockTemplateHtml);

  config.blockTemplateHtml = nextTemplateHtml;
  if (!activeBlock.matches?.("[data-candidate-block-modal-editor-surface]")) {
    activeBlock.innerHTML = nextTemplateHtml;
    activeBlock.setAttribute("contenteditable", "false");
  }
  normalizeCandidateBlockTables(activeBlock);

  surfaceElement.querySelectorAll("[data-candidate-block-instance]").forEach((blockElement) => {
    if (blockElement.matches?.("[data-candidate-block-modal-editor-surface]")) {
      return;
    }

    if (blockElement === activeBlock) {
      return;
    }

    blockElement.innerHTML = nextTemplateHtml;
    blockElement.setAttribute("contenteditable", "false");
    normalizeCandidateBlockTables(blockElement);
  });

  getCandidateBlockGridElements(surfaceElement).forEach((gridElement) => applyCandidateBlockTemplateRoles(gridElement));

  return config;
}

export function renderCandidateBlockGridOnSurface(surfaceElement, selectedPage) {
  if (!surfaceElement || !selectedPage) {
    return;
  }

  syncCandidateBlockTemplateFromSurface(surfaceElement, selectedPage, null, { allowFallback: true });
  const config = ensurePageCandidateBlockGridConfig(selectedPage);
  const existingGridElement = getCandidateBlockGridElements(surfaceElement)[0] || null;
  const documentElement = surfaceElement.querySelector(".template-doc") || surfaceElement;

  if (config.variant !== "photo" || !config.enabled) {
    removeCandidateBlockGridElements(surfaceElement);
    clearCandidateBlockGridSelection();
    if (isBlankCandidateBlockGridHost(documentElement)) {
      documentElement.innerHTML = "<p><br></p>";
    }
    return;
  }

  clampCandidateBlockGridPositionToDocument(config, documentElement);

  if (existingGridElement) {
    const nextGridElement = createCandidateBlockGridElement(config);

    clearCandidateBlockGridSelection();
    existingGridElement.replaceWith(nextGridElement);
    normalizeCandidateBlockTables(nextGridElement);
  } else {
    hydrateCandidateBlockGridObjects(surfaceElement);
    clearCandidateBlockGridSelection();
    normalizeCandidateBlockTables(surfaceElement);
  }

  removeCandidateBlockGridFlowSpacers(documentElement);
  ensureCandidateBlockGridOutsideEditableHost(documentElement);
  normalizeTokenLabels(surfaceElement);
}

function getCandidateBlockGridInsertionBlock(range, documentElement) {
  let currentNode = range?.commonAncestorContainer || null;

  if (currentNode?.nodeType === Node.TEXT_NODE) {
    currentNode = currentNode.parentElement;
  }

  while (currentNode instanceof HTMLElement && currentNode !== documentElement) {
    if (currentNode.matches("p, h1, h2, h3, blockquote, li")) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
}

function isBlankCandidateBlockInsertionHost(element) {
  const normalizedHtml = String(element?.innerHTML || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, "")
    .replace(/\s+/g, "")
    .trim();

  return normalizedHtml === "";
}

function insertCandidateBlockGridElementAtRange(documentElement, selectedRange, gridElement) {
  const insertionBlock = getCandidateBlockGridInsertionBlock(selectedRange, documentElement);

  if (insertionBlock?.parentNode) {
    if (isBlankCandidateBlockInsertionHost(insertionBlock)) {
      insertionBlock.replaceWith(gridElement);
    } else {
      insertionBlock.after(gridElement);
    }
    return;
  }

  selectedRange.deleteContents();
  selectedRange.insertNode(gridElement);
}

export function insertCandidateBlockGridAtSelection(surfaceElement, selectedPage) {
  if (!surfaceElement || !selectedPage) {
    return null;
  }

  if (!isCandidateBlockGridContentPage(selectedPage)) {
    return null;
  }

  const existingGridElement = getCandidateBlockGridElements(surfaceElement)[0] || null;

  if (existingGridElement) {
    selectCandidateBlockGridElement(existingGridElement);
    showToast("수험생 데이터 블록은 한 페이지에 하나만 생성할 수 있습니다.", "warning");
    return existingGridElement;
  }

  const config = ensurePageCandidateBlockGridConfig(selectedPage);
  const documentElement = surfaceElement.querySelector(".template-doc") || surfaceElement;
  const selection = window.getSelection?.();
  const selectedRange =
    selection?.rangeCount &&
    documentElement.contains(selection.getRangeAt(0).commonAncestorContainer)
      ? selection.getRangeAt(0)
      : null;
  const nextConfig = {
    ...config,
    blockTemplateHtml: candidateBlockGridDefaults.blockTemplateHtml,
    enabled: true,
    variant: "photo",
  };
  const gridElement = createCandidateBlockGridElement(nextConfig);

  selectedPage.settings.candidateBlockGrid = nextConfig;

  if (selectedRange) {
    insertCandidateBlockGridElementAtRange(documentElement, selectedRange, gridElement);
  } else {
    documentElement.append(gridElement);
  }

  normalizeCandidateBlockTables(gridElement);
  ensureCandidateBlockGridOutsideEditableHost(documentElement);
  selectCandidateBlockGridElement(gridElement);
  normalizeTokenLabels(surfaceElement);
  return gridElement;
}
