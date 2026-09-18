import { escapeHtml } from "./html-utils.js";
import { assertGridNamespace } from "./data-grid-namespace.js";

export function renderGridHeaderCell(column, tableState = {}, namespace) {
  assertGridNamespace(namespace);
  const [sortRule] = Array.isArray(tableState.sortRules) ? tableState.sortRules : [];
  const isSortable = column.sortable !== false;
  const isFilterable = column.filterable !== false;
  const isSorted = isSortable && sortRule?.key === column.key;
  const direction = isSorted && sortRule.direction === "desc" ? "desc" : "asc";
  const selectedCount = isFilterable ? (tableState.filters?.[column.key] || []).length : 0;
  const headerLines = Array.isArray(column.headerLines) ? column.headerLines : [];
  const labelHtml = headerLines.length
    ? `<span class="table-header-label table-header-label-multiline" title="${escapeHtml(column.label)}">${headerLines.map((line) => `<span class="table-header-label-line">${escapeHtml(line)}</span>`).join("")}</span>`
    : `<span class="table-header-label">${escapeHtml(column.label)}</span>`;
  const sortIcon = isSorted
    ? `<span class="table-sort-icon" aria-hidden="true"><span class="table-sort-arrow">${direction === "desc" ? "&darr;" : "&uarr;"}</span></span>`
    : "";
  const classNames = [
    "table-header-enhanced",
    `table-column-${escapeHtml(column.key)}`,
    isSorted ? `sorted-${direction}` : "",
    selectedCount ? "filter-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <th class="${classNames}"${isSortable ? ` aria-sort="${isSorted ? (direction === "desc" ? "descending" : "ascending") : "none"}"` : ""}>
      <div class="table-header-shell ${isFilterable ? "has-filter" : ""}">
        ${
          isSortable
            ? `
              <button
                class="table-sort-button"
                data-${namespace}-grid-sort="${escapeHtml(column.key)}"
                aria-label="${escapeHtml(column.label)}"
                type="button"
              >
                ${labelHtml}
                ${sortIcon}
              </button>
            `
            : labelHtml
        }
        ${
          isFilterable
            ? `
              <button
                class="table-filter-button"
                data-${namespace}-grid-filter="${escapeHtml(column.key)}"
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
