import { getPageDocumentHtml } from "./document-editor.js";
import { ensureDocumentElement } from "./template-document-normalizer.js";
import {
  candidateBlockGridDefaults,
  candidateBlockGridMinimumRowHeight,
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

function getColumnMajorGridPosition(slotIndex = 0, config = {}) {
  const rowCount = Math.max(1, Math.round(Number(config.rows)) || 1);
  const columnIndex = Math.floor(Math.max(0, slotIndex) / rowCount);
  const rowIndex = Math.max(0, slotIndex) % rowCount;

  return {
    column: columnIndex + 1,
    row: rowIndex + 1,
  };
}

function isColumnNameRowEnabled(config = {}) {
  return Boolean(config?.columnNameRow?.enabled);
}

function getColumnNameRowHeightPx(config = {}) {
  return isColumnNameRowEnabled(config)
    ? pointValueToCssPixel(config.columnNameRow?.heightPt || 0)
    : 0;
}

function getCandidateBlockDataRowGapPx(config = {}) {
  return pointValueToCssPixel(config.gapYPt || 0);
}

function getRenderedCandidateBlockGridRow(row = 1, hasColumnNameRow = false) {
  const safeRow = Math.max(1, Math.round(Number(row)) || 1);

  return hasColumnNameRow ? 2 + (safeRow - 1) * 2 : safeRow;
}

function getCandidateBlockGridTemplateRows(config = {}) {
  const rowCount = Math.max(1, Math.round(Number(config.rows)) || 1);
  const dataRowTrack = `minmax(${candidateBlockGridMinimumRowHeight}px, 1fr)`;

  if (!isColumnNameRowEnabled(config)) {
    return `repeat(${rowCount}, ${dataRowTrack})`;
  }

  const tracks = [`${getColumnNameRowHeightPx(config)}px`];
  const dataRowGapPx = getCandidateBlockDataRowGapPx(config);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    tracks.push(dataRowTrack);

    if (rowIndex < rowCount - 1) {
      tracks.push(`${dataRowGapPx}px`);
    }
  }

  return tracks.join(" ");
}

function getCandidateBlockGridRenderedHeightPt(config = {}) {
  const dataHeightPt = Number(config.heightPt) || 0;

  if (!(dataHeightPt > 0)) {
    return 0;
  }

  return dataHeightPt + (isColumnNameRowEnabled(config) ? Number(config.columnNameRow?.heightPt) || 0 : 0);
}

function getCandidateBlockGridClassName(config = {}) {
  return [
    "examlist-candidate-block-grid",
    isColumnNameRowEnabled(config) ? "has-candidate-block-column-name-row" : "",
    Number(config.gapXPt) === 0 ? "is-candidate-block-zero-gap-x" : "",
    Number(config.gapYPt) === 0 ? "is-candidate-block-zero-gap-y" : "",
  ].filter(Boolean).join(" ");
}

export function createCandidateBlockGridElement(config) {
  const normalizedConfig = normalizeCandidateBlockGridConfig(config);
  const blockTemplateHtml = normalizeCandidateBlockTemplateHtml(normalizedConfig.blockTemplateHtml);
  const columnNameTemplateHtml = normalizeCandidateBlockTemplateHtml(normalizedConfig.columnNameRow?.templateHtml);
  const columnNameRowEnabled = isColumnNameRowEnabled(normalizedConfig);
  const columnNameRowHeightPx = getColumnNameRowHeightPx(normalizedConfig);
  const gridElement = document.createElement("div");
  const totalBlocks = getCandidateBlockGridTotal(normalizedConfig);

  gridElement.className = getCandidateBlockGridClassName(normalizedConfig);
  gridElement.dataset.candidateBlockGrid = "true";
  gridElement.dataset.candidateBlockColumns = String(normalizedConfig.columns);
  gridElement.dataset.candidateBlockColumnNameRowEnabled = columnNameRowEnabled ? "true" : "false";
  gridElement.dataset.candidateBlockColumnNameRowHeightPt = String(normalizedConfig.columnNameRow?.heightPt || 0);
  gridElement.dataset.candidateBlockGapXPt = String(normalizedConfig.gapXPt || 0);
  gridElement.dataset.candidateBlockGapYPt = String(normalizedConfig.gapYPt || 0);
  gridElement.dataset.candidateBlockRows = String(normalizedConfig.rows);
  gridElement.dataset.candidateBlockVariant = normalizedConfig.variant;
  gridElement.dataset.candidateBlockObject = "true";
  gridElement.tabIndex = 0;
  gridElement.setAttribute("aria-label", "수험생 데이터 블록");
  gridElement.setAttribute("contenteditable", "false");
  gridElement.style.position = normalizedConfig.xPt > 0 || normalizedConfig.yPt > 0 ? "absolute" : "relative";
  gridElement.style.gridTemplateColumns = `repeat(${normalizedConfig.columns}, minmax(0, 1fr))`;
  gridElement.style.gridTemplateRows = getCandidateBlockGridTemplateRows(normalizedConfig);
  gridElement.style.rowGap = columnNameRowEnabled ? "0px" : `${normalizedConfig.gapYPt}pt`;
  gridElement.style.columnGap = `${normalizedConfig.gapXPt}pt`;
  gridElement.style.minHeight = `calc(${
    normalizedConfig.rows * candidateBlockGridMinimumRowHeight + columnNameRowHeightPx
  }px + ${
    Math.max(0, normalizedConfig.rows - 1) * normalizedConfig.gapYPt
  }pt)`;

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

  const renderedHeightPt = getCandidateBlockGridRenderedHeightPt(normalizedConfig);

  if (renderedHeightPt > 0) {
    gridElement.style.height = `${pointValueToCssPixel(renderedHeightPt)}px`;
  }

  if (columnNameRowEnabled) {
    for (let columnIndex = 0; columnIndex < normalizedConfig.columns; columnIndex += 1) {
      const columnNameElement = document.createElement("div");

      columnNameElement.className = "examlist-candidate-block examlist-candidate-block-column-name";
      columnNameElement.dataset.candidateBlockColumnName = "true";
      columnNameElement.dataset.candidateBlockGridColumn = String(columnIndex + 1);
      columnNameElement.dataset.candidateBlockGridRow = "1";
      columnNameElement.setAttribute("aria-label", "수험생 데이터 컬럼명");
      columnNameElement.setAttribute("aria-readonly", "true");
      columnNameElement.setAttribute("contenteditable", "false");
      columnNameElement.style.gridColumn = String(columnIndex + 1);
      columnNameElement.style.gridRow = "1";
      columnNameElement.innerHTML = columnNameTemplateHtml;
      normalizeCandidateBlockTables(columnNameElement);
      gridElement.append(columnNameElement);
    }
  }

  for (let index = 0; index < totalBlocks; index += 1) {
    const blockElement = document.createElement("div");
    const gridPosition = getColumnMajorGridPosition(index, normalizedConfig);
    const renderedRow = getRenderedCandidateBlockGridRow(gridPosition.row, columnNameRowEnabled);

    blockElement.className = "examlist-candidate-block";
    blockElement.dataset.candidateBlockGridColumn = String(gridPosition.column);
    blockElement.dataset.candidateBlockGridRow = String(renderedRow);
    blockElement.dataset.candidateBlockInstance = String(index + 1);
    blockElement.style.gridColumn = String(gridPosition.column);
    blockElement.style.gridRow = String(renderedRow);
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
