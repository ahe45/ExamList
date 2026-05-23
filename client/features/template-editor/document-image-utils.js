export const editorCanvasDisplayScale = 4 / 3;
export const documentObjectMinimumSize = 5;

export const documentImageResizeCorners = Object.freeze([
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
  "top-left",
  "top",
  "top-right",
  "right",
]);

export const documentImageResizeClassNames = Object.freeze([
  "is-image-moving",
  "is-image-resizing",
  "is-image-resizing-top-left",
  "is-image-resizing-top",
  "is-image-resizing-top-right",
  "is-image-resizing-right",
  "is-image-resizing-bottom",
  "is-image-resizing-bottom-left",
  "is-image-resizing-bottom-right",
  "is-image-resizing-left",
]);

export function parseDocumentPixelValue(value, fallback = 0) {
  const parsedValue = parseFloat(String(value || "").replace("px", "").trim());

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function normalizeObjectResizeCorner(value) {
  return documentImageResizeCorners.includes(value) ? value : "bottom-right";
}

export function getObjectResizeDirections(corner) {
  const normalizedCorner = normalizeObjectResizeCorner(corner);

  return {
    x: normalizedCorner === "left" || normalizedCorner.endsWith("left")
      ? -1
      : normalizedCorner === "right" || normalizedCorner.endsWith("right")
        ? 1
        : 0,
    y: normalizedCorner === "top" || normalizedCorner.startsWith("top")
      ? -1
      : normalizedCorner === "bottom" || normalizedCorner.startsWith("bottom")
        ? 1
        : 0,
  };
}

export function getDocumentBoundedCoordinate(value, maxValue) {
  const safeMax = Math.max(Math.round(maxValue) || 0, 0);

  return Math.min(Math.max(Math.round(value) || 0, 0), safeMax);
}
