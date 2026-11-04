import { escapeHtml } from "../../app/html-utils.js";

export function renderOtherRoomSettingsModal(editor = {}) {
  const modal = editor.otherRoomSettingsModal;
  if (!modal?.isOpen) return "";
  const page = editor.template?.layout?.pages?.find((item) => item.id === modal.pageId);
  const text = page?.settings?.otherRoomPage?.text ?? "타고사실";
  return `
    <div class="modal-overlay other-room-settings-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="otherRoomSettingsTitle">
      <div class="modal-card page-number-format-modal-card">
        <div class="modal-header">
          <h2 id="otherRoomSettingsTitle">타 고사실 설정</h2>
          <button type="button" class="icon-button" data-action="close-other-room-settings-modal" aria-label="닫기">×</button>
        </div>
        <div class="page-number-format-body">
          <label><span>타고사실 데이터태그 문구</span>
            <input class="template-page-property-control" type="text" data-other-room-text value="${escapeHtml(text)}" />
          </label>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-other-room-settings-modal">취소</button>
          <button class="primary-button" type="button" data-action="save-other-room-settings-modal">저장</button>
        </div>
      </div>
    </div>`;
}
