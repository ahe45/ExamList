import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { normalizePdfGenerationGridValue, pdfGenerationGridColumns } from "./pdf-generation-table-model.js";

const numericGenerationGridKeys = new Set(["candidateCount", "pageCount", "sequenceNumber"]);

function renderGenerationTextCell(item = {}, column = {}) {
  const rawValue = normalizePdfGenerationGridValue(item, column.key);
  const value = numericGenerationGridKeys.has(column.key) ? formatCount(rawValue) : rawValue || "-";

  return `
    <td class="table-column-${escapeHtml(column.key)}">
      <span class="table-cell-text" data-grid-cell-tooltip>${escapeHtml(value)}</span>
    </td>
  `;
}

function renderPrintIcon() {
  return `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v7H6z" />
      <path d="M8 11h.01" />
    </svg>
  `;
}

function renderDetailIcon() {
  return `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  `;
}

export function renderGenerationRows(items = [], selectedGenerationIds = [], rerunningGenerationIds = [], access = null) {
  const selectedSet = new Set(Array.isArray(selectedGenerationIds) ? selectedGenerationIds : []);

  if (!items.length) {
    return `
      <tr class="table-empty-row">
        <td colspan="${pdfGenerationGridColumns.length + 3}" class="table-empty-cell">
          생성 결과가 없습니다.
        </td>
      </tr>
    `;
  }

  return items
    .map(
      (item) => `
        <tr
          class="${selectedSet.has(String(item.id || "")) ? "is-selected " : ""}${item.id ? "is-clickable" : ""}"
          data-generation-row-id="${escapeHtml(item.id || "")}"
        >
          <td class="pdf-generation-select-column">
            ${
              item.status === "completed"
                ? `
                  <input
                    data-generation-id="${escapeHtml(item.id || "")}"
                    data-pdf-generation-select
                    type="checkbox"
                    ${selectedSet.has(String(item.id || "")) ? "checked" : ""}
                  />
                `
                : ""
            }
          </td>
          ${pdfGenerationGridColumns.map((column) => renderGenerationTextCell(item, column)).join("")}
          <td class="pdf-generation-print-column">
            ${
              item.printUrl && hasAccess(access, "downloadPdfs")
                ? `
                  <button
                    class="icon-button generation-print-button"
                    data-action="print-pdf-generation"
                    data-print-url="${escapeHtml(item.printUrl)}"
                    type="button"
                    aria-label="PDF 인쇄"
                    title="PDF 인쇄"
                  >${renderPrintIcon()}</button>
                `
                : `
                  <button class="icon-button generation-print-button" type="button" aria-label="PDF 인쇄" disabled>
                    ${renderPrintIcon()}
                  </button>
                `
            }
          </td>
          <td class="pdf-generation-detail-column">
            <button
              class="icon-button generation-detail-button"
              data-action="open-pdf-generation-detail-modal"
              data-generation-id="${escapeHtml(item.id || "")}"
              type="button"
              aria-label="PDF 생성 상세"
              title="PDF 생성 상세"
              ${item.id ? "" : "disabled"}
            >${renderDetailIcon()}</button>
          </td>
        </tr>
      `,
    )
    .join("");
}
