import { escapeHtml } from "../../app/html-utils.js";
import { formatCount, formatOptionalCountWithUnit } from "../../app/number-format.js";
import {
  createEmptyPdfGenerationFilters,
  getPdfGenerationRevealedFilterSteps,
  isPdfGenerationCreateConditionComplete,
  normalizePdfGenerationSelectedFilterKeys,
} from "./pdf-generation-flow.js";
import {
  formatGenerationUnitLabel,
  formatOrientationLabel,
} from "./pdf-generation-render-helpers.js";
import {
  candidateBlockGridSortOptions,
  normalizeCandidateBlockGridConfig,
} from "../template-editor/candidate-block-grid-config.js";
import {
  formatGenerationUnitFieldsSummary,
  getTemplateGenerationUnitFields,
} from "../template-editor/generation-unit-settings.js";

const generationUnitTargetFilterMap = Object.freeze({
  admission: "admissionCode",
  admissionCode: "admissionCode",
  buildingCode: "buildingCode",
  exam: "examDate",
  examDate: "examDate",
  group: "group",
  periodCode: "periodCode",
  room: "roomCode",
  roomCode: "roomCode",
  seriesCode: "seriesCode",
  unit: "unitCode",
  unitCode: "unitCode",
});
const unselectedFilterValue = "__pdf_generation_unselected__";
const candidateBlockGridSortLabelMap = new Map(
  candidateBlockGridSortOptions.map((option) => [option.key, option.label]),
);

function renderTemplateOptions(templates = [], selectedTemplateId = "") {
  if (!templates.length) {
    return '<option value="" selected disabled>사용 가능한 양식 없음</option>';
  }

  return [
    `<option value="" ${selectedTemplateId ? "" : "selected"} disabled>선택</option>`,
    ...templates.map(
      (template) => `
        <option value="${escapeHtml(template.id || "")}" ${String(template.id || "") === selectedTemplateId ? "selected" : ""}>
          ${escapeHtml(template.name || "이름 없는 양식")}
        </option>
      `,
    ),
  ].join("");
}

function renderTemplateField({ isBusy, modal, selectedTemplate, templates }) {
  const hasSelection = Boolean(selectedTemplate);
  const isPreviewLoading = Boolean(modal.templatePreview?.isLoading);

  return `
    <div class="form-field pdf-generation-filter-field pdf-generation-template-field ${hasSelection ? "is-selected" : "is-pending"}">
      <label class="pdf-generation-step-label" for="pdfGenerationTemplateSelect">
        <span>양식</span>
      </label>
      <div class="pdf-generation-template-control-row">
        <select id="pdfGenerationTemplateSelect" name="templateId" data-pdf-generation-template-select required ${modal.isLoadingOptions || isBusy ? "disabled" : ""}>
          ${renderTemplateOptions(templates, String(modal.selectedTemplateId || ""))}
        </select>
        <button
          class="icon-button pdf-generation-template-preview-button"
          data-action="open-pdf-generation-template-preview"
          type="button"
          title="양식 미리보기"
          aria-label="양식 미리보기"
          ${!hasSelection || modal.isLoadingOptions || isBusy || isPreviewLoading ? "disabled" : ""}
        >
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <path d="M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z" />
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderFilterOptions(options = [], selectedValue = "", hasSelection = false) {
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

function getOptionList(modal, key) {
  return Array.isArray(modal.options?.[key]) ? modal.options[key] : [];
}

function getSelectedOption(options = [], selectedValue = "") {
  return (Array.isArray(options) ? options : []).find(
    (option) => String(option?.value || "").trim() === String(selectedValue || "").trim(),
  ) || null;
}

function sumCandidateCount(options = []) {
  if (!Array.isArray(options) || !options.length) {
    return null;
  }

  return options.reduce((total, option) => total + (Number(option?.candidateCount) || 0), 0);
}

function getTargetEstimate({ filters, modal, selectedFilterKeys, selectedTemplate }) {
  const generationUnit = String(selectedTemplate?.generationUnit || "").trim();
  const serverEstimate =
    modal.targetEstimate &&
    typeof modal.targetEstimate === "object" &&
    String(modal.targetEstimate.templateId || "") === String(selectedTemplate?.id || "")
      ? modal.targetEstimate
      : null;

  if (serverEstimate) {
    return {
      candidateCount: Number(serverEstimate.candidateCount) || 0,
      pdfCount: Number(serverEstimate.pdfCount) || 0,
    };
  }

  if (generationUnit === "all" || generationUnit === "custom") {
    return {
      candidateCount: null,
      pdfCount: 1,
    };
  }

  const targetFilterKey = generationUnitTargetFilterMap[generationUnit];

  if (!targetFilterKey) {
    return {
      candidateCount: null,
      pdfCount: null,
    };
  }

  const options = getOptionList(modal, targetFilterKey);
  const selectedValue = String(filters[targetFilterKey] || "").trim();
  const hasTargetSelection = selectedFilterKeys.includes(targetFilterKey);

  if (hasTargetSelection && selectedValue) {
    const selectedOption = getSelectedOption(options, selectedValue);

    return {
      candidateCount: selectedOption ? Number(selectedOption.candidateCount) || 0 : null,
      pdfCount: 1,
    };
  }

  return {
    candidateCount: sumCandidateCount(options),
    pdfCount: options.length,
  };
}

function getTemplatePages(selectedTemplate) {
  return Array.isArray(selectedTemplate?.layout?.pages)
    ? [...selectedTemplate.layout.pages].sort(
        (left, right) => (Number(left?.sortOrder) || 0) - (Number(right?.sortOrder) || 0),
      )
    : [];
}

function getTemplateContentPages(selectedTemplate) {
  return getTemplatePages(selectedTemplate).filter((page) => String(page?.type || "").trim() === "content");
}

function getTemplateCoverPage(selectedTemplate) {
  return getTemplatePages(selectedTemplate).find((page) => String(page?.type || "").trim() === "cover") || null;
}

function getTemplateCandidateBlockGridConfig(selectedTemplate) {
  const contentPages = getTemplateContentPages(selectedTemplate);
  const contentPage =
    contentPages.find(
      (page) => page?.settings?.candidateBlockGrid && typeof page.settings.candidateBlockGrid === "object",
    ) ||
    contentPages[0] ||
    null;

  if (!contentPage) {
    return null;
  }

  return normalizeCandidateBlockGridConfig(contentPage.settings?.candidateBlockGrid);
}

function hasEnabledOtherRoomPage(selectedTemplate) {
  return getTemplateContentPages(selectedTemplate).some((page) => {
    const source = page?.settings?.otherRoomPage;

    return (
      source &&
      typeof source === "object" &&
      (source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true")
    );
  });
}

function hasEnabledCoverPage(selectedTemplate) {
  const coverPage = getTemplateCoverPage(selectedTemplate);

  return Boolean(coverPage && coverPage.enabled !== false);
}

function formatUsage(value) {
  return value ? "사용" : "사용 안함";
}

function formatCandidateDataSort(selectedTemplate) {
  const config = getTemplateCandidateBlockGridConfig(selectedTemplate);

  if (!config) {
    return "-";
  }

  const sortKeyLabel = candidateBlockGridSortLabelMap.get(config.sortKey) || config.sortKey || "-";
  const sortDirectionLabel = config.sortDirection === "desc" ? "내림차순" : "오름차순";

  return `${sortKeyLabel} / ${sortDirectionLabel}`;
}

function renderTemplateMeta(selectedTemplate) {
  const generationUnitFields = selectedTemplate ? getTemplateGenerationUnitFields(selectedTemplate) : [];
  const generationUnit = selectedTemplate
    ? formatGenerationUnitFieldsSummary(generationUnitFields) || formatGenerationUnitLabel(selectedTemplate.generationUnit)
    : "-";
  const paperProperty = selectedTemplate
    ? `${selectedTemplate.paperPreset || "A4"} · ${formatOrientationLabel(selectedTemplate.orientation)}`
    : "-";
  const candidateDataSort = selectedTemplate ? formatCandidateDataSort(selectedTemplate) : "-";
  const otherRoomPageUsage = selectedTemplate ? formatUsage(hasEnabledOtherRoomPage(selectedTemplate)) : "-";
  const coverPageUsage = selectedTemplate ? formatUsage(hasEnabledCoverPage(selectedTemplate)) : "-";

  return `
    <div class="pdf-generation-condition-badges">
      <span class="status-badge neutral"><strong>용지 속성</strong><span>${escapeHtml(paperProperty)}</span></span>
      <span class="status-badge neutral"><strong>표지</strong><span>${escapeHtml(coverPageUsage)}</span></span>
      <span class="status-badge neutral"><strong>정렬</strong><span>${escapeHtml(candidateDataSort)}</span></span>
      <span class="status-badge neutral"><strong>생성 단위</strong><span>${escapeHtml(generationUnit)}</span></span>
      <span class="status-badge neutral"><strong>타고사실</strong><span>${escapeHtml(otherRoomPageUsage)}</span></span>
    </div>
  `;
}

function renderFilterField({ filters, isBusy, modal, selectedFilterKeys, selectedTemplate, step }) {
  const selectedValue = String(filters[step.key] || "");
  const optionList = getOptionList(modal, step.key);
  const hasSelection = selectedFilterKeys.includes(step.key);
  const isEnabled = Boolean(selectedTemplate) && (step.key !== "series" || selectedFilterKeys.includes("admission"));

  return `
    <label class="form-field pdf-generation-filter-field ${hasSelection ? "is-selected" : "is-pending"}">
      <span class="pdf-generation-step-label">
        <span>${escapeHtml(step.label)}</span>
      </span>
      <select
        name="${escapeHtml(step.key)}"
        data-pdf-generation-modal-filter="${escapeHtml(step.key)}"
        ${modal.isLoadingOptions || isBusy || !isEnabled ? "disabled" : ""}
      >
        ${renderFilterOptions(optionList, selectedValue, hasSelection)}
      </select>
    </label>
  `;
}

function renderCreateSummary({ filters, modal, selectedFilterKeys, selectedTemplate }) {
  const targetEstimate = getTargetEstimate({ filters, modal, selectedFilterKeys, selectedTemplate });

  return `
    <section class="pdf-generation-create-summary-section">
      <div class="pdf-generation-create-section-header">
        <h3>생성 요약</h3>
      </div>
      <div class="pdf-generation-estimate-grid">
        <div>
          <span>생성 PDF</span>
          <strong>${formatOptionalCountWithUnit(targetEstimate.pdfCount, "개")}</strong>
        </div>
        <div>
          <span>대상 수험생</span>
          <strong>${formatOptionalCountWithUnit(targetEstimate.candidateCount, "명")}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderTemplatePreviewModal(modal = {}) {
  const preview = modal.templatePreview || {};

  if (!preview.isOpen) {
    return "";
  }

  const templateName = String(preview.templateName || "수험생확인대장").trim() || "수험생확인대장";
  const previewTitle = templateName.endsWith("미리보기") ? templateName : `${templateName} 미리보기`;
  const pdfUrl = String(preview.pdfUrl || "").trim();

  return `
    <div class="modal-overlay editor-preview-modal pdf-generation-template-preview-modal" role="dialog" aria-modal="true" aria-labelledby="pdfGenerationTemplatePreviewTitle">
      <div class="modal-card editor-preview-modal-card pdf-generation-template-preview-card">
        <div class="modal-header">
          <div>
            <h2 id="pdfGenerationTemplatePreviewTitle">${escapeHtml(previewTitle)}</h2>
          </div>
          <button class="icon-button" data-action="close-pdf-generation-template-preview" type="button" aria-label="닫기">×</button>
        </div>
        <div class="editor-preview-body">
          ${
            preview.isLoading
              ? '<p class="helper-text">미리보기를 생성하는 중입니다.</p>'
              : preview.errorMessage
                ? `<p class="error-banner">${escapeHtml(preview.errorMessage)}</p>`
                : pdfUrl
                  ? `
                    <iframe
                      class="editor-preview-frame pdf-generation-pdf-viewer-frame"
                      src="${escapeHtml(pdfUrl)}"
                      title="PDF 미리보기"
                    ></iframe>
                  `
                : `
                    <iframe
                      class="editor-preview-frame"
                      srcdoc="${escapeHtml(preview.previewHtml || "")}"
                      title="양식 미리보기"
                    ></iframe>
                  `
          }
        </div>
      </div>
    </div>
  `;
}

export function renderPdfGenerationCreateModal(pdfGenerations = {}) {
  const modal = pdfGenerations.createModal || {};

  if (!modal.isOpen && !modal.templatePreview?.isOpen) {
    return "";
  }

  const filters = {
    ...createEmptyPdfGenerationFilters(),
    ...(modal.filters && typeof modal.filters === "object" ? modal.filters : {}),
  };
  const templates = Array.isArray(modal.templates) ? modal.templates : [];
  const selectedTemplate = templates.find((template) => String(template.id || "") === String(modal.selectedTemplateId || "")) || null;
  const selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(
    modal.selectedFilterKeys,
    selectedTemplate?.generationUnit || "",
  );
  const revealedSteps = getPdfGenerationRevealedFilterSteps(selectedFilterKeys, selectedTemplate?.generationUnit || "");
  const isConditionComplete =
    Boolean(selectedTemplate) && isPdfGenerationCreateConditionComplete(selectedFilterKeys, selectedTemplate?.generationUnit || "");
  const isBusy = Boolean(modal.isSubmitting);

  return `
    ${modal.isOpen ? `
      <div class="modal-overlay pdf-generation-create-overlay" role="dialog" aria-modal="true" aria-labelledby="pdfGenerationCreateTitle">
      <div class="modal-card pdf-generation-create-card">
        <div class="modal-header">
          <div>
            <h2 id="pdfGenerationCreateTitle">PDF 생성하기</h2>
          </div>
          <button class="icon-button" data-action="close-pdf-generation-create-modal" type="button" aria-label="닫기" ${isBusy ? "disabled" : ""}>&times;</button>
        </div>
        <form class="modal-form pdf-generation-create-form" data-pdf-generation-create-form>
          <section class="pdf-generation-filter-section">
            <div class="pdf-generation-create-section-header">
              <h3>생성 조건</h3>
              ${renderTemplateMeta(selectedTemplate)}
            </div>
            <div class="pdf-generation-filter-list">
              ${renderTemplateField({ isBusy, modal, selectedTemplate, templates })}
              ${revealedSteps
                .map((step) =>
                  renderFilterField({
                    filters,
                    isBusy,
                    modal,
                    selectedFilterKeys,
                    selectedTemplate,
                    step,
                  }),
                )
                .join("")}
            </div>
          </section>

          ${renderCreateSummary({
            filters,
            modal,
            selectedFilterKeys,
            selectedTemplate,
          })}
          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions pdf-generation-create-actions">
            <button
              class="ghost-button pdf-generation-first-preview-button"
              data-action="open-pdf-generation-first-result-preview"
              type="button"
              ${isBusy || modal.isLoadingOptions || !templates.length || !selectedTemplate || !isConditionComplete ? "disabled" : ""}
            >
              미리보기
            </button>
            <div class="pdf-generation-create-action-buttons">
              <button class="ghost-button" data-action="close-pdf-generation-create-modal" type="button" ${isBusy ? "disabled" : ""}>취소</button>
              <button class="primary-button" type="submit" ${isBusy || modal.isLoadingOptions || !templates.length || !selectedTemplate || !isConditionComplete ? "disabled" : ""}>
                ${isBusy ? "생성 요청 중..." : "PDF 생성"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    ` : ""}
    ${renderTemplatePreviewModal(modal)}
  `;
}
