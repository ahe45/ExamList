import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

export function renderPdfGenerationGeneratedResultModal(pdfGenerations = {}) {
  const modal = pdfGenerations.generatedResultModal || {};

  if (!modal.isOpen) {
    return "";
  }

  const generationCount = Array.isArray(modal.generationIds) ? modal.generationIds.length : 0;
  const mode = modal.mode === "merge" ? "merge" : "zip";
  const isBusy = Boolean(modal.isSubmitting);

  return `
    <div class="modal-overlay pdf-generation-generated-result-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfGenerationGeneratedResultTitle">
      <div class="modal-card pdf-generation-download-card pdf-generation-generated-result-card">
        <div class="modal-header">
          <div>
            <h2 id="pdfGenerationGeneratedResultTitle">PDF 생성 결과 처리</h2>
            <p class="pdf-generation-download-meta">선택한 PDF ${formatCount(generationCount)}개</p>
          </div>
          <button class="icon-button" data-action="close-pdf-generation-generated-result-modal" type="button" aria-label="닫기" ${isBusy ? "disabled" : ""}>&times;</button>
        </div>
        <form class="modal-form pdf-generation-download-form" data-pdf-generation-generated-result-form>
          <label class="pdf-generation-download-choice ${mode === "merge" ? "is-selected" : ""}">
            <input name="generatedResultMode" type="radio" value="merge" ${mode === "merge" ? "checked" : ""} ${isBusy ? "disabled" : ""} />
            <span>
              <strong>병합 다운로드</strong>
              <small>이번에 생성된 PDF를 하나의 PDF 파일로 병합합니다.</small>
            </span>
          </label>
          <label class="pdf-generation-download-choice ${mode === "zip" ? "is-selected" : ""}">
            <input name="generatedResultMode" type="radio" value="zip" ${mode === "zip" ? "checked" : ""} ${isBusy ? "disabled" : ""} />
            <span>
              <strong>개별 다운로드</strong>
              <small>이번에 생성된 PDF 파일을 ZIP으로 묶어서 다운로드합니다.</small>
            </span>
          </label>
          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions">
            <button class="ghost-button" data-action="close-pdf-generation-generated-result-modal" type="button" ${isBusy ? "disabled" : ""}>나중에</button>
            <button class="primary-button" type="submit" ${isBusy || generationCount < 2 ? "disabled" : ""}>
              생성 PDF 다운로드
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
