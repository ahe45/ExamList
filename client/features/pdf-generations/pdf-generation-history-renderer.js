import { canUseAccess, hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { renderGenerationRows } from "./pdf-generation-rows-renderer.js";
import {
  getPdfGenerationVisibleRows,
  pdfGenerationGridColumns,
} from "./pdf-generation-table-model.js";
import {
  renderPdfGenerationFilterMenu,
  renderPdfGenerationHeaderCell,
  renderPdfGenerationPagination,
} from "./pdf-generation-table-renderer.js";

function renderStaticHeaderCell(className = "", content = "") {
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : "";

  return `
    <th${classAttribute}>
      <div class="table-header-static">${content}</div>
    </th>
  `;
}

export function renderPdfGenerationView({ access, pdfGenerations }) {
  const selectedItems = pdfGenerations.items.filter((item) =>
    pdfGenerations.selectedGenerationIds.includes(String(item.id || "")),
  );
  const selectedDownloadableCount = selectedItems.filter((item) => item.status === "completed").length;
  const { rows: filteredRows, visibleRows } = getPdfGenerationVisibleRows(pdfGenerations);
  const filteredCompletedRows = filteredRows.filter((item) => item.status === "completed");
  const selectedFilteredDownloadableCount = filteredCompletedRows.filter((item) =>
    pdfGenerations.selectedGenerationIds.includes(String(item.id || "")),
  ).length;
  const hasPdfGenerationPermission = hasAccess(access, "generatePdfs");
  const canGeneratePdfs = canUseAccess(access, "generatePdfs");

  return `
    <section class="view-stack table-view-stack pdf-generation-management-panel">
      <article class="table-card result-grid-card pdf-generation-result-grid pdf-generation-records-table has-print-column">
        <div class="section-header">
          <div class="menu-section-copy">
            <h3>PDF 생성</h3>
            <p>생성된 수험생확인대장을 확인하고 다운로드, 인쇄, 재생성을 관리합니다.</p>
          </div>
          <div class="table-header-actions pdf-generation-header-actions">
            <span class="status-badge neutral">선택 ${formatCount(pdfGenerations.selectedGenerationIds.length)}건</span>
            ${
              hasAccess(access, "downloadPdfs")
                ? `
                  <button
                    class="ghost-button"
                    data-action="open-pdf-generation-download-modal"
                    type="button"
                    ${!selectedDownloadableCount ? "disabled" : ""}
                  >
                    일괄 다운로드
                  </button>
                `
                : ""
            }
            ${
              hasPdfGenerationPermission
                ? `
                  <button class="primary-button" data-action="open-pdf-generation-create-modal" type="button" ${canGeneratePdfs ? "" : "disabled"}>
                    <svg class="button-icon" viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
                      <path d="M10 4v12M4 10h12" />
                    </svg>
                    PDF 생성
                  </button>
                  <button
                    class="icon-button pdf-generation-delete-button"
                    data-action="open-pdf-generation-delete-confirm"
                    type="button"
                    aria-label="선택 PDF 삭제"
                    title="선택 PDF 삭제"
                    ${!selectedDownloadableCount || !canGeneratePdfs ? "disabled" : ""}
                  >
                    <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                      <path d="M3 6h18"></path>
                      <path d="M8 6V4h8v2"></path>
                      <path d="M19 6l-1 14H6L5 6"></path>
                      <path d="M10 11v5"></path>
                      <path d="M14 11v5"></path>
                    </svg>
                  </button>
                `
                : ""
            }
            <button class="icon-button" data-action="refresh-pdf-generations" type="button" aria-label="새로고침">
              <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
        </div>
        ${
          pdfGenerations.loading
            ? '<p class="helper-text">생성 결과를 불러오는 중입니다.</p>'
            : `
              <div class="table-wrap pdf-generation-table-wrap">
                <table class="data-table pdf-generation-table">
                  <thead>
                    <tr>
                      ${renderStaticHeaderCell(
                        "pdf-generation-select-column",
                        `<input data-pdf-generation-select-all type="checkbox" ${selectedFilteredDownloadableCount && selectedFilteredDownloadableCount === filteredCompletedRows.length ? "checked" : ""} />`,
                      )}
                      ${pdfGenerationGridColumns.map((column) => renderPdfGenerationHeaderCell(column, pdfGenerations)).join("")}
                      ${renderStaticHeaderCell("pdf-generation-print-column", '<span class="table-header-label">인쇄</span>')}
                      ${renderStaticHeaderCell("pdf-generation-detail-column", '<span class="table-header-label">상세</span>')}
                    </tr>
                  </thead>
                  <tbody>
                    ${renderGenerationRows(
                      visibleRows,
                      pdfGenerations.selectedGenerationIds,
                      pdfGenerations.rerunningGenerationIds,
                      access,
                    )}
                  </tbody>
                </table>
              </div>
              ${renderPdfGenerationPagination(pdfGenerations)}
            `
        }
      </article>
      ${renderPdfGenerationFilterMenu(pdfGenerations)}
    </section>
  `;
}
