import { canUseAccess, hasAccess } from "../../app/access.js";
import {
  normalizeTemplateGenerationUnitValue,
  templateGenerationUnitOptions,
} from "../../app/generation-units.js";
import { escapeHtml } from "../../app/html-utils.js";
import { getSelectedPage } from "./state.js";

const defaultPageSafeArea = Object.freeze({
  bottom: 28.35,
  left: 28.35,
  right: 28.35,
  top: 28.35,
});

function formatPageTypeLabel(value) {
  const labelMap = {
    appendix: "부록",
    content: "본문",
    cover: "표지",
    static: "고정",
  };

  return labelMap[value] || value || "페이지";
}

function renderPageTabs(editor) {
  const pages = Array.isArray(editor?.template?.layout?.pages) ? editor.template.layout.pages : [];

  return pages
    .map(
      (page) => `
        <button
          class="editor-page-tab ${editor.selectedPageId === page.id ? "selected" : ""}"
          data-action="select-editor-page"
          data-page-id="${escapeHtml(page.id)}"
          type="button"
        >
          <span>${escapeHtml(page.name || formatPageTypeLabel(page.type) || "페이지")}</span>
          <small>${escapeHtml(formatPageTypeLabel(page.type))}</small>
        </button>
      `,
    )
    .join("");
}

function normalizeMarginNumber(value, fallback) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), 240);
}

function getPageSafeArea(page, fallbackMargin = defaultPageSafeArea) {
  const safeArea = page?.settings?.safeArea && typeof page.settings.safeArea === "object"
    ? page.settings.safeArea
    : {};
  const fallbackSafeArea = fallbackMargin && typeof fallbackMargin === "object" ? fallbackMargin : defaultPageSafeArea;

  return {
    bottom: normalizeMarginNumber(safeArea.bottom, fallbackSafeArea.bottom ?? defaultPageSafeArea.bottom),
    left: normalizeMarginNumber(safeArea.left, fallbackSafeArea.left ?? defaultPageSafeArea.left),
    right: normalizeMarginNumber(safeArea.right, fallbackSafeArea.right ?? defaultPageSafeArea.right),
    top: normalizeMarginNumber(safeArea.top, fallbackSafeArea.top ?? defaultPageSafeArea.top),
  };
}

function formatMarginInputValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/0+$/g, "").replace(/\.$/, "");
}

function renderGenerationUnitField(editor) {
  const generationUnit = normalizeTemplateGenerationUnitValue(editor.template?.generationUnit);

  return `
    <section class="template-editor-generation-field">
      <p class="section-kicker">생성 단위</p>
      <label class="form-field">
        <select data-editor-template-field="generationUnit" aria-label="생성 단위">
          ${templateGenerationUnitOptions
            .map(
              (option) =>
                `<option value="${escapeHtml(option.value)}" ${generationUnit === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
            )
            .join("")}
        </select>
      </label>
    </section>
  `;
}

function renderCoverPageEnabledField(selectedPage) {
  if (String(selectedPage?.type || "").trim() !== "cover") {
    return "";
  }

  return `
    <section class="template-page-property-field examlist-cover-page-field">
      <div class="examlist-cover-page-header">
        <span>표지 사용</span>
        <label class="examlist-switch-control">
          <input class="sr-only" data-editor-page-field="enabled" type="checkbox" aria-label="표지 사용" ${selectedPage.enabled === false ? "" : "checked"} />
          <span class="examlist-switch-track" aria-hidden="true"><span></span></span>
        </label>
      </div>
    </section>
  `;
}

function renderPageFields(selectedPage) {
  if (!selectedPage) {
    return `
      <section>
        <p class="section-kicker">페이지 설정</p>
        <p class="editor-empty">선택된 페이지가 없습니다.</p>
      </section>
    `;
  }

  const isCoverPage = String(selectedPage.type || "").trim() === "cover";

  return `
    <section>
      <p class="section-kicker">페이지 설정</p>
      <div class="editor-inspector-grid">
        <label class="form-field">
          <span>페이지명</span>
          <input data-editor-page-field="name" type="text" value="${escapeHtml(selectedPage.name || "")}" />
        </label>
        <label class="form-field">
          <span>페이지 유형</span>
          <input type="text" value="${escapeHtml(formatPageTypeLabel(selectedPage.type))}" readonly />
        </label>
        ${
          isCoverPage
            ? ""
            : `
              <label class="form-field">
                <span>반복 출력</span>
                <select data-editor-page-field="repeatable">
                  <option value="true" ${selectedPage.repeatable ? "selected" : ""}>사용</option>
                  <option value="false" ${selectedPage.repeatable ? "" : "selected"}>사용 안함</option>
                </select>
              </label>
            `
        }
      </div>
    </section>
  `;
}

export function renderPagePropertyPanel(editor, access) {
  const selectedPage = getSelectedPage(editor);
  const pageSafeArea = getPageSafeArea(selectedPage, editor.template?.layout?.paper?.margin || defaultPageSafeArea);
  const hasTemplateManagement = hasAccess(access, "manageTemplates");
  const canManageTemplates = canUseAccess(access, "manageTemplates");

  return `
    ${hasTemplateManagement && !canManageTemplates ? '<p class="helper-text">현재 학교는 읽기 전용입니다.</p>' : ""}
    ${!hasTemplateManagement ? '<p class="helper-text">현재 권한은 읽기 전용입니다.</p>' : ""}
    <section>
      <p class="section-kicker">페이지 선택</p>
      <div class="editor-page-tabs editor-page-tabs-segmented">
        ${renderPageTabs(editor)}
      </div>
    </section>
    ${renderCoverPageEnabledField(selectedPage)}
    <fieldset ${canManageTemplates ? "" : "disabled"}>
      <section>
        <p class="section-kicker">용지 설정</p>
        <div class="editor-inspector-grid">
          <label class="form-field">
            <span>용지</span>
            <select data-editor-template-field="paperPreset">
              <option value="A4" ${editor.template?.paperPreset === "A4" ? "selected" : ""}>A4</option>
              <option value="A3" ${editor.template?.paperPreset === "A3" ? "selected" : ""}>A3</option>
              <option value="B4" ${editor.template?.paperPreset === "B4" ? "selected" : ""}>B4</option>
              <option value="B5" ${editor.template?.paperPreset === "B5" ? "selected" : ""}>B5</option>
              <option value="Letter" ${editor.template?.paperPreset === "Letter" ? "selected" : ""}>Letter</option>
              <option value="Legal" ${editor.template?.paperPreset === "Legal" ? "selected" : ""}>Legal</option>
              <option value="Custom" ${editor.template?.paperPreset === "Custom" ? "selected" : ""}>Custom</option>
            </select>
          </label>
          <label class="form-field">
            <span>방향</span>
            <select data-editor-template-field="orientation">
              <option value="portrait" ${editor.template?.orientation === "portrait" ? "selected" : ""}>세로</option>
              <option value="landscape" ${editor.template?.orientation === "landscape" ? "selected" : ""}>가로</option>
            </select>
          </label>
        </div>
      </section>
      <section>
        <p class="section-kicker">여백</p>
        <div class="editor-page-margin-grid">
          <label class="form-field">
            <span>상단 pt</span>
            <input data-editor-page-margin-field="top" type="number" min="0" max="240" step="1" value="${escapeHtml(formatMarginInputValue(pageSafeArea.top))}" />
          </label>
          <label class="form-field">
            <span>우측 pt</span>
            <input data-editor-page-margin-field="right" type="number" min="0" max="240" step="1" value="${escapeHtml(formatMarginInputValue(pageSafeArea.right))}" />
          </label>
          <label class="form-field">
            <span>하단 pt</span>
            <input data-editor-page-margin-field="bottom" type="number" min="0" max="240" step="1" value="${escapeHtml(formatMarginInputValue(pageSafeArea.bottom))}" />
          </label>
          <label class="form-field">
            <span>좌측 pt</span>
            <input data-editor-page-margin-field="left" type="number" min="0" max="240" step="1" value="${escapeHtml(formatMarginInputValue(pageSafeArea.left))}" />
          </label>
        </div>
        <p class="helper-text editor-page-margin-note">입력값은 PDF 좌표와 동일하게 pt 단위로 저장됩니다.</p>
      </section>
      ${renderPageFields(selectedPage)}
      ${renderGenerationUnitField(editor)}
    </fieldset>
  `;
}
