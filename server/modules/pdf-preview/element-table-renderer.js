const { getRowsPerPage } = require("./pagination");
const {
  buildCandidateTokenMap,
  evaluateTokenExpression,
  formatDatePattern,
  normalizeDisplayValue,
  resolveDataPath,
} = require("./tokens");
const { buildAbsoluteStyle, escapeHtml } = require("./element-helpers");
const { renderPhotoCell } = require("./element-image-renderer");
const { buildRoomTokenMap } = require("./room-context");

function renderDataFitCellText(value) {
  return `<span class="template-data-fit" data-template-data-fit="true">${escapeHtml(value)}</span>`;
}

function renderTableCell(column, cellContext, rowEntry) {
  const keyExpression = String(column.key || "");
  const isOtherRoomPageToken = cellContext?.__isOtherRoomPage === true && keyExpression.trim() === "room.otherRoom";

  if (rowEntry.isEmpty && !isOtherRoomPageToken) {
    return "&nbsp;";
  }

  if (column.type === "photo") {
    return renderPhotoCell(rowEntry.candidate);
  }

  if (column.type === "checkbox") {
    return '<span class="preview-checkbox">□</span>';
  }

  if (keyExpression.includes("|")) {
    return renderDataFitCellText(evaluateTokenExpression(keyExpression, cellContext));
  }

  const value = resolveDataPath(cellContext, keyExpression);

  if (column.format) {
    return renderDataFitCellText(formatDatePattern(value, column.format));
  }

  return renderDataFitCellText(normalizeDisplayValue(value));
}

function renderTableElement(element, pageInstance, baseContext) {
  const columns = Array.isArray(element.config?.columns) ? element.config.columns : [];
  const pagination = element.config?.pagination || {};
  const rowsPerPage = pageInstance.rowsPerPage || getRowsPerPage(element);
  const fillEmptyRows = Boolean(pagination.fillEmptyRows);
  const rows = pageInstance.rows.map((candidate, index) => ({
    candidate,
    isEmpty: false,
    rowNumber: pageInstance.rowOffset + index + 1,
  }));

  if (fillEmptyRows && rowsPerPage > rows.length) {
    for (let index = rows.length; index < rowsPerPage; index += 1) {
      rows.push({
        candidate: null,
        isEmpty: true,
        rowNumber: 0,
      });
    }
  }

  return `
    <div
      class="preview-element preview-table-wrap"
      style="${buildAbsoluteStyle(element)}"
    >
      <table class="preview-table">
        <thead>
          <tr>
            ${columns
              .map(
                (column) => `
                  <th style="width:${Number(column.width) || 0}pt;text-align:${escapeHtml(column.align || "center")};">
                    ${escapeHtml(column.label || column.key || "")}
                  </th>
                `,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((rowEntry, rowIndex) => {
              const rowContext = {
                ...baseContext,
                candidate: buildCandidateTokenMap(rowEntry.candidate || {}, baseContext.school),
                room: {
                  ...buildRoomTokenMap(rowEntry.candidate || {}, baseContext._roomAssignmentCountMap),
                  otherRoom: baseContext.room?.otherRoom || "",
                },
                row: {
                  index: rowEntry.isEmpty ? "" : rowEntry.rowNumber,
                  indexInPage: rowEntry.isEmpty ? "" : rowIndex + 1,
                  indexInUnit: rowEntry.isEmpty ? "" : rowEntry.rowNumber,
                },
              };

              return `
                <tr style="height:${Number(pagination.rowHeight) || 42}pt;">
                  ${columns
                    .map((column) => {
                      const isPhotoCell = column.type === "photo";

                      return `
                        <td${isPhotoCell ? ' class="preview-photo-token-cell"' : ""} style="text-align:${escapeHtml(column.align || "center")};">
                          ${renderTableCell(column, rowContext, rowEntry)}
                        </td>
                      `;
                    })
                    .join("")}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

module.exports = {
  renderTableElement,
};
