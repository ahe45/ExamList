import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

export function renderCandidateDownloadConfirmModal(candidates = {}) {
  const downloadConfirm = candidates.downloadConfirm || {};

  if (!downloadConfirm.isOpen) {
    return "";
  }

  return `
    <div class="modal-overlay candidate-modal-overlay" data-candidate-modal="download-confirm">
      <div class="modal-card candidate-download-confirm-modal">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">수험생 데이터</p>
            <h2>다운로드 확인</h2>
          </div>
          <button
            class="icon-button"
            data-action="cancel-candidate-download"
            ${downloadConfirm.isDownloading ? "disabled" : ""}
            type="button"
            aria-label="닫기"
          >×</button>
        </div>
        <p class="candidate-download-confirm-message">
          수험생 데이터 ${escapeHtml(formatCount(downloadConfirm.count))}건을 다운로드합니다.
        </p>
        <div class="modal-actions">
          <button
            class="ghost-button"
            data-action="cancel-candidate-download"
            ${downloadConfirm.isDownloading ? "disabled" : ""}
            type="button"
          >취소</button>
          <button
            class="primary-button"
            data-action="confirm-candidate-download"
            ${downloadConfirm.isDownloading ? "disabled" : ""}
            type="button"
          >
            ${downloadConfirm.isDownloading ? "다운로드 중..." : "다운로드"}
          </button>
        </div>
      </div>
    </div>
  `;
}
