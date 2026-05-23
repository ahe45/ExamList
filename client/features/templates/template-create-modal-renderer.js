import { escapeHtml } from "../../app/html-utils.js";

function renderTemplateCreateModeOption({ checked, description, disabled, label, value }) {
  return `
    <label class="template-create-mode-option ${checked ? "selected" : ""}">
      <input
        data-template-create-mode
        name="templateCreateMode"
        type="radio"
        value="${escapeHtml(value)}"
        ${checked ? "checked" : ""}
        ${disabled ? "disabled" : ""}
      />
      <span>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(description)}</small>
      </span>
    </label>
  `;
}

function renderTemplateCreateSchoolOptions(schools = [], selectedSchoolId = "") {
  if (!schools.length) {
    return '<option value="">선택 가능한 학교가 없습니다</option>';
  }

  return [
    '<option value="">학교 선택</option>',
    ...schools.map(
      (school) => `
        <option value="${escapeHtml(school.id || "")}" ${String(school.id || "") === selectedSchoolId ? "selected" : ""}>
          ${escapeHtml(school.name || school.code || "")}
        </option>
      `,
    ),
  ].join("");
}

function renderTemplateCreateSourceTemplates(modal = {}) {
  const templates = Array.isArray(modal.sourceTemplates) ? modal.sourceTemplates : [];
  const selectedTemplateId = String(modal.selectedTemplateId || "");

  if (!modal.selectedSchoolId) {
    return "";
  }

  if (modal.isLoadingTemplates) {
    return '<p class="helper-text template-create-copy-message">양식 목록을 불러오는 중입니다.</p>';
  }

  if (!templates.length) {
    return '<p class="helper-text template-create-copy-message">선택한 학교에 복사할 양식이 없습니다.</p>';
  }

  return `
    <div class="template-create-source-list" role="radiogroup" aria-label="복사할 양식">
      ${templates
        .map(
          (template) => `
            <label class="template-create-source-item ${String(template.id || "") === selectedTemplateId ? "selected" : ""}">
              <input
                data-template-create-source-template
                name="templateCreateSourceTemplate"
                type="radio"
                value="${escapeHtml(template.id || "")}"
                ${String(template.id || "") === selectedTemplateId ? "checked" : ""}
                ${modal.isSubmitting ? "disabled" : ""}
              />
              <span>
                <strong>${escapeHtml(template.name || "이름 없는 양식")}</strong>
                <small>${escapeHtml(template.description || "설명 없음")}</small>
              </span>
            </label>
          `,
        )
        .join("")}
    </div>
  `;
}

export function renderTemplateCreateModal(templates = {}) {
  const modal = templates.createModal || {};

  if (!modal.isOpen) {
    return "";
  }

  const mode = ["blank", "default", "copy"].includes(modal.mode) ? modal.mode : "default";
  const isCopyMode = mode === "copy";
  const canSubmit =
    !modal.isSubmitting &&
    !modal.isLoadingSchools &&
    !modal.isLoadingTemplates &&
    (!isCopyMode || Boolean(modal.selectedSchoolId && modal.selectedTemplateId));

  return `
    <div class="modal-overlay template-create-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="templateCreateModalTitle">
      <div class="modal-card template-create-modal-card">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">양식 관리</p>
            <h2 id="templateCreateModalTitle">새 양식</h2>
          </div>
          <button class="icon-button" data-action="close-template-create-modal" type="button" aria-label="닫기">×</button>
        </div>
        <form class="modal-form template-create-form" data-template-create-form>
          <div class="template-create-mode-grid" role="radiogroup" aria-label="양식 생성 방식">
            ${renderTemplateCreateModeOption({
              checked: mode === "blank",
              description: "빈 A4 양식",
              disabled: modal.isSubmitting,
              label: "빈 템플릿",
              value: "blank",
            })}
            ${renderTemplateCreateModeOption({
              checked: mode === "default",
              description: "기본 수험생확인대장",
              disabled: modal.isSubmitting,
              label: "기본 템플릿",
              value: "default",
            })}
            ${renderTemplateCreateModeOption({
              checked: mode === "copy",
              description: "다른 학교 양식",
              disabled: modal.isSubmitting,
              label: "다른 학교 양식 복사",
              value: "copy",
            })}
          </div>

          ${
            isCopyMode
              ? `
                <div class="template-create-copy-panel">
                  <label class="form-field">
                    <span>학교</span>
                    <select data-template-create-school name="sourceSchoolId" ${modal.isLoadingSchools || modal.isSubmitting ? "disabled" : ""}>
                      ${
                        modal.isLoadingSchools
                          ? '<option value="">학교 목록을 불러오는 중입니다</option>'
                          : renderTemplateCreateSchoolOptions(modal.schools || [], String(modal.selectedSchoolId || ""))
                      }
                    </select>
                  </label>
                  ${renderTemplateCreateSourceTemplates(modal)}
                </div>
              `
              : ""
          }

          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions">
            <button class="ghost-button" data-action="close-template-create-modal" type="button">취소</button>
            <button class="primary-button" type="submit" ${canSubmit ? "" : "disabled"}>
              ${modal.isSubmitting ? "생성 중..." : isCopyMode ? "복사" : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
