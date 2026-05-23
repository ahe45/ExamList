import { escapeHtml } from "../../app/html-utils.js";
import { formatCount, formatDecimalNumber } from "../../app/number-format.js";

function formatFileSize(value) {
  const bytes = Number(value) || 0;

  if (bytes >= 1024 * 1024) {
    return `${formatDecimalNumber(Math.round((bytes / 1024 / 1024) * 10) / 10, 1)} MB`;
  }

  if (bytes >= 1024) {
    return `${formatDecimalNumber(Math.round((bytes / 1024) * 10) / 10, 1)} KB`;
  }

  return `${formatCount(bytes)} B`;
}

function renderDeleteSummaryItem(label, value) {
  return `
    <div class="pdf-generation-delete-summary-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderDeleteTargetList(items = [], totalCount = 0) {
  const normalizedItems = Array.isArray(items) ? items : [];

  if (!normalizedItems.length) {
    return "";
  }

  const extraCount = Math.max(0, Number(totalCount) - normalizedItems.length);

  return `
    <ul class="pdf-generation-delete-target-list">
      ${normalizedItems
        .map((item) => {
          const targetName = String(item.targetName || item.fileName || item.id || "선택한 PDF").trim();
          const pageCount = Number(item.pageCount) || 0;
          const candidateCount = Number(item.candidateCount) || 0;

          return `
            <li>
              <strong>${escapeHtml(targetName)}</strong>
              <span>페이지 ${escapeHtml(formatCount(pageCount))} · 수험생 ${escapeHtml(formatCount(candidateCount))}</span>
            </li>
          `;
        })
        .join("")}
      ${extraCount ? `<li class="pdf-generation-delete-target-extra">외 ${escapeHtml(formatCount(extraCount))}건</li>` : ""}
    </ul>
  `;
}

export function renderPdfGenerationDeleteConfirmModal(pdfGenerations = {}) {
  const modal = pdfGenerations.deleteConfirm || {};

  if (!modal.isOpen) {
    return "";
  }

  const isBusy = Boolean(modal.isDeleting);
  const count = Number(modal.count) || 0;

  return `
    <div class="modal-overlay pdf-generation-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfGenerationDeleteTitle">
      <div class="modal-card pdf-generation-delete-card">
        <div class="modal-header">
          <div>
            <h2 id="pdfGenerationDeleteTitle">PDF 삭제 확인</h2>
            <p class="pdf-generation-delete-message">선택한 PDF 생성 결과를 삭제합니다.</p>
          </div>
          <button class="icon-button" data-action="close-pdf-generation-delete-confirm" type="button" aria-label="닫기" ${isBusy ? "disabled" : ""}>&times;</button>
        </div>
        <div class="pdf-generation-delete-summary">
          ${renderDeleteSummaryItem("삭제 대상", `${formatCount(count)}건`)}
          ${renderDeleteSummaryItem("총 페이지", `${formatCount(modal.pageCount)}쪽`)}
          ${renderDeleteSummaryItem("수험생", `${formatCount(modal.candidateCount)}명`)}
          ${renderDeleteSummaryItem("파일 크기", formatFileSize(modal.fileSizeBytes))}
        </div>
        ${renderDeleteTargetList(modal.items, count)}
        ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
        <div class="modal-actions">
          <button class="ghost-button" data-action="close-pdf-generation-delete-confirm" type="button" ${isBusy ? "disabled" : ""}>취소</button>
          <button class="primary-button pdf-generation-delete-confirm-button" data-action="confirm-pdf-generation-delete" type="button" ${isBusy || !count ? "disabled" : ""}>
            ${isBusy ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  `;
}
