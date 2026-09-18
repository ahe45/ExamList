import { escapeHtml } from "./html-utils.js";

// HTML slots come from page renderers, which escape their domain values.
// Keeping cell renderers local preserves row actions, badges and permissions.
export function renderGridTable({ className = "data-table", headerHtml, rowsHtml, bodyClassName = "" }) {
  return `
    <table class="${escapeHtml(className)}">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody class="${escapeHtml(bodyClassName)}">${rowsHtml}</tbody>
    </table>
  `;
}

export function renderGridStatusRow(columnCount, message, className = "") {
  return `<tr class="table-empty-row"><td class="table-empty-cell ${escapeHtml(className)}" colspan="${Math.max(1, Number(columnCount) || 1)}">${escapeHtml(message)}</td></tr>`;
}
