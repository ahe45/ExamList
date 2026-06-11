import { canUseAccess, hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  formatDateTime,
  formatFileSize,
} from "./pdf-generation-render-helpers.js";
import {
  formatPdfGenerationArtifactContent,
  formatPdfGenerationArtifactKind,
  getPdfGenerationArtifactVisibleRows,
  pdfGenerationArtifactGridColumns,
} from "./pdf-generation-artifact-table-model.js";
import {
  renderPdfGenerationArtifactFilterMenu,
  renderPdfGenerationArtifactHeaderCell,
  renderPdfGenerationArtifactPagination,
} from "./pdf-generation-artifact-table-renderer.js";
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

function getActivePdfGenerationTab(pdfGenerations = {}, canDownloadArtifacts = false) {
  const activeTab = String(pdfGenerations.activeTab || "").trim();

  return canDownloadArtifacts && activeTab === "artifacts" ? "artifacts" : "generations";
}

function renderPdfGenerationTabs(activeTab = "generations", canDownloadArtifacts = false) {
  if (!canDownloadArtifacts) {
    return "";
  }

  return `
    <div class="pdf-generation-view-tabs" role="tablist" aria-label="PDF 생성 목록 전환">
      <button
        class="pdf-generation-view-tab ${activeTab === "generations" ? "is-active" : ""}"
        data-action="set-pdf-generation-tab"
        data-pdf-generation-tab="generations"
        role="tab"
        type="button"
        aria-selected="${activeTab === "generations" ? "true" : "false"}"
      >
        생성 PDF
      </button>
      <button
        class="pdf-generation-view-tab ${activeTab === "artifacts" ? "is-active" : ""}"
        data-action="set-pdf-generation-tab"
        data-pdf-generation-tab="artifacts"
        role="tab"
        type="button"
        aria-selected="${activeTab === "artifacts" ? "true" : "false"}"
      >
        병합/ZIP 파일
      </button>
    </div>
  `;
}

function renderArtifactDownloadButton(artifact = {}, canDownload = false) {
  const isAvailable = Boolean(canDownload && artifact.fileExists && artifact.downloadUrl);
  const label = isAvailable ? "다운로드" : "파일 없음";

  return `
    <button
      class="icon-button pdf-generation-artifact-download-button"
      data-action="download-pdf-generation-artifact"
      data-download-url="${escapeHtml(artifact.downloadUrl || "")}"
      data-file-name="${escapeHtml(artifact.fileName || "")}"
      type="button"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
      ${isAvailable ? "" : "disabled"}
    >
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
    </button>
  `;
}

function renderPdfGenerationArtifactRows(artifacts = [], startRowNumber = 1, canDownload = false) {
  if (!artifacts.length) {
    return `
      <tr class="table-empty-row">
        <td class="table-empty-cell pdf-generation-artifact-empty-cell" colspan="7">표시할 병합/ZIP 파일이 없습니다.</td>
      </tr>
    `;
  }

  return artifacts
    .map((artifact, index) => {
      return `
        <tr>
          <td class="row-number-col">${formatCount(startRowNumber + index)}</td>
          <td class="table-column-kind pdf-generation-artifact-kind-cell">
            <span class="status-badge neutral">${escapeHtml(formatPdfGenerationArtifactKind(artifact.kind))}</span>
          </td>
          <td class="table-column-fileName pdf-generation-artifact-file-cell">
            <span class="table-cell-text strong" data-grid-cell-tooltip>${escapeHtml(artifact.fileName || "-")}</span>
          </td>
          <td class="table-column-content">${escapeHtml(formatPdfGenerationArtifactContent(artifact))}</td>
          <td class="table-column-fileSizeBytes">${escapeHtml(formatFileSize(artifact.fileSizeBytes))}</td>
          <td class="table-column-createdAt">
            <span class="table-cell-text" data-grid-cell-tooltip>${escapeHtml(formatDateTime(artifact.createdAt))}</span>
          </td>
          <td class="pdf-generation-artifact-download-cell">
            ${renderArtifactDownloadButton(artifact, canDownload)}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPdfGenerationArtifactsPanel(pdfGenerations = {}, canDownload = false) {
  const { startRowNumber, visibleRows } = getPdfGenerationArtifactVisibleRows(pdfGenerations);

  if (pdfGenerations.artifactLoading) {
    return '<p class="helper-text pdf-generation-artifact-loading-text">병합/ZIP 파일을 불러오는 중입니다.</p>';
  }

  return `
    ${pdfGenerations.artifactErrorMessage ? `<p class="error-banner">${escapeHtml(pdfGenerations.artifactErrorMessage)}</p>` : ""}
    <div class="table-wrap pdf-generation-artifact-table-wrap">
      <table class="data-table pdf-generation-artifact-table">
        <thead>
          <tr>
            <th class="row-number-col">번호</th>
            ${pdfGenerationArtifactGridColumns.map((column) => renderPdfGenerationArtifactHeaderCell(column, pdfGenerations)).join("")}
            <th>다운로드</th>
          </tr>
        </thead>
        <tbody class="${visibleRows.length ? "" : "table-body is-empty"}">
          ${renderPdfGenerationArtifactRows(visibleRows, startRowNumber, canDownload)}
        </tbody>
      </table>
    </div>
    ${renderPdfGenerationArtifactPagination(pdfGenerations)}
  `;
}

function renderGenerationTable({
  access,
  filteredCompletedRows,
  pdfGenerations,
  selectedFilteredDownloadableCount,
  visibleRows,
}) {
  return `
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
  `;
}

export function renderPdfGenerationView({ access, pdfGenerations }) {
  const generationItems = Array.isArray(pdfGenerations.items) ? pdfGenerations.items : [];
  const selectedGenerationIds = Array.isArray(pdfGenerations.selectedGenerationIds)
    ? pdfGenerations.selectedGenerationIds
    : [];
  const selectedItems = generationItems.filter((item) =>
    selectedGenerationIds.includes(String(item.id || "")),
  );
  const selectedDownloadableCount = selectedItems.filter((item) => item.status === "completed").length;
  const { rows: filteredRows, visibleRows } = getPdfGenerationVisibleRows({
    ...pdfGenerations,
    items: generationItems,
    selectedGenerationIds,
  });
  const filteredCompletedRows = filteredRows.filter((item) => item.status === "completed");
  const selectedFilteredDownloadableCount = filteredCompletedRows.filter((item) =>
    selectedGenerationIds.includes(String(item.id || "")),
  ).length;
  const hasPdfGenerationPermission = hasAccess(access, "generatePdfs");
  const canGeneratePdfs = canUseAccess(access, "generatePdfs");
  const canDownloadArtifacts = hasAccess(access, "downloadPdfs");
  const activeTab = getActivePdfGenerationTab(pdfGenerations, canDownloadArtifacts);
  const artifactCount = Number(pdfGenerations.totalArtifacts) ||
    (Array.isArray(pdfGenerations.artifactItems) ? pdfGenerations.artifactItems.length : 0);

  return `
    <section class="view-stack table-view-stack pdf-generation-management-panel">
      <article class="table-card result-grid-card pdf-generation-result-grid ${activeTab === "artifacts" ? "pdf-generation-artifact-grid" : "pdf-generation-records-table has-print-column"}">
        <div class="section-header">
          <div class="menu-section-copy">
            <h3>PDF 생성</h3>
            <p>생성된 수험생 PDF와 병합/ZIP 파일을 확인하고 다운로드, 인쇄, 재생성을 관리합니다.</p>
          </div>
          ${renderPdfGenerationTabs(activeTab, canDownloadArtifacts)}
          <div class="table-header-actions pdf-generation-header-actions">
            <span class="status-badge neutral">${
              activeTab === "artifacts"
                ? `파일 ${formatCount(artifactCount)}건`
                : `선택 ${formatCount(selectedGenerationIds.length)}건`
            }</span>
            ${
              hasAccess(access, "downloadPdfs")
                ? `
                  <button
                    class="ghost-button"
                    data-action="open-pdf-generation-download-modal"
                    type="button"
                    ${activeTab !== "generations" || !selectedDownloadableCount ? "disabled" : ""}
                  >
                    일괄 다운로드
                  </button>
                `
                : ""
            }
            ${
              hasPdfGenerationPermission
                ? `
                  <button class="primary-button" data-action="open-pdf-generation-create-modal" type="button" ${activeTab === "generations" && canGeneratePdfs ? "" : "disabled"}>
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
                    ${activeTab !== "generations" || !selectedDownloadableCount || !canGeneratePdfs ? "disabled" : ""}
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
            <button class="icon-button" data-action="${activeTab === "artifacts" ? "refresh-pdf-generation-artifacts" : "refresh-pdf-generations"}" type="button" aria-label="새로고침">
              <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
        </div>
        ${
          activeTab === "artifacts"
            ? renderPdfGenerationArtifactsPanel(pdfGenerations, canDownloadArtifacts)
            : pdfGenerations.loading
              ? '<p class="helper-text">생성 결과를 불러오는 중입니다.</p>'
              : renderGenerationTable({
                access,
                filteredCompletedRows,
                pdfGenerations: {
                  ...pdfGenerations,
                  items: generationItems,
                  selectedGenerationIds,
                },
                selectedFilteredDownloadableCount,
                visibleRows,
              })
        }
      </article>
      ${
        activeTab === "generations"
          ? renderPdfGenerationFilterMenu(pdfGenerations)
          : renderPdfGenerationArtifactFilterMenu(pdfGenerations)
      }
    </section>
  `;
}
