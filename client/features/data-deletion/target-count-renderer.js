import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

function renderDataDeletionCountItem(item = {}, isLoading = false) {
  return `
    <div class="data-deletion-modal-count-item">
      <div>
        <strong>${escapeHtml(item.label || "대상 데이터")}</strong>
      </div>
      <em>${isLoading ? "-" : `${formatCount(item.count)}건`}</em>
    </div>
  `;
}

export function renderDataDeletionTargetCounts({ isLoading, scopeSummary }) {
  const items = Array.isArray(scopeSummary?.items) ? scopeSummary.items : [];

  if (isLoading) {
    return `
      <div class="data-deletion-modal-count-list">
        ${Array.from({ length: 4 }, () => renderDataDeletionCountItem({ label: "불러오는 중" }, true)).join("")}
      </div>
    `;
  }

  if (!items.length) {
    return '<p class="helper-text data-deletion-modal-empty">삭제 대상 건수를 불러오지 못했습니다.</p>';
  }

  return `
    <div class="data-deletion-modal-count-list">
      ${items.map((item) => renderDataDeletionCountItem(item, false)).join("")}
    </div>
  `;
}
