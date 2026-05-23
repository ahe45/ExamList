import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { renderTemplateCreateModal } from "./template-create-modal-renderer.js";
import { renderTemplateCardThumbnail } from "./thumbnail.js";

function formatUpdatedAtLabel(value = "") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}년 ${pad(date.getMonth() + 1)}월 ${pad(date.getDate())}일 ${pad(date.getHours())}시 ${pad(date.getMinutes())}분 ${pad(date.getSeconds())}초`;
}

const templateActionIcons = Object.freeze({
  cancel: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 7 10 10"></path>
      <path d="M17 7 7 17"></path>
    </svg>
  `,
  check: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5 9.2 16.7 19 7.5"></path>
    </svg>
  `,
  copy: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2"></rect>
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
    </svg>
  `,
  edit: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H13"></path>
      <path d="M18.5 11V18A1.5 1.5 0 0 1 17 19.5H6.5A1.5 1.5 0 0 1 5 18V5.5"></path>
      <path d="m10 14 7.5-7.5 2 2L12 16l-3 .5z"></path>
    </svg>
  `,
  trash: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    </svg>
  `,
});

function isTemplateCardMetaEditorActive(cardEditor = {}, templateId = "", field = "") {
  return cardEditor.activeTemplateId === templateId && cardEditor.field === field;
}

function getTemplateCardMetaEditorInputId(templateId = "", field = "") {
  return `templateCardMetaEditor-${templateId}-${field}`;
}

function renderTemplateCardMetaEditButton(templateId, field, label) {
  return `
    <button
      class="icon-button template-card-meta-edit-button"
      data-action="edit-template-card-meta"
      data-template-id="${escapeHtml(templateId)}"
      data-template-field="${escapeHtml(field)}"
      type="button"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
    >
      ${templateActionIcons.edit}
    </button>
  `;
}

function renderTemplateCardMetaEditor(item, field, cardEditor = {}, options = {}) {
  const isActive = isTemplateCardMetaEditorActive(cardEditor, item.id, field);
  const isSaving = isActive && cardEditor.isSaving;
  const inputId = getTemplateCardMetaEditorInputId(item.id, field);
  const draftValue = isActive ? cardEditor.draftValue : String(item[field] || "");
  const displayValue = String(item[field] || "").trim();
  const fallbackValue = field === "description" ? "설명 없음" : "";
  const tagName = options.tagName || "p";
  const inputLabel = options.inputLabel || "";
  const placeholder = options.placeholder || "";
  const canEdit = options.canEdit !== false;

  if (!isActive) {
    return `
      <div class="template-card-meta-row template-card-meta-row-${escapeHtml(field)}">
        <${tagName}>${escapeHtml(displayValue || fallbackValue)}</${tagName}>
        ${canEdit ? renderTemplateCardMetaEditButton(item.id, field, inputLabel) : ""}
      </div>
    `;
  }

  return `
    <div class="template-card-meta-editor template-card-meta-editor-${escapeHtml(field)}">
      <label class="sr-only" for="${escapeHtml(inputId)}">${escapeHtml(inputLabel)}</label>
      <input
        class="template-card-meta-input"
        id="${escapeHtml(inputId)}"
        data-template-card-input="${escapeHtml(item.id)}"
        data-template-field="${escapeHtml(field)}"
        type="text"
        maxlength="${field === "name" ? "200" : "255"}"
        value="${escapeHtml(draftValue)}"
        placeholder="${escapeHtml(placeholder)}"
        ${isSaving ? "disabled" : ""}
      />
      <div class="template-card-meta-editor-actions">
        <button
          class="icon-button template-card-meta-action-button template-card-meta-save-button"
          data-action="save-template-card-meta"
          data-template-id="${escapeHtml(item.id)}"
          data-template-field="${escapeHtml(field)}"
          type="button"
          aria-label="저장"
          title="저장"
          ${isSaving ? "disabled" : ""}
        >
          ${templateActionIcons.check}
        </button>
        <button
          class="icon-button template-card-meta-action-button template-card-meta-cancel-button"
          data-action="cancel-template-card-meta"
          data-template-id="${escapeHtml(item.id)}"
          data-template-field="${escapeHtml(field)}"
          type="button"
          aria-label="취소"
          title="취소"
          ${isSaving ? "disabled" : ""}
        >
          ${templateActionIcons.cancel}
        </button>
      </div>
    </div>
  `;
}

function renderTemplateCards(items = [], access = null, cardEditor = {}) {
  if (!items.length) {
    return `
      <div class="template-empty-card">
        <strong>저장된 양식이 없습니다.</strong>
        <p>새 양식을 만들어 수험생확인대장 PDF를 구성하세요.</p>
      </div>
    `;
  }

  return items
    .map(
      (item) => `
        <article class="template-card" data-template-id="${escapeHtml(item.id)}">
          <div class="section-header template-card-header">
            <div class="template-card-heading">
              ${renderTemplateCardMetaEditor(item, "name", cardEditor, {
                tagName: "h3",
                inputLabel: "양식명 수정",
                placeholder: "양식명을 입력하세요.",
                canEdit: hasAccess(access, "manageTemplates"),
              })}
              ${renderTemplateCardMetaEditor(item, "description", cardEditor, {
                tagName: "p",
                inputLabel: "양식 설명 수정",
                placeholder: "양식 설명을 입력하세요.",
                canEdit: hasAccess(access, "manageTemplates"),
              })}
            </div>
          </div>

          ${renderTemplateCardThumbnail(item)}

          <div class="template-card-updated-row">
            <span class="template-card-updated-at">최종수정일시 : ${escapeHtml(formatUpdatedAtLabel(item.updatedAt))}</span>
          </div>

          <div class="template-card-actions">
            <button class="primary-button template-card-action-button" data-action="edit-template" data-template-id="${escapeHtml(item.id)}" type="button">
              <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"></path>
                <path d="m12.5 7 4.5 4.5"></path>
              </svg>
              <span>수정</span>
            </button>
            ${
              hasAccess(access, "manageTemplates") || hasAccess(access, "deleteTemplates")
                ? `
                  <div class="template-card-action-tools">
                    ${
                      hasAccess(access, "manageTemplates")
                        ? `<button class="template-icon-action" data-action="duplicate-template" data-template-id="${escapeHtml(item.id)}" type="button" aria-label="${escapeHtml(item.name)} 복사" title="복사">${templateActionIcons.copy}</button>`
                        : ""
                    }
                    ${
                      hasAccess(access, "deleteTemplates")
                        ? `<button class="template-icon-action danger" data-action="delete-template" data-template-id="${escapeHtml(item.id)}" type="button" aria-label="${escapeHtml(item.name)} 삭제" title="삭제">${templateActionIcons.trash}</button>`
                        : ""
                    }
                  </div>
                `
                : ""
            }
          </div>
        </article>
      `,
    )
    .join("");
}

export function renderTemplateListView({ access, templates }) {
  return `
    <section class="view-stack table-view-stack template-management-panel">
      <article class="table-card result-grid-card template-management-card">
        <div class="section-header">
          <div class="menu-section-copy">
            <h3>양식 관리</h3>
            <p>수험생확인대장 양식을 만들고 수정, 복사, 삭제합니다.</p>
          </div>
          <div class="table-header-actions template-management-header-actions">
            <span class="status-badge neutral">총 ${formatCount(Number(templates.total) || (Array.isArray(templates.items) ? templates.items.length : 0))}건</span>
            ${
              hasAccess(access, "manageTemplates")
                ? `
                  <button class="primary-button" data-action="create-template" type="button">
                    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14"></path>
                      <path d="M5 12h14"></path>
                    </svg>
                    <span>새 양식</span>
                  </button>
                `
                : ""
            }
          </div>
        </div>

        <div class="template-grid">
          ${renderTemplateCards(templates.items, access, templates.cardEditor)}
        </div>
      </article>
      ${renderTemplateCreateModal(templates)}
    </section>
  `;
}
