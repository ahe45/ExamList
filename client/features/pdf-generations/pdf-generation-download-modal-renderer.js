import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

export function renderPdfGenerationDownloadModal(pdfGenerations = {}) {
  const modal = pdfGenerations.downloadModal || {};

  if (!modal.isOpen) {
    return "";
  }

  const selectedCount = Array.isArray(pdfGenerations.selectedGenerationIds)
    ? pdfGenerations.selectedGenerationIds.length
    : 0;
  const mode = modal.mode === "merge" ? "merge" : "zip";
  const isBusy = Boolean(modal.isSubmitting);

  return `
    <div class="modal-overlay pdf-generation-download-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfGenerationDownloadTitle">
      <div class="modal-card pdf-generation-download-card">
        <div class="modal-header">
          <div>
            <h2 id="pdfGenerationDownloadTitle">일괄 다운로드</h2>
            <p class="pdf-generation-download-meta">선택한 PDF ${formatCount(selectedCount)}개</p>
          </div>
          <button class="icon-button" data-action="close-pdf-generation-download-modal" type="button" aria-label="닫기" ${isBusy ? "disabled" : ""}>&times;</button>
        </div>
        <form class="modal-form pdf-generation-download-form" data-pdf-generation-download-form>
          <label class="pdf-generation-download-choice ${mode === "merge" ? "is-selected" : ""}">
            <input name="downloadMode" type="radio" value="merge" ${mode === "merge" ? "checked" : ""} ${isBusy ? "disabled" : ""} />
            <span>
              <strong>병합 다운로드</strong>
              <small>선택한 PDF를 하나의 PDF 파일로 병합합니다.</small>
            </span>
          </label>
          <label class="pdf-generation-download-choice ${mode === "zip" ? "is-selected" : ""}">
            <input name="downloadMode" type="radio" value="zip" ${mode === "zip" ? "checked" : ""} ${isBusy ? "disabled" : ""} />
            <span>
              <strong>개별 다운로드</strong>
              <small>여러 PDF 파일을 ZIP으로 묶어서 다운로드합니다.</small>
            </span>
          </label>
          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions">
            <button class="ghost-button" data-action="close-pdf-generation-download-modal" type="button" ${isBusy ? "disabled" : ""}>취소</button>
            <button class="primary-button" type="submit" ${isBusy || !selectedCount ? "disabled" : ""}>
              다운로드
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
