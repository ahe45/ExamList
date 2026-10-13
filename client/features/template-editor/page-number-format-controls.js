import "../../../shared/page-number-format.js";
import { escapeHtml } from "../../app/html-utils.js";
import {
  documentToolbarFontFamilyOptions,
  documentToolbarFontSizeOptions,
  documentToolbarTextColorPresets,
} from "./document-toolbar-config.js";

export const { normalizePageNumberFormat, getPageNumberFormatCss } = globalThis.ExamListPageNumberFormat;

export function renderPageNumberFormatModal(editor = {}) {
  const modal = editor.pageNumberFormatModal;
  if (!modal?.isOpen) return "";
  const page = editor.template?.layout?.pages?.find((item) => item.id === modal.pageId);
  const format = normalizePageNumberFormat(page?.settings?.pageNumber?.format);
  return `
    <div class="modal-overlay page-number-format-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pageNumberFormatTitle">
      <div class="modal-card page-number-format-modal-card">
        <div class="modal-header">
          <h2 id="pageNumberFormatTitle">페이지 번호 서식 설정</h2>
          <button type="button" class="icon-button" data-action="close-page-number-format-modal" aria-label="닫기">×</button>
        </div>
        <div class="page-number-format-body">
          <label><span>글꼴</span><select class="template-page-property-control" data-page-number-format-field="fontFamily">
            ${documentToolbarFontFamilyOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${format.fontFamily === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
          </select></label>
          <div class="page-number-format-grid">
            <label><span>크기 (pt)</span><input class="template-page-property-control" type="number" min="1" max="72" step="0.5" list="pageNumberFontSizes" value="${format.fontSizePt}" data-page-number-format-field="fontSizePt" required /></label>
            <label><span>글자색</span><input type="color" value="${format.color}" data-page-number-format-field="color" /></label>
          </div>
          <datalist id="pageNumberFontSizes">${documentToolbarFontSizeOptions.map((size) => `<option value="${size}"></option>`).join("")}</datalist>
          <div class="page-number-format-colors" role="group" aria-label="글자색 선택">
            ${documentToolbarTextColorPresets.map((color) => `<button type="button" data-action="set-page-number-format-color" data-color="${color.value}" style="--swatch-color:${color.value}" aria-label="${escapeHtml(color.label)}" title="${escapeHtml(color.label)}"></button>`).join("")}
          </div>
          <div class="page-number-format-style-field"><span>스타일</span>
            <div class="page-number-format-styles" role="group" aria-label="글자 스타일">
              ${[["bold", "굵게", "B"], ["italic", "기울임", "I"], ["underline", "밑줄", "U"]].map(([key, label, text]) => `<button type="button" data-action="toggle-page-number-format-style" data-style="${key}" aria-label="${label}" title="${label}" aria-pressed="${format[key]}">${text}</button>`).join("")}
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-page-number-format-modal">취소</button>
          <button class="primary-button" type="button" data-action="save-page-number-format-modal">저장</button>
        </div>
      </div>
    </div>`;
}

export function readPageNumberFormatControls(section, fallback) {
  const format = normalizePageNumberFormat(fallback);
  for (const key of ["fontFamily", "fontSizePt", "color"]) {
    const control = section.querySelector(`[data-page-number-format-field="${key}"]`);
    if (control && control.value !== "") format[key] = control.value;
  }
  section.querySelectorAll('[data-action="toggle-page-number-format-style"]').forEach((button) => {
    format[button.dataset.style] = button.getAttribute("aria-pressed") === "true";
  });
  return normalizePageNumberFormat(format);
}
