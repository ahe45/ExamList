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
  getHorizontalPaddingPx,
  getStyleAttributeValue,
  getStyleHeightPx,
  getStyleWidthPx,
  getVerticalPaddingPx,
  parseCssPixelLength,
  replaceOrAppendStyleDeclaration,
  scaleCellVerticalPadding,
} = require("./candidate-block-grid-css");

const collapsedCandidateBlockTableBorderPx = 1;
const candidateBlockPhotoFramePaddingPx = 1.5;

function applyStyleDeclarations(openingTag = "", declarations = []) {
  return declarations.reduce(
    (nextOpeningTag, [propertyName, propertyValue]) =>
      replaceOrAppendStyleDeclaration(nextOpeningTag, propertyName, propertyValue),
    openingTag,
  );
}

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

function constrainPhotoSizingMarkup(
  html = "",
  frameHeightPx = 0,
  frameWidthPx = 0,
) {
  const safeFrameHeightPx = Number(frameHeightPx) || 0;
  const safeFrameWidthPx = Number(frameWidthPx) || 0;

  if (!(safeFrameHeightPx > 0) && !(safeFrameWidthPx > 0)) {
    return html;
  }

  const frameHeightCssValue = safeFrameHeightPx > 0 ? formatCssPixelLength(safeFrameHeightPx) : "";
  const frameWidthCssValue = safeFrameWidthPx > 0 ? formatCssPixelLength(safeFrameWidthPx) : "";
  const framePaddingCssValue = formatCssPixelLength(candidateBlockPhotoFramePaddingPx);

  return String(html || "").replace(/<(span|img)\b[^>]*>/gi, (openingTag) => {
    if (!/\bpreview-photo-(?:fit-frame|image)\b/.test(openingTag)) {
      return openingTag;
    }

    let nextOpeningTag = openingTag;
    const isImage = /\bpreview-photo-image\b/.test(openingTag);

    if (isImage) {
      return applyStyleDeclarations(nextOpeningTag, [
        ["display", "block"],
        ["height", "100%"],
        ["width", "100%"],
        ["max-height", "100%"],
        ["max-width", "100%"],
        ["object-fit", "contain"],
        ["object-position", "center center"],
        ["min-height", "0"],
        ["min-width", "0"],
      ]);
    }

    if (frameHeightCssValue) {
      nextOpeningTag = replaceOrAppendStyleDeclaration(
        replaceOrAppendStyleDeclaration(nextOpeningTag, "height", frameHeightCssValue),
        "max-height",
        frameHeightCssValue,
      );
    }

    if (frameWidthCssValue) {
      nextOpeningTag = replaceOrAppendStyleDeclaration(
        replaceOrAppendStyleDeclaration(nextOpeningTag, "width", frameWidthCssValue),
        "max-width",
        frameWidthCssValue,
      );
    }

    return applyStyleDeclarations(nextOpeningTag, [
      ["display", "flex"],
      ["align-items", "center"],
      ["justify-content", "center"],
      ["overflow", "hidden"],
      ["line-height", "0"],
      ["padding", framePaddingCssValue],
      ["box-sizing", "border-box"],
    ]);
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

function getCellColSpan(cellOpeningTag = "") {
  const colspanMatch = String(cellOpeningTag || "").match(/\scolspan\s*=\s*(["']?)(\d+)\1/i);
  const colspan = colspanMatch ? Math.round(Number(colspanMatch[2])) : 1;

  return Math.max(1, colspan || 1);
}

function getTableColumnWidthsPx(tableHtml = "") {
  const colMatches = Array.from(String(tableHtml || "").matchAll(/<col\b[^>]*>/gi));

  return colMatches
    .map((match) => getStyleWidthPx(match[0]))
    .filter((width) => width > 0);
}

function getTableWidthPx(tableHtml = "", fallbackWidthPx = 0) {
  const tableOpeningTag = String(tableHtml || "").match(/<table\b[^>]*>/i)?.[0] || "";
  const configuredWidth = getStyleWidthPx(tableOpeningTag);

  return configuredWidth > 0 ? configuredWidth : Math.max(0, Number(fallbackWidthPx) || 0);
}

function createCandidateBlockTableLayout(tableHtml = "", fallbackWidthPx = 0) {
  return {
    columnWidths: getTableColumnWidthsPx(tableHtml),
    tableWidthPx: getTableWidthPx(tableHtml, fallbackWidthPx),
  };
}

function getRowLogicalColumnCount(rowInnerHtml = "") {
  const cellMatches = Array.from(String(rowInnerHtml || "").matchAll(/<(?:td|th)\b[^>]*>/gi));
  const logicalColumnCount = cellMatches.reduce(
    (columnCount, match) => columnCount + getCellColSpan(match[0]),
    0,
  );

  return Math.max(1, logicalColumnCount || cellMatches.length || 1);
}

function getCandidateBlockCellWidthPx({
  cellOpeningTag,
  colIndex = 0,
  colSpan = 1,
  rowLogicalColumnCount = 1,
  tableLayout = {},
} = {}) {
  const configuredCellWidth = getStyleWidthPx(cellOpeningTag);

  if (configuredCellWidth > 0) {
    return configuredCellWidth;
  }

  const columnWidths = Array.isArray(tableLayout.columnWidths) ? tableLayout.columnWidths : [];
  const spannedColumnWidths = columnWidths.slice(colIndex, colIndex + Math.max(1, colSpan));
  const columnWidth = spannedColumnWidths.length === colSpan
    ? spannedColumnWidths.reduce((widthSum, width) => widthSum + (Number(width) || 0), 0)
    : 0;

  if (columnWidth > 0) {
    return columnWidth;
  }

  const tableWidthPx = Number(tableLayout.tableWidthPx) || 0;

  return tableWidthPx > 0
    ? (tableWidthPx * Math.max(1, colSpan)) / Math.max(1, rowLogicalColumnCount)
    : 0;
}

function hasConstrainablePhotoMarkup(html = "") {
  return /\bpreview-photo-fit-frame\b|\bpreview-photo-image\b/i.test(String(html || ""));
}

function getCandidateBlockTableOpeningTag(tableHtml = "") {
  return String(tableHtml || "").match(/<table\b[^>]*>/i)?.[0] || "";
}

function getCandidateBlockTableCellLayout(tableHtml = "") {
  const rowMatches = Array.from(String(tableHtml || "").matchAll(/(<tr\b[^>]*>)([\s\S]*?)(<\/tr>)/gi));
  const occupiedSlots = new Set();
  let columnCount = getTableColumnWidthsPx(tableHtml).length;
  const rows = rowMatches.map((rowMatch, rowIndex) => {
    const cellMatches = Array.from(String(rowMatch[2] || "").matchAll(/(<(td|th)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi));
    let colIndex = 0;
    const cells = cellMatches.map((cellMatch, cellIndex) => {
      while (occupiedSlots.has(`${rowIndex}:${colIndex}`)) {
        colIndex += 1;
      }

      const rowSpan = getCellRowSpan(cellMatch[1]);
      const colSpan = getCellColSpan(cellMatch[1]);
      const cellLayout = {
        cellIndex,
        colIndex,
        colSpan,
        openingTag: cellMatch[1],
        rowIndex,
        rowSpan,
      };

      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
          occupiedSlots.add(`${rowIndex + rowOffset}:${colIndex + colOffset}`);
        }
      }

      columnCount = Math.max(columnCount, colIndex + colSpan);
      colIndex += colSpan;
      return cellLayout;
    });

    columnCount = Math.max(columnCount, colIndex);
    return {
      cells,
      openingTag: rowMatch[1],
    };
  });

  return {
    columnCount: Math.max(1, columnCount || 1),
    rowCount: rows.length,
    rows,
  };
}

function getCandidateBlockTableHeightPx(tableHtml = "") {
  return getStyleHeightPx(getCandidateBlockTableOpeningTag(tableHtml));
}

function inferCandidateBlockTableRowHeightsPx(tableHtml = "", targetHeightPx = 0, tableCellLayout = null) {
  const layout = tableCellLayout || getCandidateBlockTableCellLayout(tableHtml);
  const rowCount = layout.rowCount;

  if (!rowCount) {
    return [];
  }

  const configuredRowHeights = layout.rows.map((row) => getStyleHeightPx(row.openingTag));
  const inferredRowHeights = configuredRowHeights.map((height) => (height > 0 ? height : 0));

  layout.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      const cellHeight = getStyleHeightPx(cell.openingTag);

      if (!(cellHeight > 0)) {
        return;
      }

      const spannedRowIndexes = Array.from(
        { length: Math.min(cell.rowSpan, Math.max(0, rowCount - cell.rowIndex)) },
        (_item, index) => cell.rowIndex + index,
      );

      if (!spannedRowIndexes.length) {
        return;
      }

      const flexibleRowIndexes = spannedRowIndexes.filter((rowIndex) => !(configuredRowHeights[rowIndex] > 0));

      if (flexibleRowIndexes.length) {
        const fixedHeight = spannedRowIndexes
          .filter((rowIndex) => !flexibleRowIndexes.includes(rowIndex))
          .reduce((heightSum, rowIndex) => heightSum + (Number(inferredRowHeights[rowIndex]) || 0), 0);
        const currentFlexibleHeight = flexibleRowIndexes.reduce(
          (heightSum, rowIndex) => heightSum + (Number(inferredRowHeights[rowIndex]) || 0),
          0,
        );
        const targetFlexibleHeight = Math.max(currentFlexibleHeight, cellHeight - fixedHeight);
        const flexibleRowHeight = Math.max(1, targetFlexibleHeight / flexibleRowIndexes.length);

        flexibleRowIndexes.forEach((rowIndex) => {
          inferredRowHeights[rowIndex] = Math.max(Number(inferredRowHeights[rowIndex]) || 0, flexibleRowHeight);
        });
        return;
      }

      const currentSpannedHeight = spannedRowIndexes.reduce(
        (heightSum, rowIndex) => heightSum + (Number(inferredRowHeights[rowIndex]) || 0),
        0,
      );

      if (currentSpannedHeight < cellHeight) {
        const minimumRowHeight = Math.max(1, cellHeight / spannedRowIndexes.length);

        spannedRowIndexes.forEach((rowIndex) => {
          inferredRowHeights[rowIndex] = Math.max(Number(inferredRowHeights[rowIndex]) || 0, minimumRowHeight);
        });
      }
    });
  });

  const configuredTableHeight = getCandidateBlockTableHeightPx(tableHtml);
  const fallbackTableHeight = configuredTableHeight > 0
    ? configuredTableHeight
    : targetHeightPx > 0
      ? Math.max(rowCount, targetHeightPx - collapsedCandidateBlockTableBorderPx)
      : 0;

  if (fallbackTableHeight > 0) {
    const currentTotalHeight = inferredRowHeights.reduce((heightSum, height) => heightSum + (Number(height) || 0), 0);

    if (!(currentTotalHeight > 0)) {
      const distributedHeight = fallbackTableHeight / rowCount;

      return inferredRowHeights.map(() => Math.max(1, distributedHeight));
    }

    if (currentTotalHeight < fallbackTableHeight) {
      const flexibleRowIndexes = configuredRowHeights
        .map((height, rowIndex) => (height > 0 ? -1 : rowIndex))
        .filter((rowIndex) => rowIndex >= 0);

      if (flexibleRowIndexes.length) {
        const additionalHeight = (fallbackTableHeight - currentTotalHeight) / flexibleRowIndexes.length;

        flexibleRowIndexes.forEach((rowIndex) => {
          inferredRowHeights[rowIndex] = Math.max(1, (Number(inferredRowHeights[rowIndex]) || 0) + additionalHeight);
        });
      }
    }
  }

  return inferredRowHeights;
}

function constrainCandidateBlockTablePhotoCells(tableHtml = "", targetHeightPx = 0, targetWidthPx = 0) {
  if (!hasConstrainablePhotoMarkup(tableHtml)) {
    return tableHtml;
  }

  const tableCellLayout = getCandidateBlockTableCellLayout(tableHtml);

  if (!tableCellLayout.rowCount) {
    return tableHtml;
  }

  const rowHeights = inferCandidateBlockTableRowHeightsPx(tableHtml, targetHeightPx, tableCellLayout);
  const tableLayout = createCandidateBlockTableLayout(tableHtml, targetWidthPx);
  let rowIndex = 0;

  return String(tableHtml || "").replace(/(<tr\b[^>]*>)([\s\S]*?)(<\/tr>)/gi, (
    _rowMatch,
    rowOpeningTag,
    rowInnerHtml,
    rowClosingTag,
  ) => {
    const rowLayout = tableCellLayout.rows[rowIndex] || { cells: [] };
    let cellIndex = 0;
    const nextRowInnerHtml = String(rowInnerHtml || "").replace(/(<(td|th)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (
      cellMatch,
      cellOpeningTag,
      _tagName,
      cellInnerHtml,
      cellClosingTag,
    ) => {
      const cellLayout = rowLayout.cells[cellIndex] || {};

      cellIndex += 1;

      if (!hasConstrainablePhotoMarkup(cellInnerHtml)) {
        return cellMatch;
      }

      const rowSpan = cellLayout.rowSpan || getCellRowSpan(cellOpeningTag);
      const colSpan = cellLayout.colSpan || getCellColSpan(cellOpeningTag);
      const configuredCellHeight = getStyleHeightPx(cellOpeningTag);
      const cellHeightPx = configuredCellHeight > 0
        ? configuredCellHeight
        : getSpannedCellHeightPx(cellLayout.rowIndex || rowIndex, rowSpan, rowHeights);
      const fittedCellStyle = getStyleAttributeValue(cellOpeningTag);
      const verticalPadding = getVerticalPaddingPx(fittedCellStyle);
      const photoFrameHeight = cellHeightPx > 0 ? Math.max(1, cellHeightPx - verticalPadding) : 0;
      const cellWidthPx = getCandidateBlockCellWidthPx({
        cellOpeningTag,
        colIndex: cellLayout.colIndex || 0,
        colSpan,
        rowLogicalColumnCount: tableCellLayout.columnCount,
        tableLayout,
      });
      const horizontalPadding = getHorizontalPaddingPx(fittedCellStyle);
      const photoFrameWidth = cellWidthPx > 0
        ? Math.max(1, (Number(cellWidthPx) || 0) - horizontalPadding)
        : 0;

      if (!(photoFrameHeight > 0) && !(photoFrameWidth > 0)) {
        return cellMatch;
      }

      return `${cellOpeningTag}${removePhotoSizingTrailingBreaks(
        constrainPhotoSizingMarkup(cellInnerHtml, photoFrameHeight, photoFrameWidth),
      )}${cellClosingTag}`;
    });

    rowIndex += 1;
    return `${rowOpeningTag}${nextRowInnerHtml}${rowClosingTag}`;
  });
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

function setRowCellHeights(rowInnerHtml = "", heightCssValue = "", scale = 1, rowIndex = 0, rowHeights = [], tableLayout = {}) {
  const rowLogicalColumnCount = getRowLogicalColumnCount(rowInnerHtml);
  let colIndex = 0;

  return String(rowInnerHtml || "").replace(/(<(td|th)\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (
    _match,
    cellOpeningTag,
    _tagName,
    cellInnerHtml,
    cellClosingTag,
  ) => {
    const rowspan = getCellRowSpan(cellOpeningTag);
    const colSpan = getCellColSpan(cellOpeningTag);
    const spannedHeightPx = rowspan > 1 ? getSpannedCellHeightPx(rowIndex, rowspan, rowHeights) : 0;
    const cellHeightPx = spannedHeightPx || parseCssPixelLength(heightCssValue);
    const cellHeightCssValue = spannedHeightPx > 0 ? formatCssPixelLength(spannedHeightPx) : heightCssValue;
    const nextCellOpeningTag = scaleCellVerticalPadding(
      replaceOrAppendStyleDeclaration(cellOpeningTag, "height", cellHeightCssValue),
      scale,
    );
    const fittedCellStyle = getStyleAttributeValue(nextCellOpeningTag);
    const verticalPadding = getVerticalPaddingPx(fittedCellStyle);
    const photoFrameHeight = Math.max(
      1,
      (Number(cellHeightPx) || 0) - verticalPadding,
    );
    const cellWidthPx = getCandidateBlockCellWidthPx({
      cellOpeningTag: nextCellOpeningTag,
      colIndex,
      colSpan,
      rowLogicalColumnCount,
      tableLayout,
    });
    const horizontalPadding = getHorizontalPaddingPx(fittedCellStyle);
    const photoFrameWidth = cellWidthPx > 0
      ? Math.max(1, (Number(cellWidthPx) || 0) - horizontalPadding)
      : 0;
    const fittedCellInnerHtml = removePhotoSizingTrailingBreaks(
      constrainPhotoSizingMarkup(
        scaleImageHeightAttributes(cellInnerHtml, scale),
        photoFrameHeight,
        photoFrameWidth,
      ),
    );

    colIndex += colSpan;
    return `${nextCellOpeningTag}${fittedCellInnerHtml}${cellClosingTag}`;
  });
}

function fitCandidateBlockTableRowsToHeight(tableHtml = "", targetHeightPx = 0, targetWidthPx = 0) {
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
  const tableLayout = createCandidateBlockTableLayout(tableHtml, targetWidthPx);
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
      tableLayout,
    )}${closingTag}`;
  });
}

function fitCandidateBlockTablesToBlock(blockTemplateHtml = "", blockSize = {}) {
  const targetHeightPx = Number(blockSize.heightPx) || 0;
  const targetWidthPx = Number(blockSize.widthPx) || 0;

  return String(blockTemplateHtml || "").replace(/<table\b[\s\S]*?<\/table>/gi, (tableHtml) => {
    const fittedTableHtml = targetHeightPx > 0
      ? fitCandidateBlockTableRowsToHeight(tableHtml, targetHeightPx, targetWidthPx)
      : tableHtml;

    return constrainCandidateBlockTablePhotoCells(fittedTableHtml, targetHeightPx, targetWidthPx);
  });
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
