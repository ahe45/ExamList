import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  formatAuditActionLabel,
  formatDateTime,
  renderAuditMetadata,
} from "./pdf-generation-render-helpers.js";
import {
  filterPdfAuditLogFilterOptionValues,
  formatPdfAuditEntityType,
  formatPdfAuditStatusLabel,
  getPdfAuditLogFilterOptionValues,
  getPdfAuditLogTableState,
  getPdfAuditLogVisibleRows,
  pdfAuditLogGridColumns,
  pdfAuditLogPageSizeOptions,
} from "./pdf-generation-audit-log-model.js";

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

function renderStatusBadge(status = "") {
  const normalizedStatus = String(status || "").trim();
  const badgeClass = normalizedStatus === "completed"
    ? "active"
    : normalizedStatus === "queued" || normalizedStatus === "running"
      ? "neutral"
      : "danger";

  return `<span class="status-badge ${badgeClass}">${escapeHtml(formatPdfAuditStatusLabel(normalizedStatus))}</span>`;
}

function renderAuditLogRows(rows = [], startRowNumber = 1) {
  if (!rows.length) {
    return `
      <tr class="table-empty-row">
        <td class="table-empty-cell pdf-audit-empty-cell" colspan="${pdfAuditLogGridColumns.length + 1}">표시할 PDF 작업 로그가 없습니다.</td>
      </tr>
    `;
  }

  return rows
    .map(
      (log, index) => `
        <tr>
          <td class="row-number-col pdf-audit-sequence-cell">${formatCount(startRowNumber + index)}</td>
          <td class="table-column-action">
            <span class="table-cell-text strong" data-grid-cell-tooltip>${escapeHtml(formatAuditActionLabel(log.action))}</span>
          </td>
          <td class="table-column-target pdf-audit-target-cell">
            <span class="table-cell-text strong" data-grid-cell-tooltip>${escapeHtml(formatPdfAuditEntityType(log.entityType))}</span>
          </td>
          <td class="table-column-status">${renderStatusBadge(log.status)}</td>
          <td class="table-column-metadata pdf-audit-metadata-cell">
            <span class="table-cell-text" data-grid-cell-tooltip>${escapeHtml(renderAuditMetadata(log.metadata) || "-")}</span>
          </td>
          <td class="table-column-createdAt">
            <span class="table-cell-text" data-grid-cell-tooltip>${escapeHtml(formatDateTime(log.createdAt))}</span>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderPdfAuditHeaderCell(column, pdfGenerations = {}) {
  const tableState = getPdfAuditLogTableState(pdfGenerations);
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
                data-pdf-audit-grid-sort="${escapeHtml(column.key)}"
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
                data-pdf-audit-grid-filter="${escapeHtml(column.key)}"
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

function renderPdfAuditFilterMenu(pdfGenerations = {}) {
  const tableState = getPdfAuditLogTableState(pdfGenerations);
  const columnKey = String(tableState.filterMenuKey || "");
  const column = pdfAuditLogGridColumns.find((item) => item.key === columnKey);

  if (!column || column.filterable === false) {
    return "";
  }

  const optionValues = getPdfAuditLogFilterOptionValues(pdfGenerations, columnKey);
  const visibleOptionValues = filterPdfAuditLogFilterOptionValues(optionValues, tableState.filterMenuSearch);
  const selectedValues = new Set((tableState.filters?.[columnKey] || []).map((value) => String(value || "")));
  const isAllVisibleSelected =
    visibleOptionValues.length > 0 && visibleOptionValues.every((value) => selectedValues.has(String(value || "")));
  const position = tableState.filterMenuPosition || {};
  const top = Number.isFinite(Number(position.top)) ? Math.max(12, Number(position.top)) : 118;
  const left = Number.isFinite(Number(position.left)) ? Math.max(12, Number(position.left)) : 32;

  return `
    <div class="table-filter-menu-overlay" data-action="close-pdf-audit-filter-menu"></div>
    <div
      class="table-filter-menu pdf-audit-filter-menu workmate-dashboard-filter-menu"
      role="dialog"
      aria-label="${escapeHtml(column.label)} 필터"
      style="top: ${top}px; left: ${left}px;"
    >
      <div class="table-filter-menu-head">
        <strong>${escapeHtml(column.label)}</strong>
        <button class="table-filter-close-button" data-action="close-pdf-audit-filter-menu" type="button" aria-label="필터 닫기">×</button>
      </div>
      <label class="table-filter-search">
        <input
          data-pdf-audit-filter-search-input
          placeholder="옵션 검색"
          type="search"
          value="${escapeHtml(tableState.filterMenuSearch || "")}"
        />
      </label>
      <div class="table-filter-select-all">
        <label class="table-filter-option table-filter-option-all table-filter-option-select-all">
          <input
            data-pdf-audit-filter-select-all
            data-filter-key="${escapeHtml(columnKey)}"
            ${isAllVisibleSelected ? "checked" : ""}
            type="checkbox"
          />
          <span>전체 선택</span>
        </label>
      </div>
      <div class="table-filter-options table-filter-option-list">
        ${
          visibleOptionValues.length
            ? visibleOptionValues
              .map(
                (value) => `
                  <label class="table-filter-option">
                    <input
                      data-pdf-audit-filter-option
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
            : `<p class="table-filter-empty">표시할 필터 값이 없습니다.</p>`
        }
      </div>
      <div class="table-filter-menu-footer">
        <button
          class="table-filter-footer-button subtle"
          data-action="clear-pdf-audit-filter"
          data-filter-key="${escapeHtml(columnKey)}"
          type="button"
        >
          초기화
        </button>
        <button class="table-filter-footer-button" data-action="close-pdf-audit-filter-menu" type="button">적용</button>
      </div>
    </div>
  `;
}

function renderPdfAuditPagePicker(currentPage, totalPages) {
  return `
    <span class="page-picker-group">
      <span class="table-pagination-divider" aria-hidden="true"></span>
      <label class="page-picker">
        <select class="page-picker-select" data-pdf-audit-grid-page-picker aria-label="페이지 이동">
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

function renderPdfAuditPagination(pdfGenerations = {}) {
  const tableState = getPdfAuditLogTableState(pdfGenerations);
  const { currentPage, endRowNumber, rows, startRowNumber, totalPages } = getPdfAuditLogVisibleRows(pdfGenerations);
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
            data-pdf-audit-page-size-trigger
            type="button"
          >
            <span>${escapeHtml(pageSizeLabel)}</span>
            <span class="page-size-caret" aria-hidden="true"></span>
          </button>
          ${
            tableState.pageSizeMenuOpen
              ? `
                <div class="page-size-menu" role="listbox" aria-label="표시 개수">
                  ${pdfAuditLogPageSizeOptions
                    .map(
                      (option) => `
                        <button
                          class="page-size-option ${Number(tableState.pageSize) === option ? "active" : ""}"
                          data-pdf-audit-page-size-option="${option}"
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
          data-pdf-audit-grid-nav="prev"
          data-pdf-audit-grid-page="${Math.max(1, currentPage - 1)}"
          ${currentPage <= 1 ? "disabled" : ""}
          type="button"
        >이전</button>
        ${pages
          .map((page, index) => {
            const previousPage = pages[index - 1];
            const gap = previousPage && page - previousPage > 1
              ? '<span class="table-pagination-ellipsis">…</span>'
              : "";

            return `
              ${gap}
              <button
                class="page-btn ${page === currentPage ? "active" : ""}"
                data-pdf-audit-grid-page="${page}"
                type="button"
              >${formatCount(page)}</button>
            `;
          })
          .join("")}
        <button
          class="page-btn"
          data-pdf-audit-grid-nav="next"
          data-pdf-audit-grid-page="${Math.min(totalPages, currentPage + 1)}"
          ${currentPage >= totalPages ? "disabled" : ""}
          type="button"
        >다음</button>
        ${renderPdfAuditPagePicker(currentPage, totalPages)}
      </div>
      <div class="table-pagination-summary">${rows.length ? `${formatCount(startRowNumber)}-${formatCount(endRowNumber)}` : "0"} / 총 ${formatCount(rows.length)}건</div>
    </div>
  `;
}

export function renderPdfHistoryManagementView({ pdfGenerations }) {
  const { startRowNumber, visibleRows } = getPdfAuditLogVisibleRows(pdfGenerations);

  return `
    <section class="view-stack table-view-stack pdf-history-management-panel">
      <article class="table-card result-grid-card pdf-history-log-grid">
        <div class="section-header">
          <div class="menu-section-copy">
            <h3>PDF 작업 로그</h3>
            <p>PDF 생성, 병합, ZIP 다운로드, 삭제, 재생성 같은 작업 기록을 시간순으로 확인합니다.</p>
          </div>
          <div class="table-header-actions pdf-history-header-actions">
            <span class="status-badge neutral">총 ${formatCount(Number(pdfGenerations.totalAuditLogs) || (Array.isArray(pdfGenerations.auditLogs) ? pdfGenerations.auditLogs.length : 0))}건</span>
            <button class="icon-button" data-action="refresh-pdf-audit-logs" type="button" aria-label="새로고침">
              <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
        </div>
        ${
          pdfGenerations.auditLoading
            ? '<p class="helper-text pdf-history-loading-text">PDF 작업 로그를 불러오는 중입니다.</p>'
            : `
              <div class="table-wrap pdf-history-table-wrap">
                <table class="data-table pdf-history-table">
                  <thead>
                    <tr>
                      <th class="row-number-col">순번</th>
                      ${pdfAuditLogGridColumns.map((column) => renderPdfAuditHeaderCell(column, pdfGenerations)).join("")}
                    </tr>
                  </thead>
                  <tbody class="${visibleRows.length ? "" : "table-body is-empty"}">
                    ${renderAuditLogRows(visibleRows, startRowNumber)}
                  </tbody>
                </table>
              </div>
              ${renderPdfAuditPagination(pdfGenerations)}
            `
        }
      </article>
      ${renderPdfAuditFilterMenu(pdfGenerations)}
    </section>
  `;
}
