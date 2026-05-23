import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { DATA_DELETION_CONFIRMATION_PHRASE } from "./constants.js";

export function renderDataDeletionConfirmation({
  canConfirmSubmit,
  confirmationPhrase,
  isAll,
  isDeleting,
  modal,
  selectedItem,
  totalCount,
}) {
  return `
    <div class="modal-overlay data-deletion-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="dataDeletionConfirmTitle">
      <div class="modal-card data-deletion-confirm-card">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">데이터 삭제 확인</p>
            <h2 id="dataDeletionConfirmTitle">${escapeHtml(selectedItem?.title || "데이터")} 삭제</h2>
          </div>
          <button class="icon-button" data-action="close-data-deletion-confirm" type="button" aria-label="닫기" ${isDeleting ? "disabled" : ""}>&times;</button>
        </div>
        <form class="modal-form data-deletion-confirm-form" data-data-deletion-confirm-form>
          <p class="data-deletion-confirm-message">${escapeHtml(selectedItem?.title || "선택한 데이터")} ${formatCount(totalCount)}건을 삭제합니다. 실행 후에는 복구할 수 없습니다.</p>
          ${
            isAll
              ? `
                <label class="data-deletion-confirmation-field">
                  <span>전체 데이터 삭제 확인 문구</span>
                  <input
                    type="text"
                    value="${escapeHtml(confirmationPhrase)}"
                    data-data-deletion-confirmation-input
                    placeholder="${escapeHtml(DATA_DELETION_CONFIRMATION_PHRASE)}"
                    autocomplete="off"
                    ${isDeleting ? "disabled" : ""}
                  />
                  <small>"${escapeHtml(DATA_DELETION_CONFIRMATION_PHRASE)}"를 정확히 입력해야 삭제할 수 있습니다.</small>
                </label>
              `
              : ""
          }
          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions data-deletion-confirm-actions">
            <button class="ghost-button" data-action="close-data-deletion-confirm" type="button" ${isDeleting ? "disabled" : ""}>취소</button>
            <button class="primary-button danger-button" type="submit" ${canConfirmSubmit ? "" : "disabled"}>${isDeleting ? "삭제 중..." : "삭제 실행"}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}
