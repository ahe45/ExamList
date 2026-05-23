import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${paddedMinutes}:${paddedSeconds}`;
}

export function renderPdfGenerationProgressOverlay(pdfGenerations = {}) {
  const activeGeneration = pdfGenerations.activeGeneration || {};

  if (!activeGeneration.isOpen) {
    return "";
  }

  const progressPercent = Math.min(Math.max(Math.round(Number(activeGeneration.progressPercent) || 0), 0), 100);
  const completedCount = Math.max(0, Number(activeGeneration.completedCount) || 0);
  const totalRequested = Math.max(0, Number(activeGeneration.totalRequested) || 0);
  const elapsedSeconds = Math.max(0, Number(activeGeneration.elapsedSeconds) || 0);
  const estimatedSeconds = Math.max(0, Number(activeGeneration.estimatedSeconds) || 0);
  const canCancel = Boolean(activeGeneration.batchId && activeGeneration.canCancel && !activeGeneration.isCancelling);

  return `
    <div class="busy-overlay pdf-generation-progress-overlay" role="alert" aria-live="polite">
      <div class="busy-overlay-backdrop"></div>
      <section class="busy-overlay-panel pdf-generation-progress-card">
        <div class="busy-spinner" aria-hidden="true"></div>
        <div class="pdf-generation-progress-header">
          <strong data-pdf-generation-progress-label>${escapeHtml(activeGeneration.label || "PDF 생성 중")}</strong>
          <div class="pdf-generation-progress-header-actions">
            <span data-pdf-generation-progress-percent>${progressPercent}%</span>
            <button
              class="pdf-generation-progress-cancel-button"
              data-action="cancel-active-pdf-generation"
              type="button"
              ${canCancel ? "" : "disabled"}
            >${activeGeneration.isCancelling ? "중단 중" : "중단"}</button>
          </div>
        </div>
        <div class="progress-bar pdf-generation-progress-track" aria-label="PDF 생성 진행률">
          <span class="pdf-generation-progress-value" data-pdf-generation-progress-value style="width: ${progressPercent}%"></span>
        </div>
        <div class="pdf-generation-progress-summary">
          <span class="pdf-generation-progress-completed" data-pdf-generation-progress-completed>진행 ${formatCount(completedCount)}개 / 총 ${formatCount(totalRequested)}개</span>
          <span class="pdf-generation-progress-duration" data-pdf-generation-progress-duration>시간 ${formatDuration(elapsedSeconds)} / 예상 ${estimatedSeconds ? formatDuration(estimatedSeconds) : "계산 중"}</span>
        </div>
      </section>
    </div>
  `;
}
