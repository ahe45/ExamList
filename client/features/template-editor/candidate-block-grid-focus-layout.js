const DEFAULT_VIEWPORT_WIDTH = 1024;
const DEFAULT_VIEWPORT_HEIGHT = 768;
const DEFAULT_CANVAS_EDGE_INSET_PX = 8;
const DEFAULT_CANVAS_INNER_PADDING_PX = 12;
const DEFAULT_MIN_CANVAS_WIDTH_PX = 180;
const DEFAULT_MIN_CANVAS_HEIGHT_PX = 180;
const DEFAULT_PANEL_PADDING_X_PX = 56;
const DEFAULT_PANEL_PADDING_Y_PX = 94;
const DEFAULT_LAYER_BORDER_WIDTH_PX = 2;
const DEFAULT_MIN_VISUAL_WIDTH_PX = 160;
const DEFAULT_MIN_VISUAL_HEIGHT_PX = 120;
const DEFAULT_MIN_SCALE = 0.5;
const DEFAULT_MAX_SCALE = 6;

function getViewportWidth(viewportSize = {}) {
  return Number(viewportSize.width) || DEFAULT_VIEWPORT_WIDTH;
}

function getViewportHeight(viewportSize = {}) {
  return Number(viewportSize.height) || DEFAULT_VIEWPORT_HEIGHT;
}

export function toFinitePixelValue(value, fallback) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

export function parseCssPixelValue(value) {
  const numericValue = Number.parseFloat(String(value || ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function calculateCandidateBlockFocusHostMetrics(hostRect, hostSize = {}) {
  const left = toFiniteNumber(hostRect?.left, 0);
  const top = toFiniteNumber(hostRect?.top, 0);
  const rectWidth = toFinitePixelValue(hostRect?.width, 1);
  const rectHeight = toFinitePixelValue(hostRect?.height, 1);
  const layoutWidth = toFinitePixelValue(hostSize.width, rectWidth);
  const layoutHeight = toFinitePixelValue(hostSize.height, rectHeight);

  return {
    left,
    scaleX: Math.max(0.01, rectWidth / layoutWidth),
    scaleY: Math.max(0.01, rectHeight / layoutHeight),
    top,
  };
}

export function translateCandidateBlockFocusViewportRectToHostRect(viewportRect, hostMetrics = {}) {
  const scaleX = Math.max(0.01, toFinitePixelValue(hostMetrics.scaleX, 1));
  const scaleY = Math.max(0.01, toFinitePixelValue(hostMetrics.scaleY, 1));

  return {
    height: Math.round(toFiniteNumber(viewportRect?.height, 0) / scaleY),
    left: Math.round((toFiniteNumber(viewportRect?.left, 0) - toFiniteNumber(hostMetrics.left, 0)) / scaleX),
    top: Math.round((toFiniteNumber(viewportRect?.top, 0) - toFiniteNumber(hostMetrics.top, 0)) / scaleY),
    width: Math.round(toFiniteNumber(viewportRect?.width, 0) / scaleX),
  };
}

export function calculateVisibleCanvasRect(canvasRect, viewportSize = {}) {
  const fallbackWidth = getViewportWidth(viewportSize);
  const fallbackHeight = getViewportHeight(viewportSize);

  if (!canvasRect) {
    return {
      bottom: fallbackHeight,
      height: fallbackHeight,
      left: 0,
      right: fallbackWidth,
      top: 0,
      width: fallbackWidth,
    };
  }

  const left = Math.max(DEFAULT_CANVAS_EDGE_INSET_PX, canvasRect.left + DEFAULT_CANVAS_INNER_PADDING_PX);
  const top = Math.max(DEFAULT_CANVAS_EDGE_INSET_PX, canvasRect.top + DEFAULT_CANVAS_INNER_PADDING_PX);
  const right = Math.min(fallbackWidth - DEFAULT_CANVAS_EDGE_INSET_PX, canvasRect.right - DEFAULT_CANVAS_INNER_PADDING_PX);
  const bottom = Math.min(fallbackHeight - DEFAULT_CANVAS_EDGE_INSET_PX, canvasRect.bottom - DEFAULT_CANVAS_INNER_PADDING_PX);
  const width = Math.max(DEFAULT_MIN_CANVAS_WIDTH_PX, right - left);
  const height = Math.max(DEFAULT_MIN_CANVAS_HEIGHT_PX, bottom - top);

  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
  };
}

export function calculateCanvasBackdropRect(canvasRect, viewportSize = {}) {
  const fallbackWidth = getViewportWidth(viewportSize);
  const fallbackHeight = getViewportHeight(viewportSize);

  if (!canvasRect) {
    return {
      height: fallbackHeight,
      left: 0,
      top: 0,
      width: fallbackWidth,
    };
  }

  const left = Math.max(0, canvasRect.left);
  const top = Math.max(0, canvasRect.top);
  const right = Math.min(fallbackWidth, canvasRect.right);
  const bottom = Math.min(fallbackHeight, canvasRect.bottom);

  return {
    height: Math.max(0, bottom - top),
    left: Math.round(left),
    top: Math.round(top),
    width: Math.max(0, right - left),
  };
}

export function calculateCandidateBlockFocusLayout(canvasRect, logicalSize, options = {}) {
  const { height, width } = logicalSize || {};
  const panelPaddingX = options.panelPaddingX ?? DEFAULT_PANEL_PADDING_X_PX;
  const panelPaddingY = options.panelPaddingY ?? DEFAULT_PANEL_PADDING_Y_PX;
  const layerBorderWidth = options.layerBorderWidth ?? DEFAULT_LAYER_BORDER_WIDTH_PX;
  const minVisualWidth = options.minVisualWidth ?? DEFAULT_MIN_VISUAL_WIDTH_PX;
  const minVisualHeight = options.minVisualHeight ?? DEFAULT_MIN_VISUAL_HEIGHT_PX;
  const minScale = options.minScale ?? DEFAULT_MIN_SCALE;
  const maxScale = options.maxScale ?? DEFAULT_MAX_SCALE;
  const panelChromeX = panelPaddingX + layerBorderWidth;
  const panelChromeY = panelPaddingY + layerBorderWidth;
  const maxVisualWidth = Math.max(minVisualWidth, canvasRect.width - panelChromeX);
  const maxVisualHeight = Math.max(minVisualHeight, canvasRect.height - panelChromeY);
  const fitScale = Math.min(maxVisualWidth / width, maxVisualHeight / height);
  const rawScale = fitScale >= 1.35
    ? Math.min(maxScale, fitScale)
    : fitScale >= 1
      ? fitScale
      : Math.max(minScale, fitScale);
  const scale = Math.round(rawScale * 10000) / 10000;
  const visualWidth = Math.ceil(width * scale);
  const visualHeight = Math.ceil(height * scale);
  const panelWidth = visualWidth + panelChromeX;
  const panelHeight = visualHeight + panelChromeY;
  const panelLeft = Math.round(canvasRect.left + Math.max(0, (canvasRect.width - panelWidth) / 2));
  const panelTop = Math.round(canvasRect.top + Math.max(0, (canvasRect.height - panelHeight) / 2));

  return {
    editorHeight: height,
    editorWidth: width,
    panelHeight,
    panelLeft,
    panelTop,
    panelWidth,
    scale,
    visualHeight,
    visualWidth,
  };
}
