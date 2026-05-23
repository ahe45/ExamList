const { escapeHtml } = require("./renderer-html-utils");
const { replaceTemplateTokens } = require("./tokens");

const defaultDocumentSafeArea = Object.freeze({
  bottom: 28.35,
  left: 28.35,
  right: 28.35,
  top: 28.35,
});
const defaultRecognitionMarkOffsetPt = 14.17;
const defaultRecognitionMarkSizePt = 11.34;
const pageNumberPresetTemplates = Object.freeze({
  numericCurrentTotal: "{{page.current}}/{{page.total}}",
  pageCurrentTotal: "페이지 {{page.current}}/{{page.total}}",
  pageCurrentTotalEnglish: "Page{{page.current}}/{{page.total}}",
  currentPageKorean: "{{page.current}}페이지",
  koreanPage: "{{page.current}}쪽",
  currentPageOfTotalKorean: "{{page.current}}페이지 중 {{page.total}}페이지",
  koreanPageOfTotal: "{{page.current}}쪽 중 {{page.total}}쪽",
});
const legacyPageNumberPresetAliases = Object.freeze({
  current: "currentPageKorean",
  currentTotal: "numericCurrentTotal",
});

function isCoverPage(page) {
  return String(page?.type || "").trim() === "cover";
}

function normalizeDocumentMarginValue(value, fallback = 0) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), 240);
}

function normalizeDocumentSafeArea(page) {
  const safeArea = page?.settings?.safeArea && typeof page.settings.safeArea === "object"
    ? page.settings.safeArea
    : {};

  return {
    bottom: normalizeDocumentMarginValue(safeArea.bottom, defaultDocumentSafeArea.bottom),
    left: normalizeDocumentMarginValue(safeArea.left, defaultDocumentSafeArea.left),
    right: normalizeDocumentMarginValue(safeArea.right, defaultDocumentSafeArea.right),
    top: normalizeDocumentMarginValue(safeArea.top, defaultDocumentSafeArea.top),
  };
}

function formatPtValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/0+$/g, "").replace(/\.$/, "");
}

function normalizeRecognitionMarkPoint(value, fallback = defaultRecognitionMarkOffsetPt, maximum = 240) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), maximum);
}

function normalizeRecognitionMarks(page) {
  const source = page?.settings?.recognitionMarks && typeof page.settings.recognitionMarks === "object"
    ? page.settings.recognitionMarks
    : {};

  return {
    enabled: source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true",
    offsetXPt: normalizeRecognitionMarkPoint(source.offsetXPt ?? source.xPt ?? source.offsetX ?? source.x),
    offsetYPt: normalizeRecognitionMarkPoint(source.offsetYPt ?? source.yPt ?? source.offsetY ?? source.y),
    sizePt: normalizeRecognitionMarkPoint(source.sizePt ?? source.size, defaultRecognitionMarkSizePt, 72),
  };
}

function renderRecognitionMarks(page) {
  const settings = normalizeRecognitionMarks(page);

  if (!settings.enabled) {
    return "";
  }

  const offsetX = formatPtValue(settings.offsetXPt);
  const offsetY = formatPtValue(settings.offsetYPt);
  const size = formatPtValue(settings.sizePt);
  const commonStyle = `width:${size}pt;height:${size}pt;`;

  return `
    <div class="preview-recognition-marks" aria-hidden="true">
      <span class="preview-recognition-mark" style="${commonStyle}left:${offsetX}pt;top:${offsetY}pt;"></span>
      <span class="preview-recognition-mark" style="${commonStyle}right:${offsetX}pt;top:${offsetY}pt;"></span>
      <span class="preview-recognition-mark" style="${commonStyle}left:${offsetX}pt;bottom:${offsetY}pt;"></span>
      <span class="preview-recognition-mark" style="${commonStyle}right:${offsetX}pt;bottom:${offsetY}pt;"></span>
    </div>
  `;
}

function normalizePageNumberSettings(page) {
  const source = page?.settings?.pageNumber && typeof page.settings.pageNumber === "object"
    ? page.settings.pageNumber
    : {};
  const rawPreset = String(source.preset || "").trim();
  const preset = Object.prototype.hasOwnProperty.call(pageNumberPresetTemplates, rawPreset)
    ? rawPreset
    : legacyPageNumberPresetAliases[rawPreset] || "numericCurrentTotal";

  return {
    enabled: !isCoverPage(page) && (source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true"),
    preset,
  };
}

function renderPageNumberText(settings, context) {
  const template = pageNumberPresetTemplates[settings.preset] || pageNumberPresetTemplates.numericCurrentTotal;

  return replaceTemplateTokens(template, context);
}

function renderPageNumberSetting(page, baseContext) {
  const settings = normalizePageNumberSettings(page);

  if (!settings.enabled || isCoverPage(page)) {
    return "";
  }

  return `<div class="preview-page-number">${escapeHtml(renderPageNumberText(settings, baseContext))}</div>`;
}

module.exports = {
  formatPtValue,
  isCoverPage,
  normalizeDocumentSafeArea,
  renderPageNumberSetting,
  renderRecognitionMarks,
};
