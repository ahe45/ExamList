import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { getPdfGenerationVisibleFilterSteps } from "../pdf-generations/pdf-generation-flow.js";
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

  return `
    <label class="form-field data-deletion-filter-field ${hasSelection ? "is-selected" : "is-pending"}">
      <span>${escapeHtml(step.label)}</span>
      <select
        name="${escapeHtml(step.key)}"
        data-data-deletion-modal-filter="${escapeHtml(step.key)}"
        ${isLoadingOptions || isBusy ? "disabled" : ""}
      >
        ${renderDataDeletionFilterOptions(optionList, selectedValue, hasSelection)}
      </select>
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
