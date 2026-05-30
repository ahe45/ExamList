const { getCandidateBlockGridConfig } = require("./pagination");
const { replaceTemplateGeneratedObjectImagesInHtml } = require("./generated-objects");
const {
  buildCandidateTokenMap,
  replaceTemplateTokensInHtml,
} = require("./tokens");
const { buildRoomTokenMap } = require("./room-context");
const {
  cssPixelsPerPoint,
  formatCssNumber,
  formatCssPixelLength,
  getStyleAttributeValue,
  getStyleHeightPx,
  getVerticalPaddingPx,
  parseCssPixelLength,
  replaceOrAppendStyleDeclaration,
  scaleCellVerticalPadding,
} = require("./candidate-block-grid-css");

const collapsedCandidateBlockTableBorderPx = 1;
const candidateBlockPhotoContentInsetPx = 3;

function getImageHeightPx(imageOpeningTag = "") {
  const styleHeight = getStyleHeightPx(imageOpeningTag);

  if (styleHeight > 0) {
    return styleHeight;
  }

  const heightAttributeMatch = String(imageOpeningTag || "").match(/\sheight\s*=\s*(["']?)(\d+(?:\.\d+)?)(?:px|pt)?\1/i);

  return heightAttributeMatch ? parseCssPixelLength(heightAttributeMatch[2]) : Number.NaN;
}

function scaleImageHeightAttributes(html = "", scale = 1) {
  const safeScale = Number(scale);

  if (!(safeScale > 0) || safeScale >= 1) {
    return html;
  }

  return String(html || "").replace(/<img\b[^>]*>/gi, (imageOpeningTag) => {
    let nextOpeningTag = imageOpeningTag;
    const styleHeight = getStyleHeightPx(nextOpeningTag);

    if (styleHeight > 0) {
      nextOpeningTag = replaceOrAppendStyleDeclaration(
        nextOpeningTag,
        "height",
        formatCssPixelLength(Math.max(1, styleHeight * safeScale)),
      );
    }

    return nextOpeningTag.replace(/\sheight\s*=\s*(["']?)(\d+(?:\.\d+)?)(?:px|pt)?\1/i, (_match, quote, heightValue) => {
      const quoteCharacter = quote || "";
      return ` height=${quoteCharacter}${formatCssNumber(Math.max(1, Number(heightValue) * safeScale))}${quoteCharacter}`;
    });
  });
}

function constrainPhotoSizingMarkup(html = "", maxHeightPx = 0) {
  const safeMaxHeightPx = Number(maxHeightPx) || 0;

  if (!(safeMaxHeightPx > 0)) {
    return html;
  }

  const maxHeightCssValue = formatCssPixelLength(safeMaxHeightPx);

  return String(html || "").replace(/<(span|img)\b[^>]*>/gi, (openingTag) => {
    if (!/\bpreview-photo-(?:fit-frame|image)\b/.test(openingTag)) {
      return openingTag;
    }

    let nextOpeningTag = replaceOrAppendStyleDeclaration(
      replaceOrAppendStyleDeclaration(openingTag, "height", maxHeightCssValue),
      "max-height",
      maxHeightCssValue,
    );

    if (/\bpreview-photo-image\b/.test(openingTag)) {
      nextOpeningTag = replaceOrAppendStyleDeclaration(
        replaceOrAppendStyleDeclaration(nextOpeningTag, "width", "100%"),
        "object-fit",
        "contain",
      );
    }

    return nextOpeningTag;
  });
}

function removePhotoSizingTrailingBreaks(html = "") {
  return String(html || "").replace(
    /(<span\b[^>]*\bpreview-photo-fit-frame\b[^>]*>[\s\S]*?<\/span>)\s*(?:<br\s*\/?>\s*)+/gi,
    "$1",
  );
}

function getCellRowSpan(cellOpeningTag = "") {
  const rowspanMatch = String(cellOpeningTag || "").match(/\srowspan\s*=\s*(["']?)(\d+)\1/i);
  const rowspan = rowspanMatch ? Math.round(Number(rowspanMatch[2])) : 1;

  return Math.max(1, rowspan || 1);
}

function getRowEffectiveHeightPx(rowHtml = "", rowHeightPx = 0) {
  let effectiveHeight = Math.max(0, Number(rowHeightPx) || 0);
  const cellPattern = /(<(?:td|th)\b[^>]*>)([\s\S]*?)<\/(?:td|th)>/gi;

  for (let match = cellPattern.exec(String(rowHtml || "")); match; match = cellPattern.exec(String(rowHtml || ""))) {
    const cellOpeningTag = match[1];
    const cellInnerHtml = match[2];
    const cellStyle = getStyleAttributeValue(cellOpeningTag);
    const cellHeight = getStyleHeightPx(cellOpeningTag);
    const verticalPadding = getVerticalPaddingPx(cellStyle);
    const imageHeights = Array.from(String(cellInnerHtml || "").matchAll(/<img\b[^>]*>/gi))
      .map((imageMatch) => getImageHeightPx(imageMatch[0]))
      .filter((height) => height > 0);
    const contentHeight = imageHeights.length ? Math.max(...imageHeights) : 0;
    const rowspan = getCellRowSpan(cellOpeningTag);
    const cellMinimumHeight = Math.max(cellHeight > 0 ? cellHeight : 0, verticalPadding + contentHeight);

    if (cellMinimumHeight > 0) {
      effectiveHeight = Math.max(effectiveHeight, cellMinimumHeight / rowspan);
    }
  }

  return effectiveHeight;
}

function getSpannedCellHeightPx(rowIndex = 0, rowspan = 1, rowHeights = []) {
  const safeRowIndex = Math.max(0, Math.round(Number(rowIndex)) || 0);
  const safeRowspan = Math.max(1, Math.round(Number(rowspan)) || 1);
  const spannedHeights = rowHeights.slice(safeRowIndex, safeRowIndex + safeRowspan);
  const spannedHeight = spannedHeights.reduce((heightSum, height) => heightSum + (Number(height) || 0), 0);

  return spannedHeight > 0 ? spannedHeight : 0;
}

function setRowCellHeights(rowInnerHtml = "", heightCssValue = "", scale = 1, rowIndex = 0, rowHeights = []) {
  return String(rowInnerHtml || "").replace(/(<(td|th)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (
    _match,
    cellOpeningTag,
    _tagName,
    cellInnerHtml,
    cellClosingTag,
  ) => {
    const rowspan = getCellRowSpan(cellOpeningTag);
    const spannedHeightPx = rowspan > 1 ? getSpannedCellHeightPx(rowIndex, rowspan, rowHeights) : 0;
    const cellHeightPx = spannedHeightPx || parseCssPixelLength(heightCssValue);
    const cellHeightCssValue = spannedHeightPx > 0 ? formatCssPixelLength(spannedHeightPx) : heightCssValue;
    const nextCellOpeningTag = scaleCellVerticalPadding(
      replaceOrAppendStyleDeclaration(cellOpeningTag, "height", cellHeightCssValue),
      scale,
    );
    const fittedCellStyle = getStyleAttributeValue(nextCellOpeningTag);
    const verticalPadding = getVerticalPaddingPx(fittedCellStyle);
    const maxPhotoContentHeight = Math.max(
      1,
      (Number(cellHeightPx) || 0) - verticalPadding - candidateBlockPhotoContentInsetPx,
    );
    const fittedCellInnerHtml = removePhotoSizingTrailingBreaks(
      constrainPhotoSizingMarkup(
        scaleImageHeightAttributes(cellInnerHtml, scale),
        maxPhotoContentHeight,
      ),
    );

    return `${nextCellOpeningTag}${fittedCellInnerHtml}${cellClosingTag}`;
  });
}

function fitCandidateBlockTableRowsToHeight(tableHtml = "", targetHeightPx = 0) {
  const rowMatches = Array.from(String(tableHtml || "").matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi));

  if (!(targetHeightPx > 0) || !rowMatches.length) {
    return tableHtml;
  }

  const rowHeights = rowMatches.map((match) => getStyleHeightPx(match[0]));

  if (rowHeights.some((height) => !(height > 0))) {
    return tableHtml;
  }

  const effectiveRowHeights = rowMatches.map((match, index) => getRowEffectiveHeightPx(match[0], rowHeights[index]));
  const currentTotalHeight = effectiveRowHeights.reduce((heightSum, height) => heightSum + height, 0);

  if (!(currentTotalHeight > 0)) {
    return tableHtml;
  }

  const safeTargetHeight = Math.max(
    rowMatches.length,
    targetHeightPx - collapsedCandidateBlockTableBorderPx,
  );

  const hasConstrainableCellContent =
    /<(?:td|th)\b[^>]*\srowspan\s*=/i.test(tableHtml) ||
    /\bpreview-photo-fit-frame\b|\bpreview-photo-image\b|\btemplate-generated-object\b/i.test(tableHtml);

  if (currentTotalHeight <= safeTargetHeight + 0.5 && !hasConstrainableCellContent) {
    return tableHtml;
  }

  const scale = Math.min(1, safeTargetHeight / currentTotalHeight);
  const targetTotalHeight = Math.min(currentTotalHeight, safeTargetHeight);
  let usedHeight = 0;
  const nextHeights = effectiveRowHeights.map((height, index) => {
    const isLast = index === effectiveRowHeights.length - 1;
    const nextHeight = isLast ? targetTotalHeight - usedHeight : Math.max(1, Math.round(height * scale * 100) / 100);

    usedHeight += nextHeight;
    return Math.max(1, nextHeight);
  });
  let rowIndex = 0;
  const fittedTableHtml = String(tableHtml).replace(/<table\b[^>]*>/i, (openingTag) =>
    replaceOrAppendStyleDeclaration(
      replaceOrAppendStyleDeclaration(openingTag, "height", formatCssPixelLength(targetTotalHeight)),
      "max-height",
      formatCssPixelLength(safeTargetHeight),
    ),
  );

  return fittedTableHtml.replace(/(<tr\b[^>]*>)([\s\S]*?)(<\/tr>)/gi, (_match, openingTag, innerHtml, closingTag) => {
    const heightCssValue = formatCssPixelLength(nextHeights[rowIndex] || 1);
    rowIndex += 1;

    return `${replaceOrAppendStyleDeclaration(openingTag, "height", heightCssValue)}${setRowCellHeights(
      innerHtml,
      heightCssValue,
      scale,
      rowIndex - 1,
      nextHeights,
    )}${closingTag}`;
  });
}

function fitCandidateBlockTablesToBlock(blockTemplateHtml = "", blockSize = {}) {
  const targetHeightPx = Number(blockSize.heightPx) || 0;

  if (!(targetHeightPx > 0)) {
    return blockTemplateHtml;
  }

  return String(blockTemplateHtml || "").replace(/<table\b[\s\S]*?<\/table>/gi, (tableHtml) =>
    fitCandidateBlockTableRowsToHeight(tableHtml, targetHeightPx),
  );
}

function getCandidateBlockPreviewSize(config = {}) {
  const rowCount = Math.max(1, Number(config.rows) || 1);
  const columnCount = Math.max(1, Number(config.columns) || 1);
  const heightPt = Number(config.heightPt) || 0;
  const widthPt = Number(config.widthPt) || 0;

  return {
    heightPx: heightPt > 0
      ? Math.max(0, (heightPt - Math.max(0, rowCount - 1) * (Number(config.gapYPt) || 0)) / rowCount) * cssPixelsPerPoint
      : 0,
    widthPx: widthPt > 0
      ? Math.max(0, (widthPt - Math.max(0, columnCount - 1) * (Number(config.gapXPt) || 0)) / columnCount) * cssPixelsPerPoint
      : 0,
  };
}

function getColumnMajorGridPosition(slotIndex = 0, config = {}) {
  const rowCount = Math.max(1, Math.round(Number(config.rows)) || 1);
  const columnIndex = Math.floor(Math.max(0, slotIndex) / rowCount);
  const rowIndex = Math.max(0, slotIndex) % rowCount;

  return {
    column: columnIndex + 1,
    row: rowIndex + 1,
  };
}

function getCandidateBlockGridClassName(config = {}) {
  return [
    "preview-candidate-block-grid",
    Number(config.gapXPt) === 0 ? "is-candidate-block-zero-gap-x" : "",
    Number(config.gapYPt) === 0 ? "is-candidate-block-zero-gap-y" : "",
  ].filter(Boolean).join(" ");
}

function createColumnMajorCandidateBlockEntries(actualRows = [], config = {}) {
  const rowCount = Math.max(1, Math.round(Number(config.rows)) || 1);
  const columnCount = Math.max(1, Math.round(Number(config.columns)) || 1);
  const slotsPerPage = rowCount * columnCount;
  const safeRows = Array.isArray(actualRows) ? actualRows.slice(0, slotsPerPage) : [];
  const occupiedSlots = new Set();
  const entries = safeRows.map((rowEntry, index) => {
    const slotIndex = index;
    occupiedSlots.add(slotIndex);

    return {
      rowEntry,
      sequenceIndex: index,
      slotIndex,
    };
  });

  if (config.fillEmptyBlocks !== false) {
    for (let slotIndex = 0; slotIndex < slotsPerPage; slotIndex += 1) {
      if (occupiedSlots.has(slotIndex)) {
        continue;
      }

      entries.push({
        rowEntry: {
          candidate: null,
          isEmpty: true,
          rowNumber: 0,
        },
        sequenceIndex: -1,
        slotIndex,
      });
    }
  }

  return entries;
}

function createCandidateBlockGridRenderer({
  formatPtValue,
  renderDocumentImagePlaceholders,
  replaceTemplateTokenSpansInHtml,
  sanitizeDocumentHtml,
}) {
  function renderCandidateBlockTemplateHtml(blockTemplateHtml, context, blockSize = {}) {
    const renderedHtml = renderDocumentImagePlaceholders(
      replaceTemplateTokensInHtml(
        replaceTemplateGeneratedObjectImagesInHtml(
          replaceTemplateTokenSpansInHtml(sanitizeDocumentHtml(blockTemplateHtml), context),
          context,
          { suppressEmptyGeneratedObjects: true },
        ),
        context,
      ),
    );

    return fitCandidateBlockTablesToBlock(renderedHtml, blockSize);
  }

  function renderCandidateBlockGrid(page, pageInstance, baseContext) {
    const config = getCandidateBlockGridConfig(page);

    if (!config) {
      return "";
    }

    const rows = pageInstance.rows.map((candidate, index) => ({
      candidate,
      isEmpty: false,
      rowNumber: pageInstance.rowOffset + index + 1,
    }));
    const blockSize = getCandidateBlockPreviewSize(config);
    const blockEntries = createColumnMajorCandidateBlockEntries(rows, config);

    return `
      <div
        class="${getCandidateBlockGridClassName(config)}"
        data-candidate-block-grid="true"
        style="grid-auto-flow:column;grid-template-columns:repeat(${config.columns}, minmax(0, 1fr));grid-template-rows:repeat(${config.rows}, minmax(0, 1fr));gap:${formatPtValue(config.gapYPt)}pt ${formatPtValue(config.gapXPt)}pt;${config.xPt > 0 || config.yPt > 0 ? `position:absolute;left:${formatPtValue(config.xPt)}pt;top:${formatPtValue(config.yPt)}pt;` : ""}${config.widthPt > 0 ? `width:${formatPtValue(config.widthPt)}pt;` : ""}${config.heightPt > 0 ? `height:${formatPtValue(config.heightPt)}pt;` : ""}"
      >
        ${blockEntries
          .map(({ rowEntry, slotIndex }) => {
            const gridPosition = getColumnMajorGridPosition(slotIndex, config);
            const rowContext = {
              ...baseContext,
              __emptyValueData: baseContext.__emptyValueData,
              __sampleData: baseContext.__sampleData,
              __sampleFallbackForEmptyDataTags: true,
              __styleEmptyValueFallback: true,
              candidate: buildCandidateTokenMap(rowEntry.candidate || {}, baseContext.school),
              room: {
                ...buildRoomTokenMap(rowEntry.candidate || {}, baseContext._roomAssignmentCountMap),
                otherRoom: baseContext.room?.otherRoom || "",
              },
              row: {
                index: rowEntry.isEmpty ? "" : rowEntry.rowNumber,
                indexInPage: rowEntry.isEmpty ? "" : rowEntry.rowNumber,
                indexInUnit: rowEntry.isEmpty ? "" : rowEntry.rowNumber,
              },
            };

            return `
              <div class="preview-candidate-block" data-candidate-block-grid-row="${gridPosition.row}" data-candidate-block-grid-column="${gridPosition.column}" data-candidate-block-index="${slotIndex + 1}" style="grid-row:${gridPosition.row};grid-column:${gridPosition.column};">
                ${renderCandidateBlockTemplateHtml(config.blockTemplateHtml, rowContext, blockSize)}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function replaceCandidateBlockGridMarkup(html, gridHtml) {
    if (!gridHtml) {
      return html;
    }

    const startMatch = String(html || "").match(/<div\b(?=[^>]*\bdata-candidate-block-grid=(['"])true\1)[^>]*>/i);

    if (startMatch?.index >= 0) {
      const startIndex = startMatch.index;
      const tagPattern = /<\/?div\b[^>]*>/gi;
      let depth = 0;

      tagPattern.lastIndex = startIndex;

      for (let tagMatch = tagPattern.exec(html); tagMatch; tagMatch = tagPattern.exec(html)) {
        const tagText = tagMatch[0];
        const isClosingTag = /^<\//.test(tagText);
        const isSelfClosingTag = /\/>$/.test(tagText);

        if (!isClosingTag && !isSelfClosingTag) {
          depth += 1;
        }

        if (isClosingTag) {
          depth -= 1;
        }

        if (depth === 0) {
          return `${html.slice(0, startIndex)}${gridHtml}${html.slice(tagPattern.lastIndex)}`;
        }
      }
    }

    return `${html}${gridHtml}`;
  }

  return Object.freeze({
    renderCandidateBlockGrid,
    replaceCandidateBlockGridMarkup,
  });
}

module.exports = {
  createCandidateBlockGridRenderer,
};
