const {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeMargin,
} = require("./layout-utils");
const {
  normalizeCandidateBlockGridSortDirection,
  normalizeCandidateBlockGridSortKey,
} = require("./candidate-block-grid-sort");

const supportedPageNumberPresets = Object.freeze([
  "numericCurrentTotal",
  "pageCurrentTotal",
  "pageCurrentTotalEnglish",
  "currentPageKorean",
  "koreanPage",
  "currentPageOfTotalKorean",
  "koreanPageOfTotal",
]);
const legacyPageNumberPresetAliases = Object.freeze({
  current: "currentPageKorean",
  currentTotal: "numericCurrentTotal",
});
const supportedPageNumberPositions = Object.freeze(["left", "center", "right"]);

function normalizeRecognitionMarks(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    enabled: source.enabled === true || String(source.enabled || "").trim().toLowerCase() === "true",
    offsetXPt: normalizeFiniteNumber(source.offsetXPt ?? source.xPt ?? source.offsetX ?? source.x, 14.17, 0, 240),
    offsetYPt: normalizeFiniteNumber(source.offsetYPt ?? source.yPt ?? source.offsetY ?? source.y, 14.17, 0, 240),
    sizePt: normalizeFiniteNumber(source.sizePt ?? source.size, 11.34, 2, 72),
  };
}

function normalizePageNumberSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const rawPreset = String(source.preset || "").trim();
  const preset = supportedPageNumberPresets.includes(rawPreset)
    ? rawPreset
    : legacyPageNumberPresetAliases[rawPreset] || "numericCurrentTotal";
  const rawPosition = String(source.position || source.align || source.textAlign || "").trim();
  const position = supportedPageNumberPositions.includes(rawPosition) ? rawPosition : "center";

  return {
    enabled: normalizeBoolean(source.enabled, false),
    position,
    preset,
  };
}

function normalizeOtherRoomPageSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    enabled: normalizeBoolean(source.enabled, false),
  };
}

function isCoverPageType(value) {
  return String(value || "").trim() === "cover";
}

function isSmokeCandidateBlockTemplateHtml(value) {
  const normalizedText = String(value || "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedText === "공통 블록";
}

function normalizeCandidateBlockGridSettings(settings) {
  const source = settings && typeof settings === "object" ? settings : {};
  const rawBlockTemplateHtml = String(source.blockTemplateHtml || "").trim();
  const blockTemplateHtml = isSmokeCandidateBlockTemplateHtml(rawBlockTemplateHtml)
    ? "<p><br></p>"
    : rawBlockTemplateHtml || "<p><br></p>";
  const normalizeCandidateBlockTemplateHtml = (value) => {
    const rawValue = String(value || "").trim();

    return isSmokeCandidateBlockTemplateHtml(rawValue) ? "<p><br></p>" : rawValue || "<p><br></p>";
  };
  const normalizeTemplateFeature = (value) => {
    const featureSource = value && typeof value === "object" ? value : {};

    return {
      enabled: normalizeBoolean(featureSource.enabled, false),
      templateHtml: normalizeCandidateBlockTemplateHtml(featureSource.templateHtml ?? featureSource.blockTemplateHtml),
    };
  };
  const columnNameRowSource = source.columnNameRow ?? source.fieldNameRow;
  const columnNameRow = normalizeTemplateFeature(columnNameRowSource);

  return {
    blockTemplateHtml,
    columnNameRow: {
      ...columnNameRow,
      heightPt: normalizeFiniteNumber(
        columnNameRowSource?.heightPt ?? columnNameRowSource?.height,
        20,
        4,
        240,
      ),
    },
    columns: Math.round(normalizeFiniteNumber(source.columns, 2, 1, 4)),
    enabled: normalizeBoolean(source.enabled, false),
    emptyBlockLayer: normalizeTemplateFeature(source.emptyBlockLayer ?? source.emptyValueLayer),
    fillEmptyBlocks: normalizeBoolean(source.fillEmptyBlocks, true),
    gapXPt: normalizeFiniteNumber(source.gapXPt ?? source.gapX, 4, 0, 48),
    gapYPt: normalizeFiniteNumber(source.gapYPt ?? source.gapY, 4, 0, 48),
    heightPt: normalizeFiniteNumber(source.heightPt, 0, 0, 2000),
    rows: Math.round(normalizeFiniteNumber(source.rows, 10, 1, 30)),
    sortDirection: normalizeCandidateBlockGridSortDirection(source.sortDirection ?? source.sort?.direction),
    sortKey: normalizeCandidateBlockGridSortKey(source.sortKey ?? source.sortField ?? source.sort?.field),
    variant: "photo",
    widthPt: normalizeFiniteNumber(source.widthPt, 0, 0, 2000),
    xPt: normalizeFiniteNumber(source.xPt ?? source.x, 0, 0, 2000),
    yPt: normalizeFiniteNumber(source.yPt ?? source.y, 0, 0, 2000),
  };
}

function normalizePageSettings(settings, paperConfig, pageType = "") {
  const normalizedSettings = settings && typeof settings === "object" ? { ...settings } : {};

  normalizedSettings.safeArea = normalizeMargin(normalizedSettings.safeArea, paperConfig.margin);

  if (normalizedSettings.recognitionMarks && typeof normalizedSettings.recognitionMarks === "object") {
    normalizedSettings.recognitionMarks = normalizeRecognitionMarks(normalizedSettings.recognitionMarks);
  }

  if (normalizedSettings.pageNumber && typeof normalizedSettings.pageNumber === "object") {
    normalizedSettings.pageNumber = normalizePageNumberSettings(normalizedSettings.pageNumber);
    if (isCoverPageType(pageType)) {
      normalizedSettings.pageNumber.enabled = false;
    }
  }

  if (normalizedSettings.candidateBlockGrid && typeof normalizedSettings.candidateBlockGrid === "object") {
    normalizedSettings.candidateBlockGrid = normalizeCandidateBlockGridSettings(normalizedSettings.candidateBlockGrid);
    if (isCoverPageType(pageType)) {
      normalizedSettings.candidateBlockGrid.enabled = false;
    }
  }

  if (normalizedSettings.otherRoomPage && typeof normalizedSettings.otherRoomPage === "object") {
    normalizedSettings.otherRoomPage = normalizeOtherRoomPageSettings(normalizedSettings.otherRoomPage);
    if (isCoverPageType(pageType)) {
      normalizedSettings.otherRoomPage.enabled = false;
    }
  }

  return normalizedSettings;
}

module.exports = {
  isCoverPageType,
  isSmokeCandidateBlockTemplateHtml,
  normalizeCandidateBlockGridSettings,
  normalizeOtherRoomPageSettings,
  normalizePageNumberSettings,
  normalizePageSettings,
  normalizeRecognitionMarks,
  supportedPageNumberPositions,
  supportedPageNumberPresets,
};
