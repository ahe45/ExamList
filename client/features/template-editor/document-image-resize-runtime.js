import {
  documentImageResizeClassNames,
  documentObjectMinimumSize,
  editorCanvasDisplayScale,
  getDocumentBoundedCoordinate,
  getDocumentElementDisplayScale,
  getObjectResizeDirections,
  normalizeObjectResizeCorner,
  parseDocumentPixelValue,
} from "./document-image-utils.js";

const documentImageResizingClassNames = Object.freeze(
  documentImageResizeClassNames.filter((className) => className !== "is-image-moving"),
);

export function createDocumentImageResizeRuntime({
  appState,
  clearDocumentImageSelection,
  ensureDocumentImageOverlay,
  getDocumentContentRoot,
  getDocumentSurfaceByPageId,
  prepareDocumentImageForFloatingPosition,
  selectDocumentImage,
  syncSelectedPageDocumentHtml,
  updateDocumentImageSelectionOverlay,
}) {
  function handleDocumentImageResize(event) {
    const resizeSession = appState.templateEditor.imageResizeSession;

    if (!resizeSession?.image || event.buttons === 0) {
      return;
    }

    const surface = getDocumentSurfaceByPageId(resizeSession.pageId);
    const documentRoot = getDocumentContentRoot(surface);

    if (!surface || !documentRoot || !surface.contains(resizeSession.image)) {
      clearDocumentImageSelection({ pageId: resizeSession.pageId });
      return;
    }

    const scaleX = Math.max(Number(resizeSession.scaleX || editorCanvasDisplayScale) || editorCanvasDisplayScale, 0.01);
    const scaleY = Math.max(Number(resizeSession.scaleY || editorCanvasDisplayScale) || editorCanvasDisplayScale, 0.01);
    const deltaX = (event.clientX - resizeSession.startX) / scaleX;
    const deltaY = (event.clientY - resizeSession.startY) / scaleY;
    const directionX = Number.isFinite(resizeSession.directionX) ? resizeSession.directionX : 1;
    const directionY = Number.isFinite(resizeSession.directionY) ? resizeSession.directionY : 1;
    const boundsWidth = resizeSession.maxDocumentWidth || documentRoot.clientWidth || 0;
    const boundsHeight = resizeSession.maxDocumentHeight || documentRoot.clientHeight || 0;
    const maxWidth = Math.max(
      documentObjectMinimumSize,
      directionX === 0
        ? resizeSession.startWidth
        : directionX < 0
          ? resizeSession.startRight
          : boundsWidth - resizeSession.startLeft,
    );
    const maxHeight = Math.max(
      documentObjectMinimumSize,
      directionY === 0
        ? resizeSession.startHeight
        : directionY < 0
          ? resizeSession.startBottom
          : boundsHeight - resizeSession.startTop,
    );
    let nextWidth = directionX === 0
      ? Math.max(documentObjectMinimumSize, Math.round(resizeSession.startWidth))
      : Math.min(maxWidth, Math.max(documentObjectMinimumSize, Math.round(resizeSession.startWidth + deltaX * directionX)));
    let nextHeight = directionY === 0
      ? Math.max(documentObjectMinimumSize, Math.round(resizeSession.startHeight))
      : Math.min(maxHeight, Math.max(documentObjectMinimumSize, Math.round(resizeSession.startHeight + deltaY * directionY)));
    let nextLeft = directionX < 0 ? resizeSession.startRight - nextWidth : resizeSession.startLeft;
    let nextTop = directionY < 0 ? resizeSession.startBottom - nextHeight : resizeSession.startTop;

    if (event.shiftKey && directionX !== 0 && directionY !== 0) {
      const widthScale = nextWidth / resizeSession.startWidth;
      const heightScale = nextHeight / resizeSession.startHeight;
      let scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;

      if (!Number.isFinite(scale) || scale <= 0) {
        scale = documentObjectMinimumSize / Math.max(resizeSession.startWidth, documentObjectMinimumSize);
      }

      const maxScale = Math.min(maxWidth / resizeSession.startWidth, maxHeight / resizeSession.startHeight);
      const minScale = Math.max(
        documentObjectMinimumSize / resizeSession.startWidth,
        documentObjectMinimumSize / resizeSession.startHeight,
      );
      const boundedScale = Number.isFinite(maxScale) && maxScale > 0
        ? Math.min(Math.max(scale, minScale), maxScale)
        : Math.max(scale, minScale);
      nextWidth = Math.max(documentObjectMinimumSize, Math.round(resizeSession.startWidth * boundedScale));
      nextHeight = Math.max(documentObjectMinimumSize, Math.round(resizeSession.startHeight * boundedScale));
      nextLeft = directionX < 0 ? resizeSession.startRight - nextWidth : resizeSession.startLeft;
      nextTop = directionY < 0 ? resizeSession.startBottom - nextHeight : resizeSession.startTop;
    }

    if (
      nextWidth === resizeSession.lastWidth &&
      nextHeight === resizeSession.lastHeight &&
      nextLeft === resizeSession.lastLeft &&
      nextTop === resizeSession.lastTop
    ) {
      return;
    }

    resizeSession.lastWidth = nextWidth;
    resizeSession.lastHeight = nextHeight;
    resizeSession.lastLeft = nextLeft;
    resizeSession.lastTop = nextTop;
    resizeSession.didChange = true;
    resizeSession.image.style.width = `${nextWidth}px`;
    resizeSession.image.style.height = `${nextHeight}px`;

    if (resizeSession.image.style.position === "absolute") {
      resizeSession.image.style.left = `${getDocumentBoundedCoordinate(nextLeft, boundsWidth - nextWidth)}px`;
      resizeSession.image.style.top = `${getDocumentBoundedCoordinate(nextTop, boundsHeight - nextHeight)}px`;
    }

    updateDocumentImageSelectionOverlay(resizeSession.pageId);
  }

  function releaseDocumentImageResizeSession({ sync = true } = {}) {
    const resizeSession = appState.templateEditor.imageResizeSession;

    if (!resizeSession) {
      return;
    }

    appState.templateEditor.imageResizeSession = null;
    getDocumentSurfaceByPageId(resizeSession.pageId)?.classList.remove(...documentImageResizingClassNames);
    ensureDocumentImageOverlay(resizeSession.pageId)?.classList.remove("is-resizing");

    if (sync && resizeSession.didChange && resizeSession.image?.isConnected) {
      syncSelectedPageDocumentHtml({
        pageId: resizeSession.pageId,
        preserveSelection: true,
        render: false,
      });
      selectDocumentImage(resizeSession.image, resizeSession.pageId);
      return;
    }

    updateDocumentImageSelectionOverlay(resizeSession.pageId);
  }

  function startDocumentImageResizeSession(event, pageId = appState.templateEditor.selectedPageId, corner = "bottom-right") {
    const selectedImage = appState.templateEditor.selectedImageElement;
    const surface = getDocumentSurfaceByPageId(pageId);
    const documentRoot = getDocumentContentRoot(surface);

    if (event.button !== 0 || !selectedImage || !surface?.contains(selectedImage) || !documentRoot) {
      return;
    }

    const normalizedCorner = normalizeObjectResizeCorner(corner);
    const directions = getObjectResizeDirections(normalizedCorner);
    const initialCellElement = selectedImage.closest("td, th");
    const isCellObject = initialCellElement instanceof HTMLElement && surface.contains(initialCellElement);
    const cellStartingPosition = isCellObject
      ? prepareDocumentImageForFloatingPosition(selectedImage, pageId)
      : null;

    if (!isCellObject && (directions.x < 0 || directions.y < 0)) {
      prepareDocumentImageForFloatingPosition(selectedImage, pageId);
    }

    const imageRect = selectedImage.getBoundingClientRect();
    const documentScale = getDocumentElementDisplayScale(documentRoot, editorCanvasDisplayScale);
    const scaleX = Math.max(Number(cellStartingPosition?.scaleX || documentScale.x) || documentScale.x, 0.01);
    const scaleY = Math.max(Number(cellStartingPosition?.scaleY || documentScale.y) || documentScale.y, 0.01);
    const boundsWidth = Number(cellStartingPosition?.boundsWidth) || documentRoot.clientWidth || 0;
    const boundsHeight = Number(cellStartingPosition?.boundsHeight) || documentRoot.clientHeight || 0;
    const startWidth = Math.min(boundsWidth, Math.max(imageRect.width / scaleX, documentObjectMinimumSize));
    const startHeight = Math.min(boundsHeight, Math.max(imageRect.height / scaleY, documentObjectMinimumSize));
    const imageLeft = cellStartingPosition
      ? cellStartingPosition.left
      : selectedImage.style.position === "absolute"
        ? parseDocumentPixelValue(selectedImage.style.left, selectedImage.offsetLeft)
        : Math.max(0, selectedImage.offsetLeft);
    const imageTop = cellStartingPosition
      ? cellStartingPosition.top
      : selectedImage.style.position === "absolute"
        ? parseDocumentPixelValue(selectedImage.style.top, selectedImage.offsetTop)
        : Math.max(0, selectedImage.offsetTop);

    appState.templateEditor.imageResizeSession = {
      corner: normalizedCorner,
      didChange: false,
      directionX: directions.x,
      directionY: directions.y,
      image: selectedImage,
      lastHeight: Math.max(Math.round(startHeight), documentObjectMinimumSize),
      lastLeft: imageLeft,
      lastTop: imageTop,
      lastWidth: Math.max(Math.round(startWidth), documentObjectMinimumSize),
      maxDocumentHeight: boundsHeight,
      maxDocumentWidth: boundsWidth,
      pageId,
      scaleX,
      scaleY,
      startBottom: imageTop + startHeight,
      startHeight,
      startLeft: imageLeft,
      startRight: imageLeft + startWidth,
      startTop: imageTop,
      startWidth,
      startX: event.clientX,
      startY: event.clientY,
    };

    surface.classList.add("is-image-resizing", `is-image-resizing-${normalizedCorner}`);
    ensureDocumentImageOverlay(pageId)?.classList.add("is-resizing");
  }

  return Object.freeze({
    handleDocumentImageResize,
    releaseDocumentImageResizeSession,
    startDocumentImageResizeSession,
  });
}
