const {
  normalizeGenerationUnit,
  supportedGenerationUnits,
} = require("./generation-units");

const supportedPaperPresets = Object.freeze(["A4", "A3", "B4", "B5", "Letter", "Legal", "Custom"]);
const supportedOrientations = Object.freeze(["portrait", "landscape"]);

function normalizePositiveInteger(value, fallback, minimum = 1, maximum = 100) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function normalizeListFilter(rawFilter = {}) {
  const keyword = String(rawFilter.keyword || "").trim();
  const paperPreset = String(rawFilter.paperPreset || "").trim();
  const orientation = String(rawFilter.orientation || "").trim();
  const generationUnit = String(rawFilter.generationUnit || "").trim();

  return {
    generationUnit: supportedGenerationUnits.includes(generationUnit) ? normalizeGenerationUnit(generationUnit, "") : "",
    keyword,
    limit: normalizePositiveInteger(rawFilter.limit, 10, 1, 100),
    orientation: supportedOrientations.includes(orientation) ? orientation : "",
    page: normalizePositiveInteger(rawFilter.page, 1, 1, 10000),
    paperPreset: supportedPaperPresets.includes(paperPreset) ? paperPreset : "",
  };
}

function normalizeTemplateMetadata(payload = {}, existingTemplate = {}) {
  const rawGenerationUnit = String(payload.generationUnit ?? existingTemplate.generationUnit ?? "roomCode").trim();
  const metadata = {
    description: String(payload.description ?? existingTemplate.description ?? "").trim(),
    generationUnit: supportedGenerationUnits.includes(rawGenerationUnit)
      ? normalizeGenerationUnit(rawGenerationUnit)
      : rawGenerationUnit,
    name: String(payload.name ?? existingTemplate.name ?? "").trim(),
    orientation: String(payload.orientation ?? existingTemplate.orientation ?? "portrait").trim(),
    paperPreset: String(payload.paperPreset ?? existingTemplate.paperPreset ?? "A4").trim(),
  };

  if (!metadata.name) {
    const error = new Error("템플릿명을 입력하세요.");
    error.statusCode = 400;
    error.errorCode = "TEMPLATE_NAME_REQUIRED";
    throw error;
  }

  if (!supportedPaperPresets.includes(metadata.paperPreset)) {
    const error = new Error("지원하지 않는 용지 설정입니다.");
    error.statusCode = 400;
    error.errorCode = "INVALID_PAPER_PRESET";
    throw error;
  }

  if (!supportedOrientations.includes(metadata.orientation)) {
    const error = new Error("지원하지 않는 방향 설정입니다.");
    error.statusCode = 400;
    error.errorCode = "INVALID_ORIENTATION";
    throw error;
  }

  if (!supportedGenerationUnits.includes(metadata.generationUnit)) {
    const error = new Error("지원하지 않는 생성 단위입니다.");
    error.statusCode = 400;
    error.errorCode = "INVALID_GENERATION_UNIT";
    throw error;
  }

  return metadata;
}

module.exports = {
  normalizeListFilter,
  normalizeTemplateMetadata,
  supportedGenerationUnits,
  supportedOrientations,
  supportedPaperPresets,
};
