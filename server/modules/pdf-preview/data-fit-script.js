const dataFitMinimumFontSizePt = 5;
const dataFitBaseTolerancePx = 1.25;
const dataFitMaxHeightTolerancePx = 4;
const dataFitRowspanToleranceStepPx = 0.75;
const dataFitIntrinsicHeightTolerancePx = 8;

function getPreviewDataFitHeightTolerancePx(rowSpan = 1) {
  const safeRowSpan = Math.max(1, Math.round(Number(rowSpan)) || 1);

  return Math.min(dataFitMaxHeightTolerancePx, dataFitBaseTolerancePx + safeRowSpan * dataFitRowspanToleranceStepPx);
}

function getPreviewDataFitScript() {
  return `
          <script>
            (() => {
              const fitSelector = "[data-template-data-fit='true'], .template-data-fit";
              const cssPixelsPerPoint = 96 / 72;
              const minimumFontSizePx = ${dataFitMinimumFontSizePt} * cssPixelsPerPoint;
              const tolerancePx = ${dataFitBaseTolerancePx};
              const intrinsicHeightTolerancePx = ${dataFitIntrinsicHeightTolerancePx};

              function parseCssLength(value) {
                const match = String(value || "").trim().match(/^(-?\\d+(?:\\.\\d+)?)(px|pt)?$/i);

                if (!match) {
                  return 0;
                }

                const numberValue = Number(match[1]);

                if (!Number.isFinite(numberValue) || numberValue <= 0) {
                  return 0;
                }

                return String(match[2] || "px").toLowerCase() === "pt" ? numberValue * cssPixelsPerPoint : numberValue;
              }

              function formatPx(value) {
                const roundedValue = Math.round((Number(value) || 0) * 100) / 100;

                return (Number.isInteger(roundedValue) ? String(roundedValue) : String(roundedValue).replace(/0+$/, "").replace(/\\.$/, "")) + "px";
              }

              function getDeclaredHeightPx(element) {
                if (!(element instanceof HTMLElement)) {
                  return 0;
                }

                const inlineHeight = parseCssLength(element.style.getPropertyValue("height"));

                if (inlineHeight > 0) {
                  return inlineHeight;
                }

                return parseCssLength(element.getAttribute("height"));
              }

              function getRowFallbackHeightPx(row) {
                if (!(row instanceof HTMLTableRowElement)) {
                  return 0;
                }

                return Array.from(row.cells || []).reduce((height, cell) => {
                  const rowSpan = Math.max(1, Math.round(Number(cell.rowSpan)) || 1);
                  const cellHeight = getDeclaredHeightPx(cell);

                  return cellHeight > 0 ? Math.max(height, cellHeight / rowSpan) : height;
                }, 0);
              }

              function getSpannedRowHeightPx(cell) {
                const row = cell instanceof HTMLTableCellElement ? cell.parentElement : null;
                const section = row?.parentElement;
                const rows = Array.from(section?.rows || cell.closest("table")?.rows || []);
                const rowIndex = rows.indexOf(row);
                const rowSpan = Math.max(1, Math.round(Number(cell.rowSpan)) || 1);

                if (rowIndex < 0) {
                  return 0;
                }

                let height = 0;

                for (let index = rowIndex; index < Math.min(rows.length, rowIndex + rowSpan); index += 1) {
                  const rowHeight = getDeclaredHeightPx(rows[index]) || getRowFallbackHeightPx(rows[index]);

                  if (!(rowHeight > 0)) {
                    return 0;
                  }

                  height += rowHeight;
                }

                return height;
              }

              function getTableDeclaredRowsHeightPx(table) {
                const rows = Array.from(table?.rows || []);

                if (!rows.length) {
                  return 0;
                }

                return rows.reduce((height, row) => {
                  const rowHeight = getDeclaredHeightPx(row) || getRowFallbackHeightPx(row);

                  return rowHeight > 0 ? height + rowHeight : height;
                }, 0);
              }

              function shouldUseRenderedTableLayoutHeight(cell, targetHeightPx) {
                const table = cell?.closest?.("table") || null;
                const tableHeight = getDeclaredHeightPx(table);
                const renderedCellHeight = cell?.getBoundingClientRect?.().height || 0;

                if (!(renderedCellHeight > targetHeightPx + tolerancePx)) {
                  return false;
                }

                const renderedTableHeight = table.getBoundingClientRect?.().height || 0;
                const declaredRowsHeight = getTableDeclaredRowsHeightPx(table);
                const isCandidateBlockTableLayout = Boolean(table?.closest?.(".preview-candidate-block"));
                const renderedTableLayoutExpanded =
                  isCandidateBlockTableLayout && renderedTableHeight > declaredRowsHeight + tolerancePx;
                const declaredTableLayoutExpanded =
                  tableHeight > 0 && tableHeight > declaredRowsHeight + tolerancePx;

                return (
                  declaredRowsHeight > 0 &&
                  renderedTableHeight > 0 &&
                  (declaredTableLayoutExpanded || renderedTableLayoutExpanded)
                );
              }

              function getComputedPixelValue(value) {
                const parsedValue = parseFloat(value);

                return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
              }

              function getCellVerticalBoxHeightPx(cell) {
                const computedStyle = window.getComputedStyle(cell);

                return (
                  getComputedPixelValue(computedStyle.paddingTop) +
                  getComputedPixelValue(computedStyle.paddingBottom) +
                  getComputedPixelValue(computedStyle.borderTopWidth) +
                  getComputedPixelValue(computedStyle.borderBottomWidth)
                );
              }

              function getCellSingleLineContentHeightPx(cell) {
                return Array.from(cell.querySelectorAll(fitSelector)).reduce((height, element) => {
                  if (!(element instanceof HTMLElement)) {
                    return height;
                  }

                  const computedStyle = window.getComputedStyle(element);
                  const fontSize = getComputedPixelValue(computedStyle.fontSize);
                  const lineHeight = getComputedPixelValue(computedStyle.lineHeight) || fontSize * 1.2;

                  return Math.max(height, lineHeight);
                }, 0);
              }

              function shouldUseRenderedIntrinsicHeight(cell, targetHeightPx) {
                const renderedCellHeight = cell?.getBoundingClientRect?.().height || 0;

                if (!(renderedCellHeight > targetHeightPx + tolerancePx)) {
                  return false;
                }

                const intrinsicSingleLineHeight = getCellVerticalBoxHeightPx(cell) + getCellSingleLineContentHeightPx(cell);

                return (
                  intrinsicSingleLineHeight > targetHeightPx + tolerancePx &&
                  renderedCellHeight <= intrinsicSingleLineHeight + intrinsicHeightTolerancePx &&
                  cell.scrollHeight <= cell.clientHeight + tolerancePx
                );
              }

              function shouldUseRenderedCellHeight(cell, targetHeightPx) {
                return (
                  shouldUseRenderedTableLayoutHeight(cell, targetHeightPx) ||
                  shouldUseRenderedIntrinsicHeight(cell, targetHeightPx)
                );
              }

              function getCellTargetHeightPx(cell) {
                const cellHeight = getDeclaredHeightPx(cell);
                const spannedRowHeight = getSpannedRowHeightPx(cell);
                const targetHeight = Math.max(cellHeight, spannedRowHeight);

                if (targetHeight > 0 && shouldUseRenderedCellHeight(cell, targetHeight)) {
                  return Math.max(targetHeight, cell.getBoundingClientRect().height || 0);
                }

                return targetHeight;
              }

              function getCellFitHeightTolerancePx(cell) {
                const rowSpan = Math.max(1, Math.round(Number(cell?.rowSpan)) || 1);

                // Rowspanned cells accumulate collapsed-border and fractional row rounding differences.
                return Math.min(${dataFitMaxHeightTolerancePx}, tolerancePx + rowSpan * ${dataFitRowspanToleranceStepPx});
              }

              function getBaseNumber(element, attributeName, fallback) {
                const savedValue = Number(element.getAttribute(attributeName));

                if (Number.isFinite(savedValue) && savedValue > 0) {
                  return savedValue;
                }

                return fallback;
              }

              function getSavedCellTargetHeightPx(cell) {
                return getBaseNumber(cell, "data-template-data-fit-target-height", 0);
              }

              function getFitItems(cell) {
                return Array.from(cell.querySelectorAll(fitSelector))
                  .filter((element) => element instanceof HTMLElement)
                  .map((element) => {
                    const computedStyle = window.getComputedStyle(element);
                    const baseFontSize = getBaseNumber(
                      element,
                      "data-template-data-fit-base-font-size",
                      parseFloat(computedStyle.fontSize) || parseFloat(window.getComputedStyle(cell).fontSize) || 12,
                    );
                    const baseLineHeight = getBaseNumber(
                      element,
                      "data-template-data-fit-base-line-height",
                      parseFloat(computedStyle.lineHeight) || baseFontSize * 1.2,
                    );

                    element.setAttribute("data-template-data-fit-base-font-size", String(baseFontSize));
                    element.setAttribute("data-template-data-fit-base-line-height", String(baseLineHeight));

                    return {
                      baseFontSize,
                      baseLineHeight,
                      element,
                    };
                  });
              }

              function applyScale(items, scale) {
                items.forEach((item) => {
                  const fontSize = Math.max(minimumFontSizePx, item.baseFontSize * scale);
                  const effectiveScale = item.baseFontSize > 0 ? fontSize / item.baseFontSize : scale;
                  const lineHeight = Math.max(1, item.baseLineHeight * effectiveScale);

                  item.element.style.fontSize = fontSize <= minimumFontSizePx ? "5pt" : formatPx(fontSize);
                  item.element.style.lineHeight = formatPx(lineHeight);
                });
              }

              function cellFits(cell, targetHeightPx) {
                const rectHeight = cell.getBoundingClientRect().height;
                const heightTolerancePx = getCellFitHeightTolerancePx(cell);

                if (
                  rectHeight > targetHeightPx + heightTolerancePx &&
                  !shouldUseRenderedTableLayoutHeight(cell, targetHeightPx)
                ) {
                  return false;
                }

                return cell.scrollHeight <= cell.clientHeight + tolerancePx;
              }

              function dataItemsFitOnSingleLine(cell, items) {
                const cellRect = cell.getBoundingClientRect();
                return items.every(({ element }) => {
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
                  if (!rects.length) return true;
                  // Multiple fragments on the same line (e.g. bidi text) are valid.
                  const first = rects[0];
                  return rects.every((rect) =>
                    Math.abs(first.top - rect.top) <= 0.5 &&
                    rect.left >= cellRect.left - 0.1 && rect.right <= cellRect.right + 0.1
                  );
                });
              }

              function fitCandidateDataCell(cell) {
                const items = getFitItems(cell);
                if (!items.length) return;
                applyScale(items, 1);
                if (dataItemsFitOnSingleLine(cell, items)) return;

                // Test the actual 5pt floor first, including fonts larger than 20pt.
                // Keep natural wrapping when even the minimum cannot fit.
                applyScale(items, 0);
                if (!dataItemsFitOnSingleLine(cell, items)) return;

                let low = 0;
                let high = 1;
                for (let index = 0; index < 16; index += 1) {
                  const mid = (low + high) / 2;
                  applyScale(items, mid);
                  if (dataItemsFitOnSingleLine(cell, items)) low = mid;
                  else high = mid;
                }
                applyScale(items, low);
              }

              function fitCell(cell) {
                if (!(cell instanceof HTMLTableCellElement)) {
                  return;
                }

                if (cell.closest(".preview-candidate-block")) {
                  fitCandidateDataCell(cell);
                  return;
                }

                const targetHeightPx = Math.max(getSavedCellTargetHeightPx(cell), getCellTargetHeightPx(cell));

                if (!(targetHeightPx > 0)) {
                  return;
                }

                const items = getFitItems(cell);

                if (!items.length) {
                  return;
                }

                cell.classList.add("preview-data-fit-cell");
                cell.setAttribute("data-template-data-fit-target-height", String(targetHeightPx));
                cell.style.height = formatPx(targetHeightPx);
                cell.style.maxHeight = formatPx(targetHeightPx);
                cell.style.overflow = "hidden";

                applyScale(items, 1);

                if (cellFits(cell, targetHeightPx)) {
                  return;
                }

                let low = 0.25;
                let high = 1;

                for (let index = 0; index < 12; index += 1) {
                  const mid = (low + high) / 2;

                  applyScale(items, mid);

                  if (cellFits(cell, targetHeightPx)) {
                    low = mid;
                  } else {
                    high = mid;
                  }
                }

                applyScale(items, low);
              }

              function fitTemplateDataCells(root = document) {
                const cells = Array.from(root.querySelectorAll(fitSelector))
                  .map((element) => element.closest("td, th"))
                  .filter((cell, index, list) => cell instanceof HTMLTableCellElement && list.indexOf(cell) === index);

                for (let pass = 0; pass < 3; pass += 1) {
                  cells.forEach(fitCell);
                }
              }

              function scheduleFit() {
                window.requestAnimationFrame(() => fitTemplateDataCells(document));
              }

              window.ExamListPreviewDataFit = Object.freeze({ fit: fitTemplateDataCells });

              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", scheduleFit, { once: true });
              } else {
                scheduleFit();
              }

              window.addEventListener("load", scheduleFit, { once: true });

              if (document.fonts?.ready) {
                document.fonts.ready.then(scheduleFit).catch(() => {});
              }
            })();
          </script>
        `;
}

module.exports = {
  getPreviewDataFitHeightTolerancePx,
  getPreviewDataFitScript,
};
