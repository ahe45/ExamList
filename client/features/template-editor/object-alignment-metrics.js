import { templateEditorObjectMinimumSize } from "./object-toolbar-constants.js";

export function parseObjectAlignmentPixelValue(value, fallback = 0) {
  const numericValue = Number.parseFloat(String(value || "").trim());

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function roundObjectAlignmentValue(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function clampObjectAlignmentValue(value, maximum) {
  const safeMaximum = Math.max(0, Number(maximum) || 0);

  return Math.min(safeMaximum, Math.max(0, roundObjectAlignmentValue(value)));
}

export function getObjectAlignmentDocumentElement(surfaceElement) {
  return surfaceElement?.querySelector?.(".template-doc") || surfaceElement || null;
}

export function isObjectEditorReadOnly(surfaceElement) {
  return surfaceElement?.getAttribute?.("contenteditable") === "false" || surfaceElement?.classList?.contains("readonly");
}

export function getObjectAlignmentCanvasMetrics(documentElement) {
  const rect = documentElement.getBoundingClientRect();
  const width = documentElement.clientWidth || rect.width || 0;
  const height = documentElement.clientHeight || rect.height || 0;
  const scaleX = width > 0 && rect.width > 0 ? rect.width / width : 1;
  const scaleY = height > 0 && rect.height > 0 ? rect.height / height : 1;

  return {
    height,
    rect,
    scaleX: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
    scaleY: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1,
    width,
  };
}

export function getObjectAlignmentImageElements(surfaceElement) {
  if (!surfaceElement?.querySelectorAll) {
    return [];
  }

  return Array.from(
    new Set([
      ...surfaceElement.querySelectorAll("img.template-editor-image-object"),
      ...surfaceElement.querySelectorAll("img.template-generated-object"),
      ...surfaceElement.querySelectorAll("img.is-selected-object"),
    ]),
  ).filter((element) => element instanceof HTMLImageElement && surfaceElement.contains(element));
}

export function isObjectAlignmentTableElement(element, surfaceElement) {
  return Boolean(
    element instanceof HTMLTableElement &&
      surfaceElement?.contains?.(element) &&
      element.closest?.(".template-doc") &&
      !element.closest?.("[data-candidate-block-instance]") &&
      !element.closest?.("td, th"),
  );
}

export function getObjectAlignmentTableElements(surfaceElement) {
  if (!surfaceElement?.querySelectorAll) {
    return [];
  }

  return Array.from(
    new Set([
      ...surfaceElement.querySelectorAll(".template-doc table"),
      ...surfaceElement.querySelectorAll("table.is-selected-table-object"),
      ...surfaceElement.querySelectorAll("table.is-selected-object"),
    ]),
  ).filter((element) => isObjectAlignmentTableElement(element, surfaceElement));
}

export function isObjectAlignmentElement(element, surfaceElement) {
  return (
    (element instanceof HTMLImageElement && getObjectAlignmentImageElements(surfaceElement).includes(element)) ||
    isObjectAlignmentTableElement(element, surfaceElement)
  );
}

export function getObjectAlignmentElements(surfaceElement) {
  return Array.from(
    new Set([
      ...getObjectAlignmentImageElements(surfaceElement),
      ...getObjectAlignmentTableElements(surfaceElement),
    ]),
  );
}

export function getSelectedObjectAlignmentElements(surfaceElement) {
  if (!surfaceElement?.querySelectorAll) {
    return [];
  }

  return getObjectAlignmentElements(surfaceElement).filter((element) =>
    element.classList.contains("is-selected-object") ||
      element.classList.contains("is-selected-table-object"),
  );
}

function getObjectAlignmentTableBorderEventTarget(event, surfaceElement) {
  if (!surfaceElement?.querySelectorAll || !event) {
    return null;
  }

  const eventX = Number(event.clientX);
  const eventY = Number(event.clientY);

  if (!Number.isFinite(eventX) || !Number.isFinite(eventY)) {
    return null;
  }

  const hitSlop = 8;
  let closestTableElement = null;
  let closestDistance = Infinity;

  getObjectAlignmentTableElements(surfaceElement).forEach((tableElement) => {
    const rect = tableElement.getBoundingClientRect();

    if (rect.width < 1 || rect.height < 1) {
      return;
    }

    const distances = [];

    if (
      eventX < rect.left &&
      eventX >= rect.left - hitSlop &&
      eventY >= rect.top - hitSlop &&
      eventY <= rect.bottom + hitSlop
    ) {
      distances.push(rect.left - eventX);
    }

    if (
      eventX > rect.right &&
      eventX <= rect.right + hitSlop &&
      eventY >= rect.top - hitSlop &&
      eventY <= rect.bottom + hitSlop
    ) {
      distances.push(eventX - rect.right);
    }

    if (
      eventY < rect.top &&
      eventY >= rect.top - hitSlop &&
      eventX >= rect.left - hitSlop &&
      eventX <= rect.right + hitSlop
    ) {
      distances.push(rect.top - eventY);
    }

    if (
      eventY > rect.bottom &&
      eventY <= rect.bottom + hitSlop &&
      eventX >= rect.left - hitSlop &&
      eventX <= rect.right + hitSlop
    ) {
      distances.push(eventY - rect.bottom);
    }

    if (!distances.length) {
      return;
    }

    const distance = Math.min(...distances);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestTableElement = tableElement;
    }
  });

  return closestTableElement;
}

export function getObjectAlignmentEventTarget(target, surfaceElement, event = null) {
  const baseElement = target instanceof Element
    ? target
    : target?.parentElement instanceof Element
      ? target.parentElement
      : null;

  if (!baseElement || !surfaceElement?.contains?.(baseElement)) {
    return null;
  }

  const tableOverlayElement = baseElement.closest(".template-editor-table-selection");
  const overlayTableElement = tableOverlayElement?.__templateEditorTableElement || null;

  if (isObjectAlignmentTableElement(overlayTableElement, surfaceElement)) {
    return overlayTableElement;
  }

  const imageElement = baseElement.closest("img.template-editor-image-object, img.template-generated-object");

  if (imageElement instanceof HTMLImageElement && getObjectAlignmentImageElements(surfaceElement).includes(imageElement)) {
    return imageElement;
  }

  return getObjectAlignmentTableBorderEventTarget(event, surfaceElement);
}

export function getObjectTableCellElement(element, surfaceElement) {
  const cellElement = element?.closest?.("td, th") || null;

  return cellElement instanceof HTMLElement && surfaceElement?.contains?.(cellElement)
    ? cellElement
    : null;
}

function getObjectCellFinitePixelValue(value) {
  const numericValue = Number.parseFloat(String(value || "").trim());

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function getObjectTableCellContentSize(element, surfaceElement, minimumSize = templateEditorObjectMinimumSize) {
  const cellElement = getObjectTableCellElement(element, surfaceElement);

  if (!(cellElement instanceof HTMLElement)) {
    return null;
  }

  const computedStyle = window.getComputedStyle(cellElement);
  const cellRect = cellElement.getBoundingClientRect();
  const paddingLeft = getObjectCellFinitePixelValue(computedStyle.paddingLeft);
  const paddingRight = getObjectCellFinitePixelValue(computedStyle.paddingRight);
  const paddingTop = getObjectCellFinitePixelValue(computedStyle.paddingTop);
  const paddingBottom = getObjectCellFinitePixelValue(computedStyle.paddingBottom);
  const borderLeft = getObjectCellFinitePixelValue(computedStyle.borderLeftWidth);
  const borderRight = getObjectCellFinitePixelValue(computedStyle.borderRightWidth);
  const borderTop = getObjectCellFinitePixelValue(computedStyle.borderTopWidth);
  const borderBottom = getObjectCellFinitePixelValue(computedStyle.borderBottomWidth);
  const width = Math.max(
    minimumSize,
    Math.floor(
      Math.max(
        cellElement.clientWidth - paddingLeft - paddingRight,
        cellRect.width - paddingLeft - paddingRight - borderLeft - borderRight,
        0,
      ),
    ),
  );
  const height = Math.max(
    minimumSize,
    Math.floor(
      Math.max(
        cellElement.clientHeight - paddingTop - paddingBottom,
        cellRect.height - paddingTop - paddingBottom - borderTop - borderBottom,
        0,
      ),
    ),
  );

  return {
    height,
    width,
  };
}

export function getObjectElementSize(element, surfaceElement) {
  const documentElement = getObjectAlignmentDocumentElement(surfaceElement);

  if (!(element instanceof HTMLElement) || !(documentElement instanceof HTMLElement)) {
    return {
      height: 0,
      width: 0,
    };
  }

  const canvasMetrics = getObjectAlignmentCanvasMetrics(documentElement);
  const objectRect = element.getBoundingClientRect();
  const width = roundObjectAlignmentValue(objectRect.width / canvasMetrics.scaleX) ||
    parseObjectAlignmentPixelValue(element.style.width, element.offsetWidth || 0);
  const height = roundObjectAlignmentValue(objectRect.height / canvasMetrics.scaleY) ||
    parseObjectAlignmentPixelValue(element.style.height, element.offsetHeight || 0);

  return {
    height: Math.max(templateEditorObjectMinimumSize, Math.round(height || templateEditorObjectMinimumSize)),
    width: Math.max(templateEditorObjectMinimumSize, Math.round(width || templateEditorObjectMinimumSize)),
  };
}

export function syncObjectAlignmentTableFlow(element, surfaceElement, geometry = {}) {
  if (!isObjectAlignmentTableElement(element, surfaceElement) || String(element.style.position || "") !== "absolute") {
    return null;
  }

  const documentElement = getObjectAlignmentDocumentElement(surfaceElement);
  const flowReflow = window.ExamListTemplateEditorObjectFlowReflow;

  if (!(documentElement instanceof HTMLElement) || typeof flowReflow?.reflowTemplateEditorObjectRows !== "function") {
    return null;
  }

  const size = getObjectElementSize(element, surfaceElement);
  const top = Number.isFinite(Number(geometry.top))
    ? Number(geometry.top)
    : parseObjectAlignmentPixelValue(element.style.top, element.offsetTop || 0);

  return flowReflow.reflowTemplateEditorObjectRows(element, {
    activeHeight: Number.isFinite(Number(geometry.height)) ? Number(geometry.height) : size.height,
    activeTop: top,
    documentElement,
    minimumHeight: templateEditorObjectMinimumSize,
    movementY: Number.isFinite(Number(geometry.movementY)) ? Number(geometry.movementY) : 0,
    reorderByPosition: geometry.reorderByPosition === true,
    strictGeometry: Number.isFinite(Number(geometry.height)) && Number.isFinite(Number(geometry.top)),
  });
}
