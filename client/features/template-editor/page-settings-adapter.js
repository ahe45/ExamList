const pointsPerMillimeter = 72 / 25.4;
const millimetersPerPoint = 25.4 / 72;

export const supportedRuntimePageSizes = new Set(["A3", "A4", "B5", "LETTER", "LEGAL"]);

export const examListPaperPresetByRuntimeSize = Object.freeze({
  A3: "A3",
  A4: "A4",
  B5: "B5",
  LEGAL: "Legal",
  LETTER: "Letter",
});

export const runtimePageSizeByExamListPaperPreset = Object.freeze({
  A3: "A3",
  A4: "A4",
  B5: "B5",
  Legal: "LEGAL",
  Letter: "LETTER",
});

export const paperPresetDimensionsPt = Object.freeze({
  A3: Object.freeze({ heightPt: 1190.55, widthPt: 841.89 }),
  A4: Object.freeze({ heightPt: 841.89, widthPt: 595.28 }),
  B5: Object.freeze({ heightPt: 728.5, widthPt: 515.91 }),
  Legal: Object.freeze({ heightPt: 1008, widthPt: 612 }),
  Letter: Object.freeze({ heightPt: 792, widthPt: 612 }),
});

const defaultSafeAreaPt = Object.freeze({
  bottom: 28.35,
  left: 28.35,
  right: 28.35,
  top: 28.35,
});

export function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function toMillimeterValue(pointValue) {
  return Math.max(0, Math.round(toFiniteNumber(pointValue, 0) * millimetersPerPoint * 10) / 10);
}

export function toPointValue(millimeterValue) {
  return Math.max(0, Math.round(toFiniteNumber(millimeterValue, 0) * pointsPerMillimeter * 100) / 100);
}

export function normalizeOrientation(value) {
  return String(value || "").trim() === "landscape" ? "landscape" : "portrait";
}

export function getRuntimePageSizeFromTemplate(template) {
  return runtimePageSizeByExamListPaperPreset[template?.paperPreset] || "A4";
}

export function getSafeAreaPt(page, template) {
  const pageSafeArea = page?.settings?.safeArea && typeof page.settings.safeArea === "object"
    ? page.settings.safeArea
    : {};
  const templateMargin = template?.layout?.paper?.margin && typeof template.layout.paper.margin === "object"
    ? template.layout.paper.margin
    : defaultSafeAreaPt;

  return {
    bottom: toFiniteNumber(pageSafeArea.bottom, toFiniteNumber(templateMargin.bottom, defaultSafeAreaPt.bottom)),
    left: toFiniteNumber(pageSafeArea.left, toFiniteNumber(templateMargin.left, defaultSafeAreaPt.left)),
    right: toFiniteNumber(pageSafeArea.right, toFiniteNumber(templateMargin.right, defaultSafeAreaPt.right)),
    top: toFiniteNumber(pageSafeArea.top, toFiniteNumber(templateMargin.top, defaultSafeAreaPt.top)),
  };
}

export function getRuntimePageSettings(page, template) {
  const safeArea = getSafeAreaPt(page, template);

  return {
    marginBottom: toMillimeterValue(safeArea.bottom),
    marginLeft: toMillimeterValue(safeArea.left),
    marginRight: toMillimeterValue(safeArea.right),
    marginTop: toMillimeterValue(safeArea.top),
    orientation: normalizeOrientation(template?.orientation),
    size: getRuntimePageSizeFromTemplate(template),
  };
}
