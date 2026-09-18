import { renderGridTable, renderGridStatusRow } from "../../app/data-grid-table.js";
import { renderGridFilterMenu, renderGridFilterOptions, renderGridFilterSelectAll } from "../../app/data-grid-filter.js";
import { renderGridPagination } from "../../app/data-grid-pagination.js";
import { renderGridHeaderCell } from "../../app/data-grid-header.js";
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

function renderStatusBadge(status = "") {
  const normalizedStatus = String(status || "").trim();
  const badgeClass = normalizedStatus === "completed"
    ? "active"
    : normalizedStatus === "queued" || normalizedStatus === "running"
      ? "neutral"
      : "danger";

  return `<span class="status-badge ${badgeClass}">${escapeHtml(formatPdfAuditStatusLabel(normalizedStatus))}</span>`;
}

function getAuditArtifactDownload(log = {}) {
  const action = String(log.action || "");
  const entityId = String(log.entityId || "").trim();
  const entityType = String(log.entityType || "").trim();
  const metadata = log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
    ? log.metadata
    : {};

  if (!entityId) {
    return null;
  }

  if (entityType === "pdf_generation_merged" && action === "pdf_generation_merged_created") {
    const fileName = String(metadata.mergedFileName || metadata.fileName || `${entityId}.pdf`).trim();

    return {
      downloadUrl: `/api/pdf-generations/merged/${encodeURIComponent(entityId)}/download?name=${encodeURIComponent(fileName)}`,
      fileName,
    };
  }

  if (entityType === "pdf_generation_archive" && action === "pdf_generation_archive_created") {
    const fileName = String(metadata.archiveFileName || metadata.fileName || `${entityId}.zip`).trim();

    return {
      downloadUrl: `/api/pdf-generations/archives/${encodeURIComponent(entityId)}/download?name=${encodeURIComponent(fileName)}`,
      fileName,
    };
  }

  return null;
}

function renderAuditArtifactDownloadCell(log = {}) {
  const artifact = getAuditArtifactDownload(log);

  if (!artifact) {
    return '<td class="pdf-audit-download-cell">-</td>';
  }

  return `
    <td class="pdf-audit-download-cell">
      <button
        class="icon-button pdf-generation-artifact-download-button"
        data-action="download-pdf-generation-artifact"
        data-download-url="${escapeHtml(artifact.downloadUrl)}"
        data-file-name="${escapeHtml(artifact.fileName)}"
        type="button"
        aria-label="다운로드"
        title="다운로드"
      >
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="m7 10 5 5 5-5"></path>
          <path d="M5 21h14"></path>
        </svg>
      </button>
    </td>
  `;
}

function renderAuditLogRows(rows = [], startRowNumber = 1) {
  if (!rows.length) {
    return renderGridStatusRow(pdfAuditLogGridColumns.length + 2, "표시할 작업 로그가 없습니다.", "pdf-audit-empty-cell");
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
          ${renderAuditArtifactDownloadCell(log)}
        </tr>
      `,
    )
    .join("");
}

function renderPdfAuditHeaderCell(column, pdfGenerations = {}) {
  return renderGridHeaderCell(column, getPdfAuditLogTableState(pdfGenerations), "pdf-audit");
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
  return renderGridFilterMenu({ column, tableState, visibleOptionValues, namespace: "pdf-audit" });
}

export function renderPdfAuditFilterSelectAll(columnKey = "", isAllVisibleSelected = false) {
  return renderGridFilterSelectAll(columnKey, isAllVisibleSelected, "pdf-audit");
}

export function renderPdfAuditFilterOptions(columnKey = "", visibleOptionValues = [], selectedValues = new Set()) {
  return renderGridFilterOptions(columnKey, visibleOptionValues, selectedValues, "pdf-audit");
}

function renderPdfAuditPagination(pdfGenerations = {}) {
  return renderGridPagination({
    tableState: getPdfAuditLogTableState(pdfGenerations),
    visibleRows: getPdfAuditLogVisibleRows(pdfGenerations),
    pageSizeOptions: pdfAuditLogPageSizeOptions,
    namespace: "pdf-audit",
  });
}

export function renderPdfHistoryManagementView({ pdfGenerations }) {
  const { startRowNumber, visibleRows } = getPdfAuditLogVisibleRows(pdfGenerations);

  return `
    <section class="view-stack table-view-stack pdf-history-management-panel">
      <article class="table-card result-grid-card pdf-history-log-grid">
        <div class="section-header">
          <div class="menu-section-copy">
            <h3>작업 로그</h3>
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
            ? '<p class="helper-text pdf-history-loading-text">작업 로그를 불러오는 중입니다.</p>'
            : `
              <div class="table-wrap pdf-history-table-wrap">
                ${renderGridTable({
      className: "data-table pdf-history-table",
      headerHtml: `<th class="row-number-col">순번</th>
                      ${pdfAuditLogGridColumns.map((column) => renderPdfAuditHeaderCell(column, pdfGenerations)).join("")}
                      <th class="pdf-audit-download-column"><span class="table-header-label">다운로드</span></th>`,
      rowsHtml: `${renderAuditLogRows(visibleRows, startRowNumber)}`,
      bodyClassName: `${visibleRows.length ? "" : "table-body is-empty"}`,
    })}
              </div>
              ${renderPdfAuditPagination(pdfGenerations)}
            `
        }
      </article>
      ${renderPdfAuditFilterMenu(pdfGenerations)}
    </section>
  `;
}
