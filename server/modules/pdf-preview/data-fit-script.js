function getPreviewDataFitScript() {
  return `
          <script>
            (() => {
              const fitSelector = "[data-template-data-fit='true'], .template-data-fit";
              const cssPixelsPerPoint = 96 / 72;
              const minimumFontSizePx = 5;
              const tolerancePx = 1.25;

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

              function getCellTargetHeightPx(cell) {
                const cellHeight = getDeclaredHeightPx(cell);

                if (cellHeight > 0) {
                  return cellHeight;
                }

                return getSpannedRowHeightPx(cell);
              }

              function getBaseNumber(element, attributeName, fallback) {
                const savedValue = Number(element.getAttribute(attributeName));

                if (Number.isFinite(savedValue) && savedValue > 0) {
                  return savedValue;
                }

                return fallback;
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
                  const lineHeight = Math.max(fontSize * 1.05, item.baseLineHeight * scale);

                  item.element.style.fontSize = formatPx(fontSize);
                  item.element.style.lineHeight = formatPx(lineHeight);
                });
              }

              function cellFits(cell, targetHeightPx) {
                const rectHeight = cell.getBoundingClientRect().height;

                if (rectHeight > targetHeightPx + tolerancePx) {
                  return false;
                }

                return cell.scrollHeight <= cell.clientHeight + tolerancePx;
              }

              function fitCell(cell) {
                if (!(cell instanceof HTMLTableCellElement)) {
                  return;
                }

                const targetHeightPx = getCellTargetHeightPx(cell);

                if (!(targetHeightPx > 0)) {
                  return;
                }

                const items = getFitItems(cell);

                if (!items.length) {
                  return;
                }

                cell.classList.add("preview-data-fit-cell");
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
  getPreviewDataFitScript,
};
