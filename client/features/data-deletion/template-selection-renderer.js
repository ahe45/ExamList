import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  formatGenerationUnitLabel,
  formatOrientationLabel,
} from "../pdf-generations/pdf-generation-render-helpers.js";
import {
  candidateBlockGridSortOptions,
  normalizeCandidateBlockGridConfig,
} from "../template-editor/candidate-block-grid-config.js";
import { normalizeTemplateIds } from "./constants.js";

const candidateBlockGridSortLabelMap = new Map(
  candidateBlockGridSortOptions.map((option) => [option.key, option.label]),
);

function getDataDeletionTemplateItems(summary = null) {
  return Array.isArray(summary?.templates?.items) ? summary.templates.items : [];
}

function getTemplatePages(template) {
  return Array.isArray(template?.layout?.pages)
    ? [...template.layout.pages].sort(
        (left, right) => (Number(left?.sortOrder) || 0) - (Number(right?.sortOrder) || 0),
      )
    : [];
}

function getTemplateContentPages(template) {
  return getTemplatePages(template).filter((page) => String(page?.type || "").trim() === "content");
}

function getTemplateCoverPage(template) {
  return getTemplatePages(template).find((page) => String(page?.type || "").trim() === "cover") || null;
}

function getTemplateCandidateBlockGridConfig(template) {
  const contentPages = getTemplateContentPages(template);
  const contentPage =
    contentPages.find(
      (page) => page?.settings?.candidateBlockGrid && typeof page.settings.candidateBlockGrid === "object",
    ) ||
    contentPages[0] ||
    null;

  return contentPage ? normalizeCandidateBlockGridConfig(contentPage.settings?.candidateBlockGrid) : null;
}

function hasEnabledTemplateOtherRoomPage(template) {
  return getTemplateContentPages(template).some((page) => {
    const source = page?.settings?.otherRoomPage;

    return (
      source &&
      typeof source === "object" &&
      (source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true")
    );
  });
}

function hasEnabledTemplateCoverPage(template) {
  const coverPage = getTemplateCoverPage(template);

  return Boolean(coverPage && coverPage.enabled !== false);
}

function formatTemplateUsage(value) {
  return value ? "사용" : "사용 안함";
}

function formatTemplateCandidateDataSort(template) {
  const config = getTemplateCandidateBlockGridConfig(template);

  if (!config) {
    return "-";
  }

  const sortKeyLabel = candidateBlockGridSortLabelMap.get(config.sortKey) || config.sortKey || "-";
  const sortDirectionLabel = config.sortDirection === "desc" ? "내림차순" : "오름차순";

  return `${sortKeyLabel} / ${sortDirectionLabel}`;
}

function renderTemplateMetaBadge(label, value) {
  return `
    <span class="status-badge neutral">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value || "-")}</span>
    </span>
  `;
}

function renderTemplateMetaBadges(template = {}) {
  const paperProperty = `${template.paperPreset || "A4"} · ${formatOrientationLabel(template.orientation)}`;

  return `
    <div class="data-deletion-template-badges">
      ${renderTemplateMetaBadge("용지 속성", paperProperty)}
      ${renderTemplateMetaBadge("표지", formatTemplateUsage(hasEnabledTemplateCoverPage(template)))}
      ${renderTemplateMetaBadge("정렬", formatTemplateCandidateDataSort(template))}
      ${renderTemplateMetaBadge("생성 단위", formatGenerationUnitLabel(template.generationUnit))}
      ${renderTemplateMetaBadge("타고사실", formatTemplateUsage(hasEnabledTemplateOtherRoomPage(template)))}
    </div>
  `;
}

function renderDataDeletionTemplateItem(template = {}, selectedTemplateIds = [], isBusy = false) {
  const templateId = String(template.id || "").trim();
  const isChecked = selectedTemplateIds.includes(templateId);
  const description = String(template.description || "").trim();

  if (!templateId) {
    return "";
  }

  return `
    <label class="data-deletion-template-option">
      <input
        type="checkbox"
        data-data-deletion-template-id="${escapeHtml(templateId)}"
        ${isChecked ? "checked" : ""}
        ${isBusy ? "disabled" : ""}
      />
      <span class="data-deletion-template-copy">
        <strong>${escapeHtml(template.name || "이름 없는 양식")}</strong>
        ${description ? `<small>${escapeHtml(description)}</small>` : ""}
        ${renderTemplateMetaBadges(template)}
      </span>
    </label>
  `;
}

export function renderDataDeletionTemplateList({ isBusy, isLoading, selectedTemplateIds, summary }) {
  const templateItems = getDataDeletionTemplateItems(summary);
  const selectedIds = normalizeTemplateIds(selectedTemplateIds);
  const selectableIds = templateItems.map((item) => String(item?.id || "").trim()).filter(Boolean);
  const selectedCount = selectableIds.filter((id) => selectedIds.includes(id)).length;
  const isAllSelected = Boolean(selectableIds.length && selectedCount === selectableIds.length);

  if (isLoading && !templateItems.length) {
    return '<p class="helper-text data-deletion-template-empty">양식 목록을 불러오는 중입니다.</p>';
  }

  if (!templateItems.length) {
    return '<p class="helper-text data-deletion-template-empty">생성된 양식이 없습니다.</p>';
  }

  return `
    <div class="data-deletion-template-list">
      <div class="data-deletion-template-required-header">
        <span>삭제할 양식</span>
        <span class="field-required-badge">필수</span>
      </div>
      <label class="data-deletion-template-select-all-row">
        <input
          type="checkbox"
          data-data-deletion-template-select-all
          ${isAllSelected ? "checked" : ""}
          ${isBusy ? "disabled" : ""}
        />
        <strong>전체 선택</strong>
        <span>${formatCount(selectedCount)} / ${formatCount(selectableIds.length)}개 선택</span>
      </label>
      <div class="data-deletion-template-options">
        ${templateItems.map((template) => renderDataDeletionTemplateItem(template, selectedIds, isBusy)).join("")}
      </div>
    </div>
  `;
}
