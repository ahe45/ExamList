import {
  getObjectAlignmentCanvasMetrics,
  getObjectAlignmentDocumentElement,
  prepareObjectAlignmentItem,
  setObjectAlignmentItemPosition,
  syncObjectAlignmentTableFlow,
} from "./object-alignment-runtime.js";
import { getCandidateBlockGridMinimumSize } from "./object-size-measurements.js";
import { applyObjectTableSize } from "./object-size-controls.js";
import { writeCandidateBlockGridSizeToConfig } from "./candidate-block-grid-sessions.js";
import { normalizeCandidateBlockTables } from "./candidate-block-grid-table-normalizer.js";
import {
  calculateObjectMovePosition,
  calculateObjectResizeRect,
  getObjectResizeDirections,
} from "./object-interaction-geometry.js";

const TABLE_MINIMUM_SIZE = 24;

function getOverlayContainerMetrics(containerElement) {
  const rect = containerElement.getBoundingClientRect();
  const logicalWidth = containerElement.offsetWidth || containerElement.clientWidth || rect.width || 0;
  const logicalHeight = containerElement.offsetHeight || containerElement.clientHeight || rect.height || 0;
  const scaleX = logicalWidth > 0 && rect.width > 0 ? rect.width / logicalWidth : 1;
  const scaleY = logicalHeight > 0 && rect.height > 0 ? rect.height / logicalHeight : 1;

  return {
    originLeft: rect.left + (containerElement.clientLeft || 0) * Math.max(scaleX || 1, 0.01),
    originTop: rect.top + (containerElement.clientTop || 0) * Math.max(scaleY || 1, 0.01),
    scaleX: Math.max(scaleX || 1, 0.01),
    scaleY: Math.max(scaleY || 1, 0.01),
  };
}

export function syncTableObjectOverlayGeometry(rootElement) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement.querySelectorAll(".template-editor-table-selection").forEach((overlayElement) => {
    const tableElement = overlayElement.__templateEditorTableElement;
    const containerElement = overlayElement.parentElement;

    if (!(overlayElement instanceof HTMLElement) || !(tableElement instanceof HTMLTableElement) || !(containerElement instanceof HTMLElement)) {
      return;
    }

    const tableRect = tableElement.getBoundingClientRect();
    const containerMetrics = getOverlayContainerMetrics(containerElement);

    if (tableRect.width < 1 || tableRect.height < 1) {
      return;
    }

    overlayElement.style.left = `${Math.round((tableRect.left - containerMetrics.originLeft) / containerMetrics.scaleX)}px`;
    overlayElement.style.top = `${Math.round((tableRect.top - containerMetrics.originTop) / containerMetrics.scaleY)}px`;
    overlayElement.style.width = `${Math.round(tableRect.width / containerMetrics.scaleX)}px`;
    overlayElement.style.height = `${Math.round(tableRect.height / containerMetrics.scaleY)}px`;
  });
}

function getTableFromOverlay(target, surfaceElement) {
  const overlay = target?.closest?.(".template-editor-table-selection.is-selected");
  const tableElement = overlay?.__templateEditorTableElement || null;

  return tableElement instanceof HTMLTableElement && surfaceElement.contains(tableElement) && !tableElement.closest("[data-candidate-block-instance]")
    ? tableElement
    : null;
}

function resolvePointerTarget(event, surfaceElement) {
  const target = event.target instanceof Element ? event.target : null;

  if (!target) {
    return null;
  }

  const tableResizeHandle = target.closest("[data-template-table-object-handle]");
  const tableMoveHandle = target.closest("[data-template-table-object-move-handle]");
  const tableElement = getTableFromOverlay(target, surfaceElement);

  if (tableElement && (tableResizeHandle || tableMoveHandle)) {
    return {
      corner: tableResizeHandle?.dataset?.templateTableObjectHandlePosition || "bottom-right",
      element: tableElement,
      handle: tableResizeHandle || tableMoveHandle,
      kind: tableResizeHandle ? "resize" : "move",
      type: "table",
    };
  }

  const gridResizeHandle = target.closest("[data-candidate-block-grid-resize-handle]");
  const gridMoveHandle = target.closest("[data-candidate-block-grid-move-handle]");
  const gridElement = target.closest("[data-candidate-block-grid]");

  if (
    gridElement instanceof HTMLElement &&
    surfaceElement.contains(gridElement) &&
    gridElement.classList.contains("is-selected-candidate-block-grid") &&
    (gridResizeHandle || gridMoveHandle)
  ) {
    return {
      corner: gridResizeHandle?.dataset?.candidateBlockGridResizeCorner || "bottom-right",
      element: gridElement,
      handle: gridResizeHandle || gridMoveHandle,
      kind: gridResizeHandle ? "resize" : "move",
      type: "grid",
    };
  }

  return null;
}

export function bindObjectPointerControls({ editor, onDirty, selectedPage, surfaceElement, rootElement }) {
  if (!editor || !surfaceElement || !rootElement) {
    return null;
  }

  let session = null;
  let overlayFrame = 0;

  const scheduleOverlaySync = () => {
    if (overlayFrame) {
      return;
    }

    const requestFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));

    overlayFrame = requestFrame(() => {
      overlayFrame = 0;
      syncTableObjectOverlayGeometry(rootElement);
    });
  };

  const updateOverlays = () => {
    editor.updateImageSelectionOverlay?.();
    editor.updateTableObjectOverlay?.();
    syncTableObjectOverlayGeometry(rootElement);
  };
  const finishSession = (event) => {
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const completedSession = session;
    session = null;
    window.removeEventListener("pointermove", handlePointerMove, true);
    window.removeEventListener("pointerup", finishSession, true);
    window.removeEventListener("pointercancel", finishSession, true);
    completedSession.element.classList.remove(
      "is-moving-object",
      "is-resizing-object",
      "is-resizing-candidate-block-grid",
      "is-moving-candidate-block-grid",
    );

    if (completedSession.didChange) {
      if (completedSession.type === "grid") {
        normalizeCandidateBlockTables(completedSession.element);
        writeCandidateBlockGridSizeToConfig(selectedPage, completedSession.element);
      }
      onDirty?.();
    } else {
      updateOverlays();
    }

    event.preventDefault();
    event.stopImmediatePropagation?.();
  };
  const handlePointerMove = (event) => {
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - session.startX) / session.canvasMetrics.scaleX;
    const deltaY = (event.clientY - session.startY) / session.canvasMetrics.scaleY;

    if (session.kind === "move") {
      const nextPosition = calculateObjectMovePosition({
        deltaX,
        deltaY,
        maximumLeft: session.canvasMetrics.width - session.startWidth,
        maximumTop: session.canvasMetrics.height - session.startHeight,
        startLeft: session.startLeft,
        startTop: session.startTop,
      });
      const nextLeft = nextPosition.left;
      const nextTop = nextPosition.top;

      setObjectAlignmentItemPosition(session.item, nextLeft, nextTop, session.canvasMetrics);
      session.didChange = session.didChange || session.item.left !== session.startLeft || session.item.top !== session.startTop;
    } else {
      const nextRect = calculateObjectResizeRect({
        deltaX,
        deltaY,
        directionX: session.directionX,
        directionY: session.directionY,
        maximumHeight: session.directionY < 0
          ? session.startTop + session.startHeight
          : session.canvasMetrics.height - session.startTop,
        maximumWidth: session.directionX < 0
          ? session.startLeft + session.startWidth
          : session.canvasMetrics.width - session.startLeft,
        minimumHeight: session.minimumHeight,
        minimumWidth: session.minimumWidth,
        preserveAspectRatio: event.shiftKey && session.type !== "table",
        startHeight: session.startHeight,
        startLeft: session.startLeft,
        startTop: session.startTop,
        startWidth: session.startWidth,
      });
      const { height: nextHeight, left: nextLeft, top: nextTop, width: nextWidth } = nextRect;

      if (session.type === "table") {
        applyObjectTableSize(session.element, {
          height: session.directionY === 0 ? null : nextHeight,
          width: session.directionX === 0 ? null : nextWidth,
        });
        session.item.width = nextWidth;
        session.item.height = nextHeight;
        setObjectAlignmentItemPosition(session.item, nextLeft, nextTop, session.canvasMetrics, { syncFlow: false });
        syncObjectAlignmentTableFlow(session.element, session.documentElement, {
          height: nextHeight,
          top: nextTop,
        });
      } else {
        session.element.style.left = `${Math.round(nextLeft)}px`;
        session.element.style.top = `${Math.round(nextTop)}px`;
        session.element.style.width = `${Math.round(nextWidth)}px`;
        session.element.style.height = `${Math.round(nextHeight)}px`;
        normalizeCandidateBlockTables(session.element);
        writeCandidateBlockGridSizeToConfig(selectedPage, session.element);
      }

      session.didChange =
        session.didChange || nextWidth !== session.startWidth || nextHeight !== session.startHeight || nextLeft !== session.startLeft || nextTop !== session.startTop;
    }

    updateOverlays();
    event.preventDefault();
    event.stopImmediatePropagation?.();
  };
  const handlePointerDown = (event) => {
    if (event.button !== 0 || session) {
      return;
    }

    const target = resolvePointerTarget(event, surfaceElement);
    const documentElement = getObjectAlignmentDocumentElement(surfaceElement);

    if (!target || !(documentElement instanceof HTMLElement)) {
      return;
    }

    const canvasMetrics = getObjectAlignmentCanvasMetrics(documentElement);
    const item = prepareObjectAlignmentItem(target.element, documentElement, canvasMetrics);

    if (!item) {
      return;
    }

    const directions = getObjectResizeDirections(target.corner);
    const minimumSize = target.type === "grid"
      ? getCandidateBlockGridMinimumSize(target.element)
      : { height: TABLE_MINIMUM_SIZE, width: TABLE_MINIMUM_SIZE };

    session = {
      ...target,
      canvasMetrics,
      didChange: false,
      directionX: directions.x,
      directionY: directions.y,
      documentElement,
      item,
      minimumHeight: Math.max(1, minimumSize.height || TABLE_MINIMUM_SIZE),
      minimumWidth: Math.max(1, minimumSize.width || TABLE_MINIMUM_SIZE),
      pointerId: event.pointerId,
      startHeight: item.height,
      startLeft: item.left,
      startTop: item.top,
      startWidth: item.width,
      startX: event.clientX,
      startY: event.clientY,
    };

    target.element.classList.add(
      target.kind === "move"
        ? (target.type === "grid" ? "is-moving-candidate-block-grid" : "is-moving-object")
        : (target.type === "grid" ? "is-resizing-candidate-block-grid" : "is-resizing-object"),
    );
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", finishSession, true);
    window.addEventListener("pointercancel", finishSession, true);
    try {
      target.handle?.setPointerCapture?.(event.pointerId);
    } catch (_error) {
      // Synthetic events and interrupted pointer streams may not support capture.
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  };

  rootElement.addEventListener("pointerdown", handlePointerDown, true);
  rootElement.addEventListener("pointermove", scheduleOverlaySync);
  rootElement.addEventListener("click", scheduleOverlaySync);
  window.addEventListener("resize", scheduleOverlaySync);
  const overlayObserver = new MutationObserver(scheduleOverlaySync);
  overlayObserver.observe(surfaceElement, {
    attributeFilter: ["class"],
    attributes: true,
    childList: true,
    subtree: true,
  });
  scheduleOverlaySync();

  return () => {
    rootElement.removeEventListener("pointerdown", handlePointerDown, true);
    rootElement.removeEventListener("pointermove", scheduleOverlaySync);
    rootElement.removeEventListener("click", scheduleOverlaySync);
    window.removeEventListener("resize", scheduleOverlaySync);
    window.removeEventListener("pointermove", handlePointerMove, true);
    window.removeEventListener("pointerup", finishSession, true);
    window.removeEventListener("pointercancel", finishSession, true);
    overlayObserver.disconnect();
    if (overlayFrame) {
      const cancelFrame = window.cancelAnimationFrame || window.clearTimeout;
      cancelFrame(overlayFrame);
      overlayFrame = 0;
    }
    session = null;
  };
}
