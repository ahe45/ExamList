import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

export function renderPdfGenerationDownloadProgressOverlay(pdfGenerations = {}) {
  const generatedResultModal = pdfGenerations.generatedResultModal || {};
  const isGeneratedResultDownload = Boolean(generatedResultModal.isSubmitting);
  const modal = isGeneratedResultDownload ? generatedResultModal : pdfGenerations.downloadModal || {};

  if (!pdfGenerations.isCreatingArchive && !modal.isSubmitting) {
    return "";
  }

  const targetCount = isGeneratedResultDownload
    ? Array.isArray(generatedResultModal.generationIds)
      ? generatedResultModal.generationIds.length
      : 0
    : Array.isArray(pdfGenerations.selectedGenerationIds)
    ? pdfGenerations.selectedGenerationIds.length
    : 0;
  const mode = modal.mode === "merge" ? "merge" : "zip";
  const title = mode === "merge" ? "PDF 병합 다운로드 준비 중" : "PDF ZIP 다운로드 준비 중";
  const message = isGeneratedResultDownload
    ? mode === "merge"
      ? "이번에 생성된 PDF를 하나의 파일로 병합하고 있습니다."
      : "이번에 생성된 PDF 파일을 ZIP으로 묶고 있습니다."
    : mode === "merge"
    ? "선택한 PDF를 하나의 파일로 병합하고 있습니다."
    : "선택한 PDF 파일을 ZIP으로 묶고 있습니다.";
  const countLabel = isGeneratedResultDownload ? "이번 생성" : "선택";

  return `
    <div class="busy-overlay pdf-generation-download-busy-overlay" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="busy-overlay-backdrop"></div>
      <section class="busy-overlay-panel">
        <div class="busy-spinner" aria-hidden="true"></div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
        <div class="busy-overlay-progress" aria-hidden="true">
          <div class="busy-overlay-progress-meta">
            <span>다운로드 파일 준비</span>
            <span class="busy-overlay-progress-value">처리 중</span>
          </div>
          <div class="progress-bar is-indeterminate">
            <span></span>
          </div>
        </div>
        <p class="pdf-generation-download-busy-meta">${countLabel} ${formatCount(targetCount)}건</p>
      </section>
    </div>
  `;
}
