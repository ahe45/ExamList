import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  candidateGridColumns,
  getCandidateVisibleRows,
  normalizeCandidateValue,
} from "./candidate-table-model.js";

function renderCandidateCell(item = {}, column = {}) {
  if (column.key === "hasPhoto") {
    const hasPhoto = normalizeCandidateValue(item, "hasPhoto") === "O";

    return `<td class="table-column-hasPhoto table-photo-cell ${hasPhoto ? "available" : "missing"}">${hasPhoto ? "O" : "X"}</td>`;
  }

  const value = normalizeCandidateValue(item, column.key);
  const className = column.key === "examineeNo" ? "table-cell-text strong" : "table-cell-text";

  return `
    <td class="table-column-${escapeHtml(column.key)}">
      <span class="${className}" data-grid-cell-tooltip>${escapeHtml(value || "-")}</span>
    </td>
  `;
}

export function renderCandidateRows(candidates = {}, canManageCandidates = false) {
  const { startRowNumber, visibleRows } = getCandidateVisibleRows(candidates);

  if (!visibleRows.length) {
    return `
      <tr class="table-empty-row">
        <td class="table-empty-cell" colspan="${candidateGridColumns.length + 1}">표시할 수험생 데이터가 없습니다.</td>
      </tr>
    `;
  }

  return visibleRows
    .map((item, index) => {
      const rowAttributes = canManageCandidates
        ? `class="is-clickable" data-candidate-row-id="${escapeHtml(item.id || "")}" data-grid-row-clickable="true"`
        : "";

      return `
        <tr ${rowAttributes}>
          <td class="row-number-col">${formatCount(startRowNumber + index)}</td>
          ${candidateGridColumns.map((column) => renderCandidateCell(item, column)).join("")}
        </tr>
      `;
    })
    .join("");
}
