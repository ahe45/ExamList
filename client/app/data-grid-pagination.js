import { escapeHtml } from "./html-utils.js";
import { formatCount } from "./number-format.js";
import { assertGridNamespace } from "./data-grid-namespace.js";

function getGridPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

function renderGridPagePicker(currentPage, totalPages, namespace) {
  return `
    <span class="page-picker-group">
      <span class="table-pagination-divider" aria-hidden="true"></span>
      <label class="page-picker">
        <select class="page-picker-select" data-${namespace}-grid-page-picker aria-label="페이지 이동">
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

export function renderGridPagination({ tableState, visibleRows, pageSizeOptions, namespace }) {
  assertGridNamespace(namespace);
  const { currentPage, endRowNumber, rows, startRowNumber, totalPages } = visibleRows;
  const pageSize = Math.max(0, Number(tableState.pageSize) || 0);
  const pageSizeLabel = pageSize > 0 ? `${formatCount(pageSize)}개` : "모두 표시";
  const pages = getGridPaginationPages(currentPage, totalPages);

  return `
    <div class="table-pagination">
      <div class="table-page-size">
        <span>표시 개수</span>
        <div class="table-page-size-select">
          <button
            aria-expanded="${tableState.pageSizeMenuOpen ? "true" : "false"}"
            aria-haspopup="listbox"
            class="page-size-trigger"
            data-${namespace}-page-size-trigger
            type="button"
          >
            <span>${escapeHtml(pageSizeLabel)}</span>
            <span class="page-size-caret" aria-hidden="true"></span>
          </button>
          ${
            tableState.pageSizeMenuOpen
              ? `
                <div class="page-size-menu" role="listbox" aria-label="표시 개수">
                  ${pageSizeOptions
                    .map(
                      (option) => `
                        <button
                          class="page-size-option ${Number(tableState.pageSize) === option ? "active" : ""}"
                          data-${namespace}-page-size-option="${option}"
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
          data-${namespace}-grid-nav="prev"
          data-${namespace}-grid-page="${Math.max(1, currentPage - 1)}"
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
                ${page === currentPage ? 'aria-current="page"' : ""}
                data-${namespace}-grid-page="${page}"
                type="button"
              >
                ${formatCount(page)}
              </button>`;
          })
          .join("")}
        <button
          class="page-btn"
          data-${namespace}-grid-nav="next"
          data-${namespace}-grid-page="${Math.min(totalPages, currentPage + 1)}"
          ${currentPage >= totalPages ? "disabled" : ""}
          type="button"
        >다음</button>
        ${renderGridPagePicker(currentPage, totalPages, namespace)}
      </div>
      <div class="table-pagination-summary">${rows.length ? `${formatCount(startRowNumber)}-${formatCount(endRowNumber)}` : "0"} / 총 ${formatCount(visibleRows.totalRows ?? rows.length)}건</div>
    </div>
  `;
}
