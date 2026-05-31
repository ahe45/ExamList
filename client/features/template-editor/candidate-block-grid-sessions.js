import {
  candidateBlockGridMinimumHeight,
  candidateBlockGridMinimumRowHeight,
  candidateBlockGridMinimumWidth,
  cssPixelToPointValue,
  objectResizeCorners,
} from "./candidate-block-grid-config.js";
import { parseCandidateBlockPixelValue } from "./candidate-block-grid-pixels.js";
import { ensurePageCandidateBlockGridConfig } from "./candidate-block-grid-renderer.js";
import { removeCandidateBlockGridFlowSpacers } from "./candidate-block-grid-dom.js";
import {
  getCandidateBlockGridTableMinimumSize,
  normalizeCandidateBlockTables,
} from "./candidate-block-grid-table-normalizer.js";

let candidateBlockGridResizeSession = null;
let candidateBlockGridMoveSession = null;
const candidateBlockGridTableMinimumTolerance = 25;

export function clearCandidateBlockGridMoveSession() {
  if (!candidateBlockGridMoveSession) {
    return;
  }

  candidateBlockGridMoveSession.gridElement?.classList?.remove("is-moving-candidate-block-grid");
  candidateBlockGridMoveSession = null;
}

export function resetCandidateBlockGridInteractionSessions() {
  clearCandidateBlockGridMoveSession();
  candidateBlockGridResizeSession?.gridElement?.classList?.remove("is-resizing-candidate-block-grid");
  candidateBlockGridResizeSession = null;
}

export function writeCandidateBlockGridSizeToConfig(selectedPage, gridElement) {
  if (!selectedPage || !(gridElement instanceof HTMLElement)) {
    return;
  }

  const config = ensurePageCandidateBlockGridConfig(selectedPage);
  const rect = gridElement.getBoundingClientRect();

  if (rect.width > 0) {
    config.widthPt = cssPixelToPointValue(rect.width);
  }

  if (rect.height > 0) {
    config.heightPt = cssPixelToPointValue(rect.height);
  }

  if (gridElement.style.position === "absolute") {
    config.xPt = cssPixelToPointValue(parseCandidateBlockPixelValue(gridElement.style.left, gridElement.offsetLeft));
    config.yPt = cssPixelToPointValue(parseCandidateBlockPixelValue(gridElement.style.top, gridElement.offsetTop));
  } else {
    config.xPt = 0;
    config.yPt = 0;
  }
}

function clampCandidateBlockGridCoordinate(value, maximum) {
  const safeMaximum = Math.max(Math.round(maximum) || 0, 0);

  return Math.min(safeMaximum, Math.max(0, Math.round(value) || 0));
}

function normalizeCandidateBlockGridEdgeCoordinate(value) {
  const roundedValue = Math.round(value) || 0;

  return Math.abs(roundedValue) <= 1 ? 0 : roundedValue;
}

function getCandidateBlockGridDocumentCoordinateMetrics(documentElement, scaleX = 1, scaleY = 1) {
  const rect = documentElement.getBoundingClientRect();
  const style = window.getComputedStyle(documentElement);
  const safeScaleX = Math.max(Number(scaleX) || 1, 0.01);
  const safeScaleY = Math.max(Number(scaleY) || 1, 0.01);
  const borderLeft = parseCandidateBlockPixelValue(style.borderLeftWidth, 0);
  const borderTop = parseCandidateBlockPixelValue(style.borderTopWidth, 0);

  return {
    height: Math.max(1, documentElement.clientHeight),
    left: rect.left + borderLeft * safeScaleX,
    top: rect.top + borderTop * safeScaleY,
    width: Math.max(1, documentElement.clientWidth),
  };
}

function prepareCandidateBlockGridMove(gridElement) {
  const documentElement = gridElement?.closest?.(".template-doc") || null;

  if (!(gridElement instanceof HTMLElement) || !(documentElement instanceof HTMLElement)) {
    return null;
  }

  const gridRect = gridElement.getBoundingClientRect();
  const scaleX = gridElement.offsetWidth > 0 ? gridRect.width / gridElement.offsetWidth : 1;
  const scaleY = gridElement.offsetHeight > 0 ? gridRect.height / gridElement.offsetHeight : 1;
  const safeScaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
  const safeScaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
  const documentMetrics = getCandidateBlockGridDocumentCoordinateMetrics(documentElement, safeScaleX, safeScaleY);
  const width = Math.max(candidateBlockGridMinimumWidth, Math.round(gridElement.offsetWidth || gridRect.width / safeScaleX || 0));
  const height = Math.max(candidateBlockGridMinimumHeight, Math.round(gridElement.offsetHeight || gridRect.height / safeScaleY || 0));
  const left = gridElement.style.position === "absolute"
    ? clampCandidateBlockGridCoordinate(
        normalizeCandidateBlockGridEdgeCoordinate(parseCandidateBlockPixelValue(gridElement.style.left, gridElement.offsetLeft)),
        documentMetrics.width - width,
      )
    : clampCandidateBlockGridCoordinate((gridRect.left - documentMetrics.left) / safeScaleX, documentMetrics.width - width);
  const top = gridElement.style.position === "absolute"
    ? clampCandidateBlockGridCoordinate(
        normalizeCandidateBlockGridEdgeCoordinate(parseCandidateBlockPixelValue(gridElement.style.top, gridElement.offsetTop)),
        documentMetrics.height - height,
      )
    : clampCandidateBlockGridCoordinate((gridRect.top - documentMetrics.top) / safeScaleY, documentMetrics.height - height);

  removeCandidateBlockGridFlowSpacers(documentElement);

  gridElement.style.position = "absolute";
  gridElement.style.left = `${left}px`;
  gridElement.style.top = `${top}px`;
  gridElement.style.width = `${width}px`;
  gridElement.style.height = `${height}px`;
  gridElement.style.margin = "0";
  gridElement.style.maxWidth = "none";
  gridElement.style.zIndex = "0";

  return {
    height,
    left,
    maxHeight: documentMetrics.height,
    maxWidth: documentMetrics.width,
    scaleX: safeScaleX,
    scaleY: safeScaleY,
    top,
    width,
  };
}

function normalizeObjectResizeCorner(value) {
  return objectResizeCorners.includes(value) ? value : "bottom-right";
}

function getCandidateBlockGridMinimumSize(gridElement) {
  const tableMinimumSize = getCandidateBlockGridTableMinimumSize(gridElement);
  const gridStyle = window.getComputedStyle(gridElement);
  const gridRowCount = Math.max(1, Math.round(Number(gridElement?.dataset?.candidateBlockRows) || 1));
  const rowGap = parseCandidateBlockPixelValue(gridStyle.rowGap, 0);
  const rowMinimumHeight = Math.ceil(
    gridRowCount * candidateBlockGridMinimumRowHeight +
      Math.max(0, gridRowCount - 1) * rowGap,
  );
  const tableMinimumHeight = Math.max(
    0,
    Math.floor(tableMinimumSize.height || 0) - candidateBlockGridTableMinimumTolerance,
  );
  const tableMinimumWidth = Math.max(
    0,
    Math.floor(tableMinimumSize.width || 0) - candidateBlockGridTableMinimumTolerance,
  );

  return {
    height: Math.max(candidateBlockGridMinimumHeight, rowMinimumHeight, tableMinimumHeight),
    width: Math.max(candidateBlockGridMinimumWidth, tableMinimumWidth),
  };
}

function getObjectResizeDirections(corner) {
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

export function startCandidateBlockGridResizeSession(gridElement, event, selectedPage, markDirty, corner = "bottom-right", selectGridElement = null) {
  if (!(gridElement instanceof HTMLElement)) {
    return false;
  }

  const normalizedCorner = normalizeObjectResizeCorner(corner);
  const directions = getObjectResizeDirections(normalizedCorner);
  normalizeCandidateBlockTables(gridElement);
  const metrics = prepareCandidateBlockGridMove(gridElement);

  if (!metrics) {
    return false;
  }

  const maxWidth = directions.x < 0
    ? metrics.left + metrics.width
    : directions.x > 0
      ? metrics.maxWidth - metrics.left
      : metrics.width;
  const maxHeight = directions.y < 0
    ? metrics.top + metrics.height
    : directions.y > 0
      ? metrics.maxHeight - metrics.top
      : metrics.height;
  const minimumSize = getCandidateBlockGridMinimumSize(gridElement);

  candidateBlockGridResizeSession = {
    corner: normalizedCorner,
    directionX: directions.x,
    directionY: directions.y,
    gridElement,
    markDirty,
    maxHeight,
    maxWidth,
    minHeight: Number.isFinite(maxHeight)
      ? Math.min(minimumSize.height, maxHeight)
      : minimumSize.height,
    minWidth: Number.isFinite(maxWidth)
      ? Math.min(minimumSize.width, maxWidth)
      : minimumSize.width,
    pointerId: event.pointerId,
    scaleX: metrics.scaleX,
    scaleY: metrics.scaleY,
    selectedPage,
    startHeight: metrics.height,
    startLeft: metrics.left,
    startTop: metrics.top,
    startWidth: metrics.width,
    startX: event.clientX,
    startY: event.clientY,
  };

  selectGridElement?.(gridElement);
  gridElement.classList.add("is-resizing-candidate-block-grid");
  try {
    event.target?.setPointerCapture?.(event.pointerId);
  } catch (_error) {
    // Synthetic pointer events used in smoke tests may not have an active capture target.
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
}

export function handleCandidateBlockGridResizeMove(event) {
  const session = candidateBlockGridResizeSession;

  if (!session || session.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = (event.clientX - session.startX) / session.scaleX;
  const deltaY = (event.clientY - session.startY) / session.scaleY;
  const directionX = Number.isFinite(session.directionX) ? session.directionX : 1;
  const directionY = Number.isFinite(session.directionY) ? session.directionY : 1;
  const inwardWidthAdjustment = directionX !== 0 && deltaX * directionX < 0 ? 2 : 0;
  const inwardHeightAdjustment = directionY !== 0 && deltaY * directionY < 0 ? 3 : 0;
  const getResizeDelta = (logicalDelta, rawClientDelta, direction, inwardAdjustment) => {
    if (direction === 0) {
      return 0;
    }

    const directedLogicalDelta = logicalDelta * direction;

    if (directedLogicalDelta >= 0) {
      return Math.round(directedLogicalDelta);
    }

    const directedClientDelta = rawClientDelta * direction;
    const visibleMinimumDelta = Math.ceil(Math.abs(directedClientDelta) * 0.65);

    return -Math.max(Math.round(Math.abs(directedLogicalDelta)) + inwardAdjustment, visibleMinimumDelta);
  };
  const resizeDeltaX = getResizeDelta(deltaX, event.clientX - session.startX, directionX, inwardWidthAdjustment);
  const resizeDeltaY = getResizeDelta(deltaY, event.clientY - session.startY, directionY, inwardHeightAdjustment);
  const proposedWidth = directionX === 0
    ? Math.max(session.minWidth, Math.round(session.startWidth))
    : Math.max(session.minWidth, Math.round(session.startWidth + resizeDeltaX));
  const proposedHeight = directionY === 0
    ? Math.max(session.minHeight, Math.round(session.startHeight))
    : Math.max(session.minHeight, Math.round(session.startHeight + resizeDeltaY));
  const nextWidth = Number.isFinite(session.maxWidth)
    ? Math.min(proposedWidth, session.maxWidth)
    : proposedWidth;
  const nextHeight = Number.isFinite(session.maxHeight)
    ? Math.min(proposedHeight, session.maxHeight)
    : proposedHeight;
  const nextLeft = directionX < 0
    ? Math.max(0, Math.round(session.startLeft + session.startWidth - nextWidth))
    : Math.round(session.startLeft);
  const nextTop = directionY < 0
    ? Math.max(0, Math.round(session.startTop + session.startHeight - nextHeight))
    : Math.round(session.startTop);

  if (session.minWidth < candidateBlockGridMinimumWidth) {
    session.gridElement.style.minWidth = `${session.minWidth}px`;
  } else {
    session.gridElement.style.removeProperty("min-width");
  }

  if (session.minHeight < candidateBlockGridMinimumHeight) {
    session.gridElement.style.minHeight = `${session.minHeight}px`;
  } else {
    session.gridElement.style.removeProperty("min-height");
  }

  session.gridElement.style.left = `${nextLeft}px`;
  session.gridElement.style.top = `${nextTop}px`;
  session.gridElement.style.width = `${nextWidth}px`;
  session.gridElement.style.height = `${nextHeight}px`;

  const documentElement = session.gridElement.closest(".template-doc");

  if (directionY > 0 && documentElement instanceof HTMLElement) {
    const gridRect = session.gridElement.getBoundingClientRect();
    const documentRect = documentElement.getBoundingClientRect();
    const heightOverflow = gridRect.bottom - documentRect.bottom;

    if (heightOverflow > 0.5) {
      const renderedScaleY = session.gridElement.offsetHeight > 0 ? gridRect.height / session.gridElement.offsetHeight : session.scaleY;
      const adjustedHeight = Math.max(
        session.minHeight,
        Math.floor(nextHeight - heightOverflow / Math.max(renderedScaleY, 0.01) - 1),
      );

      session.gridElement.style.height = `${adjustedHeight}px`;
    }
  }

  normalizeCandidateBlockTables(session.gridElement);
  writeCandidateBlockGridSizeToConfig(session.selectedPage, session.gridElement);
  event.preventDefault();
}

export function handleCandidateBlockGridResizeEnd(event) {
  const session = candidateBlockGridResizeSession;

  if (!session || session.pointerId !== event.pointerId) {
    return;
  }

  session.gridElement.classList.remove("is-resizing-candidate-block-grid");
  normalizeCandidateBlockTables(session.gridElement);
  writeCandidateBlockGridSizeToConfig(session.selectedPage, session.gridElement);
  session.markDirty?.();
  candidateBlockGridResizeSession = null;
  event.preventDefault();
}

export function startCandidateBlockGridMoveSession(gridElement, event, selectedPage, markDirty, selectGridElement = null) {
  if (!(gridElement instanceof HTMLElement)) {
    return false;
  }

  const metrics = prepareCandidateBlockGridMove(gridElement);

  if (!metrics) {
    return false;
  }

  candidateBlockGridMoveSession = {
    gridElement,
    height: metrics.height,
    lastLeft: metrics.left,
    lastTop: metrics.top,
    markDirty,
    maxHeight: metrics.maxHeight,
    maxWidth: metrics.maxWidth,
    pointerId: event.pointerId,
    scaleX: metrics.scaleX,
    scaleY: metrics.scaleY,
    selectedPage,
    startLeft: metrics.left,
    startTop: metrics.top,
    startX: event.clientX,
    startY: event.clientY,
    width: metrics.width,
  };

  selectGridElement?.(gridElement);
  gridElement.classList.add("is-moving-candidate-block-grid");
  writeCandidateBlockGridSizeToConfig(selectedPage, gridElement);

  try {
    event.target?.setPointerCapture?.(event.pointerId);
  } catch (_error) {
    // Synthetic pointer events used in smoke tests may not have an active capture target.
  }

  event.preventDefault();
  event.stopPropagation();
  return true;
}

export function nudgeCandidateBlockGridPosition(gridElement, deltaX = 0, deltaY = 0, selectedPage, markDirty, selectGridElement = null) {
  if (!(gridElement instanceof HTMLElement)) {
    return false;
  }

  const metrics = prepareCandidateBlockGridMove(gridElement);

  if (!metrics) {
    return false;
  }

  const nextLeft = clampCandidateBlockGridCoordinate(
    metrics.left + Number(deltaX || 0),
    metrics.maxWidth - metrics.width,
  );
  const nextTop = clampCandidateBlockGridCoordinate(
    metrics.top + Number(deltaY || 0),
    metrics.maxHeight - metrics.height,
  );
  const didChange = nextLeft !== metrics.left || nextTop !== metrics.top;

  gridElement.style.left = `${nextLeft}px`;
  gridElement.style.top = `${nextTop}px`;
  writeCandidateBlockGridSizeToConfig(selectedPage, gridElement);
  selectGridElement?.(gridElement);

  if (didChange) {
    markDirty?.();
  }

  return true;
}

export function handleCandidateBlockGridMove(event) {
  const session = candidateBlockGridMoveSession;

  if (!session || session.pointerId !== event.pointerId) {
    return;
  }

  const nextLeft = clampCandidateBlockGridCoordinate(
    session.startLeft + (event.clientX - session.startX) / session.scaleX,
    session.maxWidth - session.width,
  );
  const nextTop = clampCandidateBlockGridCoordinate(
    session.startTop + (event.clientY - session.startY) / session.scaleY,
    session.maxHeight - session.height,
  );

  if (nextLeft !== session.lastLeft || nextTop !== session.lastTop) {
    session.gridElement.style.left = `${nextLeft}px`;
    session.gridElement.style.top = `${nextTop}px`;
    session.lastLeft = nextLeft;
    session.lastTop = nextTop;
    writeCandidateBlockGridSizeToConfig(session.selectedPage, session.gridElement);
  }

  event.preventDefault();
}

export function handleCandidateBlockGridMoveEnd(event) {
  const session = candidateBlockGridMoveSession;

  if (!session || session.pointerId !== event.pointerId) {
    return;
  }

  session.gridElement.classList.remove("is-moving-candidate-block-grid");
  writeCandidateBlockGridSizeToConfig(session.selectedPage, session.gridElement);
  session.markDirty?.();
  candidateBlockGridMoveSession = null;
  event.preventDefault();
}
