const { randomUUID } = require("crypto");

const { createGenerationConfig, createPaperConfig } = require("./defaults");
const { normalizeGenerationUnitFields } = require("../pdf-generations/generation-unit-fields");
const { supportedElementTypes } = require("./layout-element-config");
const { normalizeMargin } = require("./layout-utils");
const { normalizeLayoutPage, supportedPageTypes } = require("./layout-pages");

function normalizeTemplateLayout(layout, metadata, templateId = "") {
  const sourceLayout = layout && typeof layout === "object" ? layout : {};
  const paperConfig = createPaperConfig(metadata.paperPreset, metadata.orientation);
  const sourceGeneration = sourceLayout.generation && typeof sourceLayout.generation === "object"
    ? sourceLayout.generation
    : {};
  const unitFields = normalizeGenerationUnitFields(sourceGeneration.unitFields, null);
  const nextLayout = {
    dataTagSettings: normalizeDataTagSettings(sourceLayout.dataTagSettings),
    description: metadata.description,
    generation: {
      ...createGenerationConfig(metadata.generationUnit),
      ...sourceGeneration,
      ...(unitFields.length ? { unitFields } : {}),
      unit: metadata.generationUnit,
    },
    id: String(templateId || sourceLayout.id || `template-${randomUUID()}`),
    name: metadata.name,
    pages: Array.isArray(sourceLayout.pages)
      ? sourceLayout.pages.map((page, index) => normalizeLayoutPage(page, index, paperConfig))
      : [],
    paper: {
      ...paperConfig,
      margin: normalizeMargin(sourceLayout.paper?.margin, paperConfig.margin),
    },
  };

  if (!nextLayout.pages.length) {
    const error = new Error("편집할 페이지가 없습니다.");
    error.statusCode = 400;
    error.errorCode = "TEMPLATE_LAYOUT_PAGES_REQUIRED";
    throw error;
  }

  return nextLayout;
}

function normalizeDataTagValueMap(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((values, [key, tagValue]) => {
    const normalizedKey = String(key || "").trim();

    if (!normalizedKey) {
      return values;
    }

    values[normalizedKey] = String(tagValue ?? "").slice(0, 2000);
    return values;
  }, {});
}

function normalizeDataTagSettings(settings = {}) {
  const sourceSettings = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};

  return {
    emptyValueData: normalizeDataTagValueMap(sourceSettings.emptyValueData),
    sampleData: normalizeDataTagValueMap(sourceSettings.sampleData),
  };
}

module.exports = {
  normalizeTemplateLayout,
  supportedElementTypes,
  supportedPageTypes,
};
