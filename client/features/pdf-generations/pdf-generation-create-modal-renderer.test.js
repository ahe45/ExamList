import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationCreateModal } from "./pdf-generation-create-modal-renderer.js";

const baseTemplate = Object.freeze({
  generationUnit: "roomCode",
  id: "template-1",
  layout: {
    pages: [],
  },
  name: "확인대장",
  orientation: "portrait",
  paperPreset: "A4",
});

function renderCreateModal(overrides = {}) {
  return renderPdfGenerationCreateModal({
    createModal: {
      errorMessage: "",
      filters: {},
      isLoadingOptions: false,
      isOpen: true,
      isSubmitting: false,
      options: {
        admission: [{ candidateCount: 1, value: "논술" }],
        campus: [{ candidateCount: 1, value: "서울" }],
        series: [{ candidateCount: 1, value: "인문" }],
        track: [{ candidateCount: 1, value: "수시" }],
      },
      selectedFilterKeys: [],
      selectedTemplateId: "",
      templatePreview: {
        isOpen: false,
      },
      templates: [],
      ...overrides,
    },
  });
}

function getFilterSelectHtml(html, key) {
  return html.match(
    new RegExp(`<select\\b(?:(?!</select>)[\\s\\S])*data-pdf-generation-modal-filter="${key}"(?:(?!</select>)[\\s\\S])*</select>`),
  )?.[0] || "";
}

function getFilterSelectOpeningHtml(html, key) {
  return getFilterSelectHtml(html, key).match(/<select\b[\s\S]*?>/)?.[0] || "";
}

function getFilterFieldHtml(html, key) {
  return html.match(
    new RegExp(`<label\\b(?:(?!</label>)[\\s\\S])*data-pdf-generation-modal-filter="${key}"(?:(?!</label>)[\\s\\S])*</label>`),
  )?.[0] || "";
}

test("PDF generation create modal disables filters until a template is selected", () => {
  const html = renderCreateModal();

  assert.match(getFilterSelectOpeningHtml(html, "campus"), /disabled/);
  assert.match(getFilterSelectOpeningHtml(html, "track"), /disabled/);
  assert.match(getFilterSelectOpeningHtml(html, "admission"), /disabled/);
  assert.match(getFilterSelectOpeningHtml(html, "series"), /disabled/);
  assert.match(html, /data-pdf-generation-template-select[\s\S]*<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.match(getFilterFieldHtml(html, "campus"), /<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.match(getFilterFieldHtml(html, "track"), /<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.match(getFilterFieldHtml(html, "admission"), /<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.doesNotMatch(getFilterFieldHtml(html, "series"), /field-required-badge/);
});

test("PDF generation create modal keeps series visible but disabled until admission is selected", () => {
  const withoutAdmissionHtml = renderCreateModal({
    selectedTemplateId: "template-1",
    templates: [baseTemplate],
  });
  const withAdmissionHtml = renderCreateModal({
    selectedFilterKeys: ["admission"],
    selectedTemplateId: "template-1",
    templates: [baseTemplate],
  });

  assert.doesNotMatch(getFilterSelectOpeningHtml(withoutAdmissionHtml, "campus"), /disabled/);
  assert.doesNotMatch(getFilterSelectOpeningHtml(withoutAdmissionHtml, "admission"), /disabled/);
  assert.match(getFilterSelectOpeningHtml(withoutAdmissionHtml, "series"), /disabled/);
  assert.doesNotMatch(getFilterSelectOpeningHtml(withAdmissionHtml, "series"), /disabled/);
});
