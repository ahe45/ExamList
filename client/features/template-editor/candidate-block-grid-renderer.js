import { getPageDocumentHtml } from "./document-editor.js";
import { ensureDocumentElement } from "./template-document-normalizer.js";
import {
  candidateBlockGridDefaults,
  getCandidateBlockGridTotal,
  normalizeCandidateBlockGridConfig,
  normalizeCandidateBlockTemplateHtml,
  pointValueToCssPixel,
} from "./candidate-block-grid-config.js";
import {
  ensureCandidateBlockGridOutsideEditableHost,
  extractCandidateBlockTemplateHtml,
  getCandidateBlockGridElements,
  normalizeCandidateBlockTables,
  removeCandidateBlockGridElements,
  removeCandidateBlockGridFlowSpacers,
} from "./candidate-block-grid-dom.js";
import { ensureCandidateBlockGridObjectControls } from "./candidate-block-grid-object-controls.js";
import { applyCandidateBlockTemplateRoles } from "./candidate-block-grid-block-roles.js";

export function createCandidateBlockGridElement(config) {
  const normalizedConfig = normalizeCandidateBlockGridConfig(config);
  const blockTemplateHtml = normalizeCandidateBlockTemplateHtml(normalizedConfig.blockTemplateHtml);
  const gridElement = document.createElement("div");
  const totalBlocks = getCandidateBlockGridTotal(normalizedConfig);

  gridElement.className = "examlist-candidate-block-grid";
  gridElement.dataset.candidateBlockGrid = "true";
  gridElement.dataset.candidateBlockColumns = String(normalizedConfig.columns);
  gridElement.dataset.candidateBlockRows = String(normalizedConfig.rows);
  gridElement.dataset.candidateBlockVariant = normalizedConfig.variant;
  gridElement.dataset.candidateBlockObject = "true";
  gridElement.tabIndex = 0;
  gridElement.setAttribute("aria-label", "수험생 데이터 블록");
  gridElement.setAttribute("contenteditable", "false");
  gridElement.style.position = normalizedConfig.xPt > 0 || normalizedConfig.yPt > 0 ? "absolute" : "relative";
  gridElement.style.gridTemplateColumns = `repeat(${normalizedConfig.columns}, minmax(0, 1fr))`;
  gridElement.style.gridTemplateRows = `repeat(${normalizedConfig.rows}, minmax(52px, 1fr))`;
  gridElement.style.gap = `${normalizedConfig.gapYPt}pt ${normalizedConfig.gapXPt}pt`;

  if (normalizedConfig.xPt > 0 || normalizedConfig.yPt > 0) {
    gridElement.style.left = `${pointValueToCssPixel(normalizedConfig.xPt)}px`;
    gridElement.style.top = `${pointValueToCssPixel(normalizedConfig.yPt)}px`;
    gridElement.style.margin = "0";
    gridElement.style.maxWidth = "none";
    gridElement.style.zIndex = "0";
  }

  if (normalizedConfig.widthPt > 0) {
    gridElement.style.width = `${pointValueToCssPixel(normalizedConfig.widthPt)}px`;
  }

  if (normalizedConfig.heightPt > 0) {
    gridElement.style.height = `${pointValueToCssPixel(normalizedConfig.heightPt)}px`;
  }

  for (let index = 0; index < totalBlocks; index += 1) {
    const blockElement = document.createElement("div");

    blockElement.className = "examlist-candidate-block";
    blockElement.dataset.candidateBlockInstance = String(index + 1);
    blockElement.innerHTML = blockTemplateHtml;
    normalizeCandidateBlockTables(blockElement);
    gridElement.append(blockElement);
  }

  applyCandidateBlockTemplateRoles(gridElement);
  ensureCandidateBlockGridObjectControls(gridElement);
  return gridElement;
}

export function ensurePageCandidateBlockGridConfig(page) {
  if (!page) {
    return normalizeCandidateBlockGridConfig(null);
  }

  page.settings = page.settings && typeof page.settings === "object" ? page.settings : {};
  page.settings.candidateBlockGrid = normalizeCandidateBlockGridConfig(page.settings.candidateBlockGrid);
  return page.settings.candidateBlockGrid;
}

function renderCandidateBlockGridDocument(container, page) {
  const documentElement = ensureDocumentElement(container);
  const config = ensurePageCandidateBlockGridConfig(page);
  const existingTemplateHtml = extractCandidateBlockTemplateHtml(documentElement);

  if (existingTemplateHtml && config.blockTemplateHtml === candidateBlockGridDefaults.blockTemplateHtml) {
    config.blockTemplateHtml = existingTemplateHtml;
  }

  if (config.variant !== "photo" || !config.enabled) {
    removeCandidateBlockGridElements(documentElement);
    return documentElement;
  }

  const existingGridElements = getCandidateBlockGridElements(documentElement);
  const existingGridElement = existingGridElements[0] || null;
  const nextGridElement = createCandidateBlockGridElement(config);

  existingGridElements.forEach((gridElement, index) => {
    if (index > 0) {
      gridElement.remove();
    }
  });

  if (existingGridElement?.isConnected) {
    existingGridElement.replaceWith(nextGridElement);
  } else {
    documentElement.append(nextGridElement);
  }

  removeCandidateBlockGridFlowSpacers(documentElement);
  ensureCandidateBlockGridOutsideEditableHost(documentElement);
  return documentElement;
}

export function buildCandidateBlockGridHtml(page) {
  const container = document.createElement("div");

  container.innerHTML = getPageDocumentHtml(page) || "<div class=\"template-doc\"><p><br></p></div>";
  renderCandidateBlockGridDocument(container, page);
  return container.innerHTML;
}
