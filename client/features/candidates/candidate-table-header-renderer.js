import { escapeHtml } from "../../app/html-utils.js";
import {
  getCandidateTableState,
} from "./candidate-table-model.js";

export function renderUploadHeaderAction(hasCandidateManagement, canManageCandidates = hasCandidateManagement) {
  return `
    <div class="table-header-actions">
      <button class="outline-button" data-action="download-candidates" type="button">다운로드</button>
      ${
        hasCandidateManagement
          ? `<button class="primary-button" data-action="open-candidate-upload-modal" type="button" ${canManageCandidates ? "" : "disabled"}>데이터 업로드</button>`
          : ""
      }
    </div>
  `;
}

export function renderTableHeaderCell(column, candidates = {}) {
  const tableState = getCandidateTableState(candidates);
  const [sortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];
  const isSorted = sortRule?.key === column.key;
  const direction = isSorted && sortRule.direction === "desc" ? "desc" : "asc";
  const selectedCount = (tableState.filters?.[column.key] || []).length;
  const sortIcon = isSorted
    ? `<span class="table-sort-arrow">${direction === "desc" ? "&darr;" : "&uarr;"}</span><span class="table-sort-order table-sort-order-hidden"></span>`
    : `<span class="table-sort-arrow">&#8597;</span><span class="table-sort-order table-sort-order-hidden"></span>`;
  const classNames = [
    "table-header-enhanced",
    `table-column-${escapeHtml(column.key)}`,
    isSorted ? `sorted-${direction}` : "",
    selectedCount ? "filter-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <th class="${classNames}">
      <div class="table-header-shell has-filter">
        <button
          class="table-sort-button"
          data-candidate-grid-sort="${escapeHtml(column.key)}"
          type="button"
        >
          <span class="table-header-label">${escapeHtml(column.label)}</span>
          <span class="table-sort-icon" aria-hidden="true">${sortIcon}</span>
        </button>
        <button
          class="table-filter-button"
          data-candidate-grid-filter="${escapeHtml(column.key)}"
          title="${escapeHtml(column.label)} 필터"
          type="button"
        >
          <span class="table-filter-glyph" aria-hidden="true"></span>
        </button>
      </div>
    </th>
  `;
}
