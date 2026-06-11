import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  filterPdfGenerationArtifactFilterOptionValues,
  getPdfGenerationArtifactFilterOptionValues,
  getPdfGenerationArtifactTableState,
  getPdfGenerationArtifactVisibleRows,
  pdfGenerationArtifactGridColumns,
  pdfGenerationArtifactPageSizeOptions,
} from "./pdf-generation-artifact-table-model.js";

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_item, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export function renderPdfGenerationArtifactHeaderCell(column, pdfGenerations = {}) {
  const tableState = getPdfGenerationArtifactTableState(pdfGenerations);
  const [sortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];
  const isSortable = column.sortable !== false;
  const isFilterable = column.filterable !== false;
  const isSorted = isSortable && sortRule?.key === column.key;
  const direction = isSorted && sortRule.direction === "desc" ? "desc" : "asc";
  const selectedCount = isFilterable ? (tableState.filters?.[column.key] || []).length : 0;
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
      <div class="table-header-shell ${isFilterable ? "has-filter" : ""}">
        ${
          isSortable
            ? `
              <button
                class="table-sort-button"
                data-pdf-generation-artifact-grid-sort="${escapeHtml(column.key)}"
                type="button"
              >
                <span class="table-header-label">${escapeHtml(column.label)}</span>
                <span class="table-sort-icon" aria-hidden="true">${sortIcon}</span>
              </button>
            `
            : `<span class="table-header-label">${escapeHtml(column.label)}</span>`
        }
        ${
          isFilterable
            ? `
              <button
                class="table-filter-button"
                data-pdf-generation-artifact-grid-filter="${escapeHtml(column.key)}"
                title="${escapeHtml(column.label)} 필터"
                type="button"
              >
                <span class="table-filter-glyph" aria-hidden="true"></span>
              </button>
            `
            : ""
        }
      </div>
    </th>
  `;
}

export function renderPdfGenerationArtifactFilterSelectAll(columnKey = "", isAllVisibleSelected = false) {
  return `
    <label class="table-filter-option table-filter-option-all table-filter-option-select-all">
      <input
        data-pdf-generation-artifact-filter-select-all
        data-filter-key="${escapeHtml(columnKey)}"
        ${isAllVisibleSelected ? "checked" : ""}
        type="checkbox"
      />
      <span>전체 선택</span>
    </label>
  `;
}

export function renderPdfGenerationArtifactFilterOptions(columnKey = "", visibleOptionValues = [], selectedValues = new Set()) {
  return visibleOptionValues.length
    ? visibleOptionValues
        .map(
          (value) => `
            <label class="table-filter-option">
              <input
                data-pdf-generation-artifact-filter-option
                data-filter-key="${escapeHtml(columnKey)}"
                data-filter-value="${escapeHtml(value)}"
                ${selectedValues.has(String(value || "")) ? "checked" : ""}
                type="checkbox"
              />
              <span>${escapeHtml(value)}</span>
            </label>
          `,
        )
        .join("")
    : `<p class="table-filter-empty">표시할 필터 값이 없습니다.</p>`;
}

export function renderPdfGenerationArtifactFilterMenu(pdfGenerations = {}) {
  const tableState = getPdfGenerationArtifactTableState(pdfGenerations);
  const columnKey = String(tableState.filterMenuKey || "");
  const column = pdfGenerationArtifactGridColumns.find((item) => item.key === columnKey);

  if (!column || column.filterable === false) {
    return "";
  }

  const optionValues = getPdfGenerationArtifactFilterOptionValues(pdfGenerations, columnKey);
  const visibleOptionValues = filterPdfGenerationArtifactFilterOptionValues(optionValues, tableState.filterMenuSearch);
  const selectedValues = new Set((tableState.filters?.[columnKey] || []).map((value) => String(value || "")));
  const isAllVisibleSelected =
    visibleOptionValues.length > 0 && visibleOptionValues.every((value) => selectedValues.has(String(value || "")));
  const position = tableState.filterMenuPosition || {};
  const top = Number.isFinite(Number(position.top)) ? Math.max(12, Number(position.top)) : 118;
  const left = Number.isFinite(Number(position.left)) ? Math.max(12, Number(position.left)) : 32;

  return `
    <div class="table-filter-menu-overlay" data-action="close-pdf-generation-artifact-filter-menu"></div>
    <div
      class="table-filter-menu pdf-generation-artifact-filter-menu workmate-dashboard-filter-menu"
      role="dialog"
      aria-label="${escapeHtml(column.label)} 필터"
      style="top: ${top}px; left: ${left}px;"
    >
      <div class="table-filter-menu-head">
        <strong>${escapeHtml(column.label)}</strong>
        <button class="table-filter-close-button" data-action="close-pdf-generation-artifact-filter-menu" type="button" aria-label="필터 닫기">×</button>
      </div>
      <label class="table-filter-search">
        <input
          data-pdf-generation-artifact-filter-search-input
          placeholder="옵션 검색"
          type="search"
          value="${escapeHtml(tableState.filterMenuSearch || "")}"
        />
      </label>
      <div class="table-filter-select-all">
        ${renderPdfGenerationArtifactFilterSelectAll(columnKey, isAllVisibleSelected)}
      </div>
      <div class="table-filter-options table-filter-option-list">
        ${renderPdfGenerationArtifactFilterOptions(columnKey, visibleOptionValues, selectedValues)}
      </div>
      <div class="table-filter-menu-footer">
        <button
          class="table-filter-footer-button subtle"
          data-action="clear-pdf-generation-artifact-filter"
          data-filter-key="${escapeHtml(columnKey)}"
          type="button"
        >
          초기화
        </button>
        <button class="table-filter-footer-button" data-action="close-pdf-generation-artifact-filter-menu" type="button">적용</button>
      </div>
    </div>
  `;
}

function renderPdfGenerationArtifactPagePicker(currentPage, totalPages) {
  return `
    <span class="page-picker-group">
      <span class="table-pagination-divider" aria-hidden="true"></span>
      <label class="page-picker">
        <select class="page-picker-select" data-pdf-generation-artifact-grid-page-picker aria-label="페이지 이동">
          ${Array.from({ length: totalPages }, (_item, index) => {
            const page = index + 1;

            return `<option value="${page}" ${page === currentPage ? "selected" : ""}>${formatCount(page)}</option>`;
          }).join("")}
        </select>
        <span class="page-picker-label">page</span>
      </label>
    </span>
  `;
}

export function renderPdfGenerationArtifactPagination(pdfGenerations = {}) {
  const tableState = getPdfGenerationArtifactTableState(pdfGenerations);
  const { currentPage, endRowNumber, rows, startRowNumber, totalPages } = getPdfGenerationArtifactVisibleRows(pdfGenerations);
  const pageSize = Math.max(0, Number(tableState.pageSize) || 0);
  const pageSizeLabel = pageSize > 0 ? `${formatCount(pageSize)}개` : "모두 표시";
  const pages = getPaginationPages(currentPage, totalPages);

  return `
    <div class="table-pagination">
      <div class="table-page-size">
        <span>표시 개수</span>
        <div class="table-page-size-select">
          <button
            aria-expanded="${tableState.pageSizeMenuOpen ? "true" : "false"}"
            aria-haspopup="listbox"
            class="page-size-trigger"
            data-pdf-generation-artifact-page-size-trigger
            type="button"
          >
            <span>${escapeHtml(pageSizeLabel)}</span>
            <span class="page-size-caret" aria-hidden="true"></span>
          </button>
          ${
            tableState.pageSizeMenuOpen
              ? `
                <div class="page-size-menu" role="listbox" aria-label="표시 개수">
                  ${pdfGenerationArtifactPageSizeOptions
                    .map(
                      (option) => `
                        <button
                          class="page-size-option ${Number(tableState.pageSize) === option ? "active" : ""}"
                          data-pdf-generation-artifact-page-size-option="${option}"
                          role="option"
                          aria-selected="${Number(tableState.pageSize) === option ? "true" : "false"}"
                          type="button"
                        >
                          ${option > 0 ? `${formatCount(option)}개` : "모두 표시"}
                        </button>
                      `,
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </div>
      </div>
      <div class="table-pagination-actions">
        <button
          class="page-btn"
          data-pdf-generation-artifact-grid-nav="prev"
          data-pdf-generation-artifact-grid-page="${Math.max(1, currentPage - 1)}"
          ${currentPage <= 1 ? "disabled" : ""}
          type="button"
        >이전</button>
        ${pages
          .map((page, index) => {
            const previousPage = pages[index - 1];
            const ellipsis = typeof previousPage === "number" && page - previousPage > 1
              ? '<span class="table-pagination-ellipsis">…</span>'
              : "";

            return `${ellipsis}
              <button
                class="page-btn ${page === currentPage ? "active" : ""}"
                data-pdf-generation-artifact-grid-page="${page}"
                type="button"
              >
                ${formatCount(page)}
              </button>`;
          })
          .join("")}
        <button
          class="page-btn"
          data-pdf-generation-artifact-grid-nav="next"
          data-pdf-generation-artifact-grid-page="${Math.min(totalPages, currentPage + 1)}"
          ${currentPage >= totalPages ? "disabled" : ""}
          type="button"
        >다음</button>
        ${renderPdfGenerationArtifactPagePicker(currentPage, totalPages)}
      </div>
      <div class="table-pagination-summary">${rows.length ? `${formatCount(startRowNumber)}-${formatCount(endRowNumber)}` : "0"} / 총 ${formatCount(rows.length)}건</div>
    </div>
  `;
}
