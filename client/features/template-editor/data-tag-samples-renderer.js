import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { dataTagAccordionGroups, renderDataTagIcon } from "./data-tags-config.js";
import { flattenTemplateTags } from "./data-tags-definitions.js";
import {
  normalizeDataTagEmptyValueData,
  normalizeDataTagSampleValues,
} from "./data-tag-samples.js";
import {
  buildDataTagSampleValueErrors,
  getDataTagSampleValueConstraint,
  getDataTagSampleValueError,
  hasDataTagSampleValueErrors,
} from "./data-tag-value-formatting.js";

export const dataTagSampleSettingsIcon = `
  <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .24 1.7 1.7 0 0 0-.82 1.46V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.36 19.45 1.7 1.7 0 0 0 7 19.2a1.7 1.7 0 0 0-.87.52l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3.64 15a1.7 1.7 0 0 0-.24-1 1.7 1.7 0 0 0-1.46-.82H2a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3.55 8.36 1.7 1.7 0 0 0 3.8 7a1.7 1.7 0 0 0-.52-.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8 3.64a1.7 1.7 0 0 0 1-.24 1.7 1.7 0 0 0 .82-1.46V2a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 14.64 3.55 1.7 1.7 0 0 0 16 3.8a1.7 1.7 0 0 0 .87-.52l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 8c.09.35.09.7 0 1a1.7 1.7 0 0 0 1.46.82H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.45 14.64c-.02.12-.04.24-.05.36Z"></path>
  </svg>
`;

function getGroupedSampleTagDefinitions(tagDefinitions = []) {
  const tagMap = new Map(
    (Array.isArray(tagDefinitions) ? tagDefinitions : []).map((definition) => [String(definition.key || "").trim(), definition]),
  );
  const usedKeys = new Set();
  const groups = dataTagAccordionGroups.map((group) => {
    const tags = group.keys.map((key) => tagMap.get(key)).filter(Boolean);

    tags.forEach((tag) => usedKeys.add(tag.key));

    return {
      ...group,
      tags,
    };
  });
  const uncategorizedTags = Array.from(tagMap.values()).filter((tag) => !usedKeys.has(tag.key));

  if (uncategorizedTags.length) {
    const etcGroup = groups.find((group) => group.id === "etc");

    if (etcGroup) {
      etcGroup.tags = [...etcGroup.tags, ...uncategorizedTags];
    }
  }

  return groups.filter((group) => group.tags.length);
}

function createSampleErrorId(key = "") {
  return `dataTagSampleError-${String(key || "").replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

function renderSampleRows(group, sampleValues, emptyValueData, sampleErrors = {}) {
  return group.tags
    .map((tag) => {
      const key = String(tag.key || "").trim();
      const label = String(tag.label || key).trim();
      const sampleValue = Object.prototype.hasOwnProperty.call(sampleValues, key) ? sampleValues[key] : String(tag.example || "");
      const emptyValue = Object.prototype.hasOwnProperty.call(emptyValueData, key) ? emptyValueData[key] : label || key;
      const titleText = [label, key].map((value) => String(value || "").trim()).filter(Boolean).join(" · ");
      const sampleConstraint = getDataTagSampleValueConstraint(tag);
      const sampleError = String(sampleErrors[key] || getDataTagSampleValueError(tag, sampleValue) || "");
      const sampleErrorId = createSampleErrorId(key);

      return `
        <div class="data-tag-sample-row">
          <span
            class="template-tag-button template-tag-accordion-button data-tag-sample-tag"
            title="${escapeHtml(titleText || key)}"
          >
            <span class="template-tag-button-icon">${renderDataTagIcon(group.icon)}</span>
            <span class="template-tag-button-label">${escapeHtml(label || key)}</span>
          </span>
          <label class="data-tag-sample-field">
            <span class="data-tag-sample-field-label">샘플데이터</span>
            <input
              class="data-tag-sample-input"
              data-data-tag-sample-key="${escapeHtml(key)}"
              data-data-tag-setting-kind="sample"
              ${sampleConstraint?.formatLabel ? `data-data-tag-sample-format="${escapeHtml(sampleConstraint.formatLabel)}"` : ""}
              type="text"
              value="${escapeHtml(sampleValue)}"
              ${sampleConstraint?.placeholder ? `placeholder="${escapeHtml(sampleConstraint.placeholder)}"` : ""}
              ${sampleConstraint?.inputMode ? `inputmode="${escapeHtml(sampleConstraint.inputMode)}"` : ""}
              ${sampleConstraint?.maxLength ? `maxlength="${escapeHtml(sampleConstraint.maxLength)}"` : ""}
              ${sampleError ? `aria-invalid="true" aria-describedby="${escapeHtml(sampleErrorId)}"` : ""}
              autocomplete="off"
            />
          </label>
          <label class="data-tag-sample-field">
            <span class="data-tag-sample-field-label">빈 값 데이터</span>
            <input
              class="data-tag-sample-input"
              data-data-tag-empty-value-key="${escapeHtml(key)}"
              data-data-tag-setting-kind="empty"
              type="text"
              value="${escapeHtml(emptyValue)}"
              autocomplete="off"
            />
          </label>
          <p
            class="data-tag-sample-error${sampleError ? "" : " hidden"}"
            data-data-tag-sample-error
            id="${escapeHtml(sampleErrorId)}"
          >${escapeHtml(sampleError)}</p>
        </div>
      `;
    })
    .join("");
}

function renderSampleGroup(group, sampleValues, emptyValueData, sampleErrors) {
  return `
    <details class="template-tag-accordion-group">
      <summary class="template-tag-accordion-summary">
          <span class="template-tag-group-heading">
            <span class="template-tag-group-icon">${renderDataTagIcon(group.icon)}</span>
            <span class="template-tag-group-label">${escapeHtml(group.label)}</span>
          <span class="template-tag-group-count">${formatCount(group.tags.length)}</span>
        </span>
        <span class="template-tag-group-chevron" aria-hidden="true"></span>
      </summary>
      <div class="template-tag-accordion-list data-tag-sample-list">
        ${renderSampleRows(group, sampleValues, emptyValueData, sampleErrors)}
      </div>
    </details>
  `;
}

export function renderDataTagSampleModal(editor = {}) {
  const modalState = editor.dataTagSampleModal || {};

  if (!modalState.isOpen) {
    return "";
  }

  const isSaving = Boolean(editor.isSavingDataTagSettings);
  const baseDefinitions = flattenTemplateTags(editor.dataTags);
  const sampleValues = normalizeDataTagSampleValues(baseDefinitions, modalState.draftValues || editor.dataTagSampleValues || {});
  const emptyValueData = normalizeDataTagEmptyValueData(
    baseDefinitions,
    modalState.draftEmptyValueData || editor.dataTagEmptyValueData || {},
  );
  const sampleErrors = {
    ...buildDataTagSampleValueErrors(baseDefinitions, sampleValues),
    ...(modalState.sampleErrors || {}),
  };
  const hasSampleErrors = hasDataTagSampleValueErrors(sampleErrors);
  const groups = getGroupedSampleTagDefinitions(baseDefinitions);

  return `
    <div class="modal-overlay data-tag-sample-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dataTagSampleModalTitle">
      <div class="modal-card data-tag-sample-modal-card">
        <div class="modal-header">
          <div>
            <h2 id="dataTagSampleModalTitle">데이터 태그 설정</h2>
          </div>
          <button class="icon-button" data-action="close-data-tag-sample-modal" type="button" aria-label="닫기" ${isSaving ? "disabled" : ""}>×</button>
        </div>

        <div class="data-tag-sample-modal-body">
          <div class="template-tag-accordion data-tag-sample-accordion">
            ${groups.map((group) => renderSampleGroup(group, sampleValues, emptyValueData, sampleErrors)).join("")}
          </div>
        </div>

        <div class="modal-actions data-tag-sample-modal-actions">
          <button class="ghost-button" data-action="reset-data-tag-sample-modal" type="button" ${isSaving ? "disabled" : ""}>기본값 복원</button>
          <span class="data-tag-sample-action-spacer"></span>
          <button class="ghost-button" data-action="close-data-tag-sample-modal" type="button" ${isSaving ? "disabled" : ""}>취소</button>
          <button class="primary-button" data-action="save-data-tag-sample-modal" type="button" ${isSaving || hasSampleErrors ? "disabled" : ""}>${isSaving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  `;
}
