const { evaluate } = require("./cdp-core");
const { getBrowserPoint } = require("./browser-input");

async function getEditorTableMetrics(client) {
  return JSON.parse(
    await evaluate(
      client,
      `
        JSON.stringify((() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const columns = [...(table?.querySelectorAll('colgroup col') || [])].map((column) => {
            const styleWidth = Number.parseFloat(String(column.style.width || '').replace('px', ''));
            const measuredWidth = Math.round(column.getBoundingClientRect?.().width || 0);

            return Number.isFinite(styleWidth) && styleWidth > 0 ? styleWidth : measuredWidth;
          });
          const rows = [...(table?.rows || [])].map((row) =>
            [...row.cells].map((cell) => Math.round(cell.getBoundingClientRect().width))
          );
          const cellMap = table && window.ExamListEditorTableUtils?.buildTemplateTableCellMap
            ? window.ExamListEditorTableUtils.buildTemplateTableCellMap(table)
            : null;
          const logicalColumnCount = cellMap
            ? cellMap.matrix.reduce((maxCount, row) => Math.max(maxCount, row?.length || 0), 0)
            : 0;
          const columnCellHeights = cellMap
            ? Array.from({ length: logicalColumnCount }, (_item, columnIndex) => {
                const seenCells = new Set();
                const heights = [];

                cellMap.matrix.forEach((row) => {
                  const cell = row?.[columnIndex] || null;

                  if (!cell || seenCells.has(cell)) {
                    return;
                  }

                  seenCells.add(cell);
                  heights.push(Math.round(cell.getBoundingClientRect().height));
                });

                return heights;
              })
            : [];
          const logicalRowCellWidths = cellMap
            ? cellMap.matrix.map((row) => {
                const seenCells = new Set();
                const widths = [];

                (row || []).forEach((cell) => {
                  if (!cell || seenCells.has(cell)) {
                    return;
                  }

                  seenCells.add(cell);
                  widths.push(Math.round(cell.getBoundingClientRect().width));
                });

                return widths;
              })
            : [];

          return {
            columnCount: columns.length,
            columnTotal: columns.reduce((sum, width) => sum + width, 0),
            columnCellHeights,
            columnHeightTotals: columnCellHeights.map((heights) => heights.reduce((sum, height) => sum + height, 0)),
            columns,
            logicalRowCellWidths,
            rows,
            tableHeight: Math.round(table?.getBoundingClientRect().height || 0),
            tableStyleWidth: table?.style?.width || "",
            tableWidth: Math.round(table?.getBoundingClientRect().width || 0)
          };
        })())
      `,
    ),
  );
}

async function getEditorTableCellBoundaryPoint(client, rowNumber, cellNumber, description) {
  return getBrowserPoint(
    client,
    `(() => {
      const cell = document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(${rowNumber}) td:nth-child(${cellNumber})');
      const rect = cell?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.right - 2, y: rect.top + rect.height / 2 };
    })()`,
    description,
  );
}

async function getEditorTableLogicalCellBoundaryPoint(client, rowNumber, columnNumber, description) {
  return getBrowserPoint(
    client,
    `(() => {
      const table = document.querySelector('#templateEditorSurface .template-doc table');
      const cellMap = table && window.ExamListEditorTableUtils?.buildTemplateTableCellMap
        ? window.ExamListEditorTableUtils.buildTemplateTableCellMap(table)
        : null;
      const cell = cellMap?.matrix?.[${rowNumber - 1}]?.[${columnNumber - 1}] || null;
      const rect = cell?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.right - 2, y: rect.top + rect.height / 2 };
    })()`,
    description,
  );
}

async function getEditorTableCellRowBoundaryPoint(client, rowNumber, cellNumber, description) {
  return getBrowserPoint(
    client,
    `(() => {
      const cell = document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(${rowNumber}) td:nth-child(${cellNumber})');
      const rect = cell?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.bottom - 2 };
    })()`,
    description,
  );
}

async function getEditorTableLogicalCellRowBoundaryPoint(client, rowNumber, columnNumber, description) {
  return getBrowserPoint(
    client,
    `(() => {
      const table = document.querySelector('#templateEditorSurface .template-doc table');
      const cellMap = table && window.ExamListEditorTableUtils?.buildTemplateTableCellMap
        ? window.ExamListEditorTableUtils.buildTemplateTableCellMap(table)
        : null;
      const cell = cellMap?.matrix?.[${rowNumber - 1}]?.[${columnNumber - 1}] || null;
      const rect = cell?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.bottom - 2 };
    })()`,
    description,
  );
}

module.exports = {
  getEditorTableCellBoundaryPoint,
  getEditorTableCellRowBoundaryPoint,
  getEditorTableLogicalCellBoundaryPoint,
  getEditorTableLogicalCellRowBoundaryPoint,
  getEditorTableMetrics,
};
