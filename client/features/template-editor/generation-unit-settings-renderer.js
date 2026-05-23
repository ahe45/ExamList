import { escapeHtml } from "../../app/html-utils.js";
import {
  generationUnitPriorityMaximum,
  getGenerationUnitFieldOptions,
  getTemplateGenerationUnitFields,
  getVisibleGenerationUnitPriorityRowCount,
  normalizeGenerationUnitFields,
} from "./generation-unit-settings.js";

export const generationUnitSettingsIcon = `
  <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .24 1.7 1.7 0 0 0-.82 1.46V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.36 19.45 1.7 1.7 0 0 0 7 19.2a1.7 1.7 0 0 0-.87.52l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3.64 15a1.7 1.7 0 0 0-.24-1 1.7 1.7 0 0 0-1.46-.82H2a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3.55 8.36 1.7 1.7 0 0 0 3.8 7a1.7 1.7 0 0 0-.52-.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8 3.64a1.7 1.7 0 0 0 1-.24 1.7 1.7 0 0 0 .82-1.46V2a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 14.64 3.55 1.7 1.7 0 0 0 16 3.8a1.7 1.7 0 0 0 .87-.52l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 8c.09.35.09.7 0 1a1.7 1.7 0 0 0 1.46.82H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.45 14.64c-.02.12-.04.24-.05.36Z"></path>
  </svg>
`;

function renderPriorityOptions({ selectedFields = [], selectedValue = "" } = {}) {
  const selectedFieldSet = new Set(
    normalizeGenerationUnitFields(selectedFields, [])
      .filter((field) => field !== selectedValue),
  );

  return [
    `<option value="" ${selectedValue ? "" : "selected"}>선택 안 함</option>`,
    ...getGenerationUnitFieldOptions().map((option) => {
      const isSelected = option.key === selectedValue;
      const isDisabled = selectedFieldSet.has(option.key);

      return `
        <option value="${escapeHtml(option.key)}" ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}>
          ${escapeHtml(option.label)}
        </option>
      `;
    }),
  ].join("");
}

function renderPriorityRow({ fields = [], index, visibleRowCount }) {
  const selectedValue = String(fields[index] || "").trim();
  const isHidden = index >= visibleRowCount;

  return `
    <label class="generation-unit-priority-row ${isHidden ? "hidden" : ""}" data-generation-unit-priority-row="${index + 1}">
      <span>${index + 1}순위</span>
      <select
        class="template-page-property-control"
        data-generation-unit-priority="${index + 1}"
        aria-label="${index + 1}순위 생성 단위"
      >
        ${renderPriorityOptions({ selectedFields: fields, selectedValue })}
      </select>
    </label>
  `;
}

export function renderGenerationUnitSettingsModal(editor = {}) {
  const modal = editor.generationUnitModal || {};

  if (!modal.isOpen) {
    return "";
  }

  const fields = getTemplateGenerationUnitFields(editor.template);
  const visibleRowCount = getVisibleGenerationUnitPriorityRowCount(fields);

  return `
    <div class="modal-overlay generation-unit-settings-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="generationUnitSettingsTitle">
      <div class="modal-card generation-unit-settings-modal-card">
        <div class="modal-header">
          <div>
            <h2 id="generationUnitSettingsTitle">생성 단위 설정</h2>
          </div>
          <button class="icon-button" data-action="close-generation-unit-settings-modal" type="button" aria-label="닫기">×</button>
        </div>
        <div class="generation-unit-settings-modal-body">
          <div class="generation-unit-priority-list">
            ${Array.from({ length: generationUnitPriorityMaximum }, (_, index) =>
              renderPriorityRow({ fields, index, visibleRowCount }),
            ).join("")}
          </div>
        </div>
        <div class="modal-actions generation-unit-settings-modal-actions">
          <button class="ghost-button" data-action="close-generation-unit-settings-modal" type="button">취소</button>
          <button class="primary-button" data-action="save-generation-unit-settings-modal" type="button">저장</button>
        </div>
      </div>
    </div>
  `;
}
