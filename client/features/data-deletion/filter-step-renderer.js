import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  getPdfGenerationVisibleFilterSteps,
  pdfGenerationCreateRequiredFilterKeys,
} from "../pdf-generations/pdf-generation-flow.js";
import { dataDeletionGenerationUnit } from "./constants.js";

const unselectedFilterValue = "__pdf_generation_unselected__";

function renderDataDeletionFilterOptions(options = [], selectedValue = "", hasSelection = false) {
  const renderedOptions = (Array.isArray(options) ? options : [])
    .map((option) => {
      const value = String(option?.value || "").trim();

      if (!value) {
        return "";
      }

      const candidateCount = Number(option?.candidateCount) || 0;

      return `
        <option value="${escapeHtml(value)}" ${hasSelection && value === selectedValue ? "selected" : ""}>
          ${escapeHtml(value)}${candidateCount ? ` (${formatCount(candidateCount)})` : ""}
        </option>
      `;
    })
    .join("");

  return `
    <option value="${unselectedFilterValue}" ${hasSelection ? "" : "selected"} disabled>선택</option>
    <option value="" ${hasSelection && !selectedValue ? "selected" : ""}>전체</option>
    ${renderedOptions}
  `;
}

function getDataDeletionOptionList(modal, key) {
  return Array.isArray(modal.options?.[key]) ? modal.options[key] : [];
}

function renderDataDeletionFilterField({ filters, isBusy, isLoadingOptions, modal, selectedFilterKeys, step }) {
  const selectedValue = String(filters[step.key] || "");
  const optionList = getDataDeletionOptionList(modal, step.key);
  const hasSelection = selectedFilterKeys.includes(step.key);
  const isRequired = pdfGenerationCreateRequiredFilterKeys.includes(step.key);
  const isDisabled = Boolean(isLoadingOptions || isBusy);

  return `
    <label class="form-field data-deletion-filter-field ${hasSelection ? "is-selected" : "is-pending"} ${isRequired ? "is-required" : ""}">
      <span class="${isDisabled ? "is-disabled" : ""}">
        <span>${escapeHtml(step.label)}</span>
      </span>
      <div class="field-control-with-required ${isRequired ? "has-required-badge" : ""} ${isDisabled ? "is-disabled" : ""}">
        <select
          name="${escapeHtml(step.key)}"
          data-data-deletion-modal-filter="${escapeHtml(step.key)}"
          ${isDisabled ? "disabled" : ""}
        >
          ${renderDataDeletionFilterOptions(optionList, selectedValue, hasSelection)}
        </select>
        ${isRequired ? '<span class="field-required-badge">필수</span>' : ""}
      </div>
    </label>
  `;
}

export function renderDataDeletionFilterList({ filters, isBusy, isLoadingOptions, modal, selectedFilterKeys }) {
  const visibleSteps = getPdfGenerationVisibleFilterSteps(dataDeletionGenerationUnit);

  return `
    <div class="data-deletion-filter-list">
      ${visibleSteps
        .map((step) =>
          renderDataDeletionFilterField({
            filters,
            isBusy,
            isLoadingOptions,
            modal,
            selectedFilterKeys,
            step,
          }),
        )
        .join("")}
    </div>
  `;
}
