import { escapeHtml } from "../../app/html-utils.js";
import { candidateDetailFields } from "./candidate-table-model.js";

function renderCandidateDetailField(field, draftRecord = {}) {
  return `
    <label class="form-field">
      <span>${escapeHtml(field.label)}</span>
      <input
        data-candidate-detail-field="${escapeHtml(field.key)}"
        type="${escapeHtml(field.type || "text")}"
        value="${escapeHtml(draftRecord[field.key] || "")}"
      />
    </label>
  `;
}

function renderCandidateDetailPhoto(detail = {}) {
  const originalRecord = detail.originalRecord || {};
  const candidateId = String(originalRecord.id || "");
  const hasPhoto = Boolean(originalRecord.hasPhoto || originalRecord.photoFileId);
  const photoVersion = encodeURIComponent(String(originalRecord.photoVersion || Date.now()));
  const photoUrl = candidateId
    ? `/api/candidates/${encodeURIComponent(candidateId)}/photo?v=${photoVersion}`
    : "";

  return `
    <aside class="candidate-detail-photo-panel">
      <div class="candidate-detail-photo-frame">
        ${
          hasPhoto && photoUrl
            ? `<img class="candidate-detail-photo-image" src="${escapeHtml(photoUrl)}" alt="수험생 사진" />`
            : `
              <div class="candidate-detail-photo-placeholder">
                <strong>사진 없음</strong>
                <span>JPG, JPEG, PNG 파일을 등록할 수 있습니다.</span>
              </div>
            `
        }
      </div>
      <input accept="image/jpeg,image/png" class="hidden" data-candidate-detail-photo-file type="file" />
      <button class="outline-button" data-action="trigger-candidate-photo-upload" ${detail.isPhotoUploading ? "disabled" : ""} type="button">
        ${detail.isPhotoUploading ? "사진 저장 중..." : "사진 업로드"}
      </button>
    </aside>
  `;
}

export function renderCandidateDetailModal(candidates = {}) {
  const detail = candidates.detail || {};

  if (!detail.isOpen) {
    return "";
  }

  return `
    <div class="modal-overlay candidate-modal-overlay" data-candidate-modal="detail">
      <div class="modal-card candidate-detail-modal">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">수험생 데이터</p>
            <h2>수험생 정보 수정</h2>
          </div>
          <button class="icon-button" data-action="close-candidate-detail-modal" type="button" aria-label="닫기">×</button>
        </div>
        <div class="candidate-detail-layout">
          <div class="candidate-detail-field-grid">
            ${candidateDetailFields.map((field) => renderCandidateDetailField(field, detail.draftRecord || {})).join("")}
          </div>
          ${renderCandidateDetailPhoto(detail)}
        </div>
        <div class="modal-actions">
          <button class="ghost-button" data-action="close-candidate-detail-modal" type="button">취소</button>
          <button class="primary-button" data-action="save-candidate-detail" ${detail.isSaving ? "disabled" : ""} type="button">
            ${detail.isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  `;
}

