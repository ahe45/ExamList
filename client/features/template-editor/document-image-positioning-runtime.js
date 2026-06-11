import {
  documentObjectMinimumSize,
  editorCanvasDisplayScale,
  getDocumentBoundedCoordinate,
  getDocumentElementDisplayScale,
  parseDocumentPixelValue,
} from "./document-image-utils.js";

export function createDocumentImagePositioningRuntime({
  getDocumentContentRoot,
  getDocumentSurfaceByPageId,
}) {
  function getFiniteDocumentPixelValue(value) {
    const parsedValue = Number.parseFloat(String(value || "").trim());

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  function getDocumentTableCellImageContainer(imageElement, surface) {
    const cellElement = imageElement?.closest?.("td, th") || null;

    if (!(cellElement instanceof HTMLElement) || !surface?.contains(cellElement)) {
      return null;
    }

    const cellRect = cellElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(cellElement);
    const borderLeft = getFiniteDocumentPixelValue(computedStyle.borderLeftWidth);
    const borderRight = getFiniteDocumentPixelValue(computedStyle.borderRightWidth);
    const borderTop = getFiniteDocumentPixelValue(computedStyle.borderTopWidth);
    const borderBottom = getFiniteDocumentPixelValue(computedStyle.borderBottomWidth);
    const cellScale = getDocumentElementDisplayScale(cellElement, editorCanvasDisplayScale);
    const scaleX = cellScale.x;
    const scaleY = cellScale.y;
    const paddingBoxWidth = Math.max(
      cellElement.clientWidth || 0,
      cellRect.width / scaleX - borderLeft - borderRight,
      0,
    );
    const paddingBoxHeight = Math.max(
      cellElement.clientHeight || 0,
      cellRect.height / scaleY - borderTop - borderBottom,
      0,
    );

    return {
      element: cellElement,
      height: Math.max(documentObjectMinimumSize, Math.floor(paddingBoxHeight || documentObjectMinimumSize)),
      rect: {
        left: cellRect.left + borderLeft * scaleX,
        top: cellRect.top + borderTop * scaleY,
      },
      scaleX,
      scaleY,
      width: Math.max(documentObjectMinimumSize, Math.floor(paddingBoxWidth || documentObjectMinimumSize)),
    };
  }

  function removeEmptyDocumentImageHost(hostElement, containerElement) {
    if (
      !(hostElement instanceof HTMLElement) ||
      hostElement === containerElement ||
      !/^(P|DIV)$/i.test(String(hostElement.tagName || ""))
    ) {
      return;
    }

    const text = String(hostElement.textContent || "").replace(/\u00a0/g, " ").trim();
    const hasMeaningfulObject = Boolean(
      hostElement.querySelector("img, table, hr, [data-template-tag-value], .template-token, .template-generated-object"),
    );

    if (!text && !hasMeaningfulObject) {
      hostElement.remove();
    }
  }

  function lockDocumentImageTableCellSize(cellElement, scaleY = editorCanvasDisplayScale) {
    if (!(cellElement instanceof HTMLElement)) {
      return;
    }

    const safeScaleY = Math.max(Number(scaleY) || editorCanvasDisplayScale || 1, 0.01);
    const cellRect = cellElement.getBoundingClientRect();
    const rowElement = cellElement.parentElement;
    const measuredCellHeight = cellRect.height > 0 ? cellRect.height / safeScaleY : cellElement.offsetHeight || 0;
    const cellHeight = Math.max(documentObjectMinimumSize, Math.round(measuredCellHeight));

    if (cellHeight > 0) {
      cellElement.style.height = `${cellHeight}px`;
    }

    if (rowElement instanceof HTMLTableRowElement && Number(cellElement.rowSpan || 1) <= 1) {
      const rowRect = rowElement.getBoundingClientRect();
      const measuredRowHeight = rowRect.height > 0 ? rowRect.height / safeScaleY : rowElement.offsetHeight || 0;
      const rowHeight = Math.max(cellHeight, Math.round(measuredRowHeight));

      if (rowHeight > 0) {
        rowElement.style.height = `${rowHeight}px`;
        Array.from(rowElement.cells || []).forEach((rowCellElement) => {
          rowCellElement.style.height = `${rowHeight}px`;
        });
      }
    }
  }

  function prepareDocumentImageForFloatingPosition(imageElement, pageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const documentRoot = getDocumentContentRoot(surface);

    if (!surface || !documentRoot || !surface.contains(imageElement)) {
      return null;
    }

    const cellContainer = getDocumentTableCellImageContainer(imageElement, surface);

    if (cellContainer) {
      if (window.getComputedStyle(cellContainer.element).position === "static") {
        cellContainer.element.style.position = "relative";
      }

      if (imageElement.parentElement === cellContainer.element && imageElement.style.position === "absolute") {
        imageElement.classList.add("is-floating-object");
        return {
          boundsElement: cellContainer.element,
          boundsHeight: cellContainer.height,
          boundsWidth: cellContainer.width,
          left: parseDocumentPixelValue(imageElement.style.left, imageElement.offsetLeft),
          scaleX: cellContainer.scaleX,
          scaleY: cellContainer.scaleY,
          top: parseDocumentPixelValue(imageElement.style.top, imageElement.offsetTop),
        };
      }

      const imageRect = imageElement.getBoundingClientRect();
      const logicalWidth = Math.max(Math.round(imageRect.width / cellContainer.scaleX), documentObjectMinimumSize);
      const logicalHeight = Math.max(Math.round(imageRect.height / cellContainer.scaleY), documentObjectMinimumSize);
      const boundedLeft = getDocumentBoundedCoordinate(
        (imageRect.left - cellContainer.rect.left) / cellContainer.scaleX,
        cellContainer.width - logicalWidth,
      );
      const boundedTop = getDocumentBoundedCoordinate(
        (imageRect.top - cellContainer.rect.top) / cellContainer.scaleY,
        cellContainer.height - logicalHeight,
      );
      const previousParent = imageElement.parentElement;

      lockDocumentImageTableCellSize(cellContainer.element, cellContainer.scaleY);
      imageElement.style.width = `${logicalWidth}px`;
      imageElement.style.height = `${logicalHeight}px`;
      imageElement.style.position = "absolute";
      imageElement.style.left = `${boundedLeft}px`;
      imageElement.style.top = `${boundedTop}px`;
      imageElement.style.margin = "0";
      imageElement.style.zIndex = "2";
      imageElement.classList.add("is-floating-object");
      cellContainer.element.append(imageElement);
      removeEmptyDocumentImageHost(previousParent, cellContainer.element);

      return {
        boundsElement: cellContainer.element,
        boundsHeight: cellContainer.height,
        boundsWidth: cellContainer.width,
        left: boundedLeft,
        scaleX: cellContainer.scaleX,
        scaleY: cellContainer.scaleY,
        top: boundedTop,
      };
    }

    if (imageElement.parentElement === documentRoot && imageElement.style.position === "absolute") {
      const documentScale = getDocumentElementDisplayScale(documentRoot, editorCanvasDisplayScale);

      imageElement.classList.add("is-floating-object");
      return {
        boundsElement: documentRoot,
        boundsHeight: documentRoot.clientHeight,
        boundsWidth: documentRoot.clientWidth,
        left: parseDocumentPixelValue(imageElement.style.left, imageElement.offsetLeft),
        scaleX: documentScale.x,
        scaleY: documentScale.y,
        top: parseDocumentPixelValue(imageElement.style.top, imageElement.offsetTop),
      };
    }

    const imageRect = imageElement.getBoundingClientRect();
    const documentRect = documentRoot.getBoundingClientRect();
    const documentScale = getDocumentElementDisplayScale(documentRoot, editorCanvasDisplayScale);
    const scaleX = documentScale.x;
    const scaleY = documentScale.y;
    const logicalWidth = Math.max(Math.round(imageRect.width / scaleX), documentObjectMinimumSize);
    const logicalHeight = Math.max(Math.round(imageRect.height / scaleY), documentObjectMinimumSize);
    const boundedLeft = getDocumentBoundedCoordinate(
      (imageRect.left - documentRect.left) / scaleX,
      documentRoot.clientWidth - logicalWidth,
    );
    const boundedTop = getDocumentBoundedCoordinate(
      (imageRect.top - documentRect.top) / scaleY,
      documentRoot.clientHeight - logicalHeight,
    );

    imageElement.style.width = `${logicalWidth}px`;
    imageElement.style.height = `${logicalHeight}px`;
    imageElement.style.position = "absolute";
    imageElement.style.left = `${boundedLeft}px`;
    imageElement.style.top = `${boundedTop}px`;
    imageElement.style.margin = "0";
    imageElement.style.zIndex = "2";
    imageElement.classList.add("is-floating-object");
    documentRoot.append(imageElement);

    return {
      boundsElement: documentRoot,
      boundsHeight: documentRoot.clientHeight,
      boundsWidth: documentRoot.clientWidth,
      left: boundedLeft,
      scaleX,
      scaleY,
      top: boundedTop,
    };
  }

  return Object.freeze({
    prepareDocumentImageForFloatingPosition,
  });
}
