import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { getDataDeletionItem, normalizeDataDeletionScope } from "./constants.js";
import { getDataDeletionScopeSummary } from "./state.js";

function renderDataDeletionProgressCounts(items = []) {
  if (!items.length) {
    return "";
  }

  return `
    <div class="data-deletion-progress-counts">
      ${items
        .map(
          (item) => `
            <span>
              <strong>${escapeHtml(item.label || "대상")}</strong>
              <em>${formatCount(item.count)}건</em>
            </span>
          `,
        )
        .join("")}
    </div>
  `;
}

export function renderDataDeletionProgressOverlay(dataDeletion = {}) {
  const modal = dataDeletion.modal || {};

  if (!dataDeletion?.isDeleting && !modal.isDeleting) {
    return "";
  }

  const progress = dataDeletion.progressOverlay || {};
  const selectedScope = normalizeDataDeletionScope(dataDeletion.activeScope || modal.selectedScope);
  const selectedItem = getDataDeletionItem(selectedScope);
  const scopeSummary = getDataDeletionScopeSummary(modal.summary, selectedScope);
  const totalCount = Number(scopeSummary?.totalCount) || 0;
  const countItems = Array.isArray(scopeSummary?.items) ? scopeSummary.items : [];
  const title = `${selectedItem?.title || "데이터"} 삭제 중`;
  const message = String(progress.message || "").trim() || "삭제 요청을 처리하고 있습니다. 화면을 닫지 마세요.";
  const stageLabel = String(progress.stageLabel || "").trim() || "삭제 처리";

  return `
    <div class="busy-overlay data-deletion-progress-overlay" role="alert" aria-live="polite" aria-busy="true" data-data-deletion-progress-overlay>
      <div class="busy-overlay-backdrop"></div>
      <section class="busy-overlay-panel data-deletion-progress-card">
        <div class="busy-spinner" aria-hidden="true"></div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
        <div class="busy-overlay-progress" aria-label="데이터 삭제 진행 상태">
          <div class="busy-overlay-progress-meta">
            <span>${escapeHtml(stageLabel)}</span>
            <span class="busy-overlay-progress-value">${totalCount > 0 ? `총 ${formatCount(totalCount)}건` : "처리 중"}</span>
          </div>
          <div class="progress-bar is-indeterminate">
            <span></span>
          </div>
        </div>
        ${renderDataDeletionProgressCounts(countItems)}
      </section>
    </div>
  `;
}
