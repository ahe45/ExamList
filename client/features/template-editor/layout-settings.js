const paperPresetDimensions = Object.freeze({
  A3: Object.freeze({ height: 1190.55, width: 841.89 }),
  A4: Object.freeze({ height: 841.89, width: 595.28 }),
  B4: Object.freeze({ height: 1031.81, width: 728.5 }),
  B5: Object.freeze({ height: 728.5, width: 515.91 }),
  Custom: Object.freeze({ height: 841.89, width: 595.28 }),
  Legal: Object.freeze({ height: 1008, width: 612 }),
  Letter: Object.freeze({ height: 792, width: 612 }),
});

export const defaultPageSafeArea = Object.freeze({
  bottom: 28.35,
  left: 28.35,
  right: 28.35,
  top: 28.35,
});

export const pageMarginFields = new Set(["bottom", "left", "right", "top"]);

export function normalizeBooleanValue(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (["true", "1", "yes"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

export function getFormFieldValue(target) {
  return target?.type === "checkbox" ? target.checked : target?.value;
}

export function normalizePageMarginValue(value, fallback = 0) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), 240);
}

export function normalizePageSafeArea(value, fallbackMargin = defaultPageSafeArea) {
  const safeArea = value && typeof value === "object" ? value : {};
  const fallbackSafeArea = fallbackMargin && typeof fallbackMargin === "object" ? fallbackMargin : defaultPageSafeArea;

  return {
    bottom: normalizePageMarginValue(safeArea.bottom, fallbackSafeArea.bottom ?? defaultPageSafeArea.bottom),
    left: normalizePageMarginValue(safeArea.left, fallbackSafeArea.left ?? defaultPageSafeArea.left),
    right: normalizePageMarginValue(safeArea.right, fallbackSafeArea.right ?? defaultPageSafeArea.right),
    top: normalizePageMarginValue(safeArea.top, fallbackSafeArea.top ?? defaultPageSafeArea.top),
  };
}

export function applyTemplatePaperSettings(template) {
  const baseDimension = paperPresetDimensions[template.paperPreset] || paperPresetDimensions.A4;
  const isLandscape = template.orientation === "landscape";
  const nextWidth = isLandscape ? baseDimension.height : baseDimension.width;
  const nextHeight = isLandscape ? baseDimension.width : baseDimension.height;

  if (template.layout?.paper) {
    template.layout.paper = {
      ...template.layout.paper,
      heightPt: nextHeight,
      orientation: template.orientation,
      preset: template.paperPreset,
      widthPt: nextWidth,
    };
  }

  if (Array.isArray(template.layout?.pages)) {
    template.layout.pages = template.layout.pages.map((page) => ({
      ...page,
      heightPt: nextHeight,
      widthPt: nextWidth,
    }));
  }
}
