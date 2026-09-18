import { escapeHtml } from "./html-utils.js";
import { assertGridNamespace } from "./data-grid-namespace.js";

export function renderGridFilterMenu({ column, tableState, visibleOptionValues, namespace }) {
  assertGridNamespace(namespace);
  if (!column || column.filterable === false) return "";
  const columnKey = String(column.key);
  const selectedValues = new Set((tableState.filters?.[columnKey] || []).map((value) => String(value || "")));
  const isAllVisibleSelected =
    visibleOptionValues.length > 0 && visibleOptionValues.every((value) => selectedValues.has(String(value || "")));
  const position = tableState.filterMenuPosition || {};
  const top = Number.isFinite(Number(position.top)) ? Math.max(12, Number(position.top)) : 118;
  const left = Number.isFinite(Number(position.left)) ? Math.max(12, Number(position.left)) : 32;

  return `
    <div class="table-filter-menu-overlay" data-action="close-${namespace}-filter-menu"></div>
    <div
      class="table-filter-menu ${namespace}-filter-menu workmate-dashboard-filter-menu"
      role="dialog"
      aria-label="${escapeHtml(column.label)} 필터"
      style="top: ${top}px; left: ${left}px;"
    >
      <div class="table-filter-menu-head">
        <strong>${escapeHtml(column.label)}</strong>
        <button class="table-filter-close-button" data-action="close-${namespace}-filter-menu" type="button" aria-label="필터 닫기">×</button>
      </div>
      <label class="table-filter-search">
        <input
          data-${namespace}-filter-search-input
          placeholder="옵션 검색"
          type="search"
          value="${escapeHtml(tableState.filterMenuSearch || "")}"
        />
      </label>
      <div class="table-filter-select-all">
        ${renderGridFilterSelectAll(columnKey, isAllVisibleSelected, namespace)}
      </div>
      <div class="table-filter-options table-filter-option-list">
        ${renderGridFilterOptions(columnKey, visibleOptionValues, selectedValues, namespace)}
      </div>
      <div class="table-filter-menu-footer">
        <button
          class="table-filter-footer-button subtle"
          data-action="clear-${namespace}-filter"
          data-filter-key="${escapeHtml(columnKey)}"
          type="button"
        >
          초기화
        </button>
        <button class="table-filter-footer-button" data-action="close-${namespace}-filter-menu" type="button">적용</button>
      </div>
    </div>
  `;
}

export function renderGridFilterSelectAll(columnKey, isAllVisibleSelected, namespace) {
  assertGridNamespace(namespace);
  return `
    <label class="table-filter-option table-filter-option-all table-filter-option-select-all">
      <input
        data-${namespace}-filter-select-all
        data-filter-key="${escapeHtml(columnKey)}"
        ${isAllVisibleSelected ? "checked" : ""}
        type="checkbox"
      />
      <span>전체 선택</span>
    </label>
  `;
}

export function renderGridFilterOptions(columnKey, visibleOptionValues, selectedValues, namespace) {
  assertGridNamespace(namespace);
  return visibleOptionValues.length
    ? visibleOptionValues
        .map(
          (value) => `
            <label class="table-filter-option">
              <input
                data-${namespace}-filter-option
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
