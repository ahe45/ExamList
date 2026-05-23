import {
  documentObjectMinimumSize,
  editorCanvasDisplayScale,
  getDocumentBoundedCoordinate,
  parseDocumentPixelValue,
} from "./document-image-utils.js";

export function createDocumentImagePositioningRuntime({
  getDocumentContentRoot,
  getDocumentSurfaceByPageId,
}) {
  function prepareDocumentImageForFloatingPosition(imageElement, pageId) {
    const surface = getDocumentSurfaceByPageId(pageId);
    const documentRoot = getDocumentContentRoot(surface);

    if (!surface || !documentRoot || !surface.contains(imageElement)) {
      return null;
    }

    if (imageElement.parentElement === documentRoot && imageElement.style.position === "absolute") {
      imageElement.classList.add("is-floating-object");
      return {
        left: parseDocumentPixelValue(imageElement.style.left, imageElement.offsetLeft),
        top: parseDocumentPixelValue(imageElement.style.top, imageElement.offsetTop),
      };
    }

    const imageRect = imageElement.getBoundingClientRect();
    const documentRect = documentRoot.getBoundingClientRect();
    const logicalWidth = Math.max(Math.round(imageRect.width / editorCanvasDisplayScale), documentObjectMinimumSize);
    const logicalHeight = Math.max(Math.round(imageRect.height / editorCanvasDisplayScale), documentObjectMinimumSize);
    const boundedLeft = getDocumentBoundedCoordinate(
      (imageRect.left - documentRect.left) / editorCanvasDisplayScale,
      documentRoot.clientWidth - logicalWidth,
    );
    const boundedTop = getDocumentBoundedCoordinate(
      (imageRect.top - documentRect.top) / editorCanvasDisplayScale,
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
      left: boundedLeft,
      top: boundedTop,
    };
  }

  return Object.freeze({
    prepareDocumentImageForFloatingPosition,
  });
}
