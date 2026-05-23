const { randomUUID } = require("crypto");

const { normalizeLayoutElement } = require("./layout-elements");
const { normalizePageSettings } = require("./layout-page-settings");
const { normalizeBoolean, normalizeFiniteNumber } = require("./layout-utils");

const supportedPageTypes = Object.freeze(["cover", "content", "static", "appendix"]);

function getCanonicalPageName(pageType) {
  if (pageType === "cover") {
    return "표지";
  }

  if (pageType === "content") {
    return "본문";
  }

  return "";
}

function normalizePageName(page, pageType) {
  const canonicalName = getCanonicalPageName(pageType);

  if (canonicalName) {
    return canonicalName;
  }

  return String(page?.name || "페이지");
}

function normalizeLayoutPage(page, index, paperConfig) {
  const normalizedType = supportedPageTypes.includes(String(page?.type || "").trim())
    ? String(page.type).trim()
    : index === 0
      ? "cover"
      : "content";
  const pageId = String(page?.id || `page-${randomUUID()}`);
  const elements = Array.isArray(page?.elements) ? page.elements : [];

  return {
    elements: elements.map((element, elementIndex) => normalizeLayoutElement(element, elementIndex, pageId)),
    enabled: normalizeBoolean(page?.enabled, true),
    heightPt: normalizeFiniteNumber(page?.heightPt, paperConfig.heightPt, 100),
    id: pageId,
    name: normalizePageName(page, normalizedType),
    repeatable: normalizeBoolean(page?.repeatable, normalizedType === "content"),
    settings: normalizePageSettings(page?.settings, paperConfig, normalizedType),
    sortOrder: normalizeFiniteNumber(page?.sortOrder, index + 1, 1, 10000),
    type: normalizedType,
    widthPt: normalizeFiniteNumber(page?.widthPt, paperConfig.widthPt, 100),
  };
}

module.exports = {
  normalizeLayoutPage,
  supportedPageTypes,
};
