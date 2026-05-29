import {
  editorCanvasDisplayScale,
  getDocumentBoundedCoordinate,
  parseDocumentPixelValue,
} from "./document-image-utils.js";

export function createDocumentImageMoveRuntime({
  appState,
  clearDocumentImageSelection,
  getDocumentContentRoot,
  getDocumentSurfaceByPageId,
  prepareDocumentImageForFloatingPosition,
  selectDocumentImage,
  syncSelectedPageDocumentHtml,
  updateDocumentImageSelectionOverlay,
}) {
  function handleDocumentImageMove(event) {
    const moveSession = appState.templateEditor.imageMoveSession;

    if (!moveSession?.image || event.buttons === 0) {
      return;
    }

    const surface = getDocumentSurfaceByPageId(moveSession.pageId);
    const documentRoot = getDocumentContentRoot(surface);

    if (!surface || !documentRoot || !surface.contains(moveSession.image)) {
      clearDocumentImageSelection({ pageId: moveSession.pageId });
      return;
    }

    const visualDeltaX = event.clientX - moveSession.startX;
    const visualDeltaY = event.clientY - moveSession.startY;

    if (!moveSession.isActive && Math.hypot(visualDeltaX, visualDeltaY) < 4) {
      return;
    }

    if (!moveSession.isActive) {
      const startingPosition = prepareDocumentImageForFloatingPosition(moveSession.image, moveSession.pageId);

      if (!startingPosition) {
        clearDocumentImageSelection({ pageId: moveSession.pageId });
        return;
      }

      moveSession.startLeft = startingPosition.left;
      moveSession.startTop = startingPosition.top;
      moveSession.lastLeft = startingPosition.left;
      moveSession.lastTop = startingPosition.top;
      moveSession.scaleX = Math.max(Number(startingPosition.scaleX || editorCanvasDisplayScale) || editorCanvasDisplayScale, 0.01);
      moveSession.scaleY = Math.max(Number(startingPosition.scaleY || editorCanvasDisplayScale) || editorCanvasDisplayScale, 0.01);
      moveSession.boundsElement = startingPosition.boundsElement || documentRoot;
      moveSession.boundsWidth = Number(startingPosition.boundsWidth) || documentRoot.clientWidth || 0;
      moveSession.boundsHeight = Number(startingPosition.boundsHeight) || documentRoot.clientHeight || 0;
      moveSession.isActive = true;
      surface.classList.add("is-image-moving");
      moveSession.image.classList.add("is-moving-object");
    }

    const activeScaleX = Math.max(Number(moveSession.scaleX || editorCanvasDisplayScale) || editorCanvasDisplayScale, 0.01);
    const activeScaleY = Math.max(Number(moveSession.scaleY || editorCanvasDisplayScale) || editorCanvasDisplayScale, 0.01);
    const activeDeltaX = visualDeltaX / activeScaleX;
    const activeDeltaY = visualDeltaY / activeScaleY;
    const imageWidth = parseDocumentPixelValue(moveSession.image.style.width, moveSession.image.offsetWidth);
    const imageHeight = parseDocumentPixelValue(moveSession.image.style.height, moveSession.image.offsetHeight);
    const boundsWidth = moveSession.boundsWidth || documentRoot.clientWidth || 0;
    const boundsHeight = moveSession.boundsHeight || documentRoot.clientHeight || 0;
    const nextLeft = getDocumentBoundedCoordinate(
      moveSession.startLeft + activeDeltaX,
      boundsWidth - imageWidth,
    );
    const nextTop = getDocumentBoundedCoordinate(
      moveSession.startTop + activeDeltaY,
      boundsHeight - imageHeight,
    );

    if (nextLeft === moveSession.lastLeft && nextTop === moveSession.lastTop) {
      return;
    }

    moveSession.lastLeft = nextLeft;
    moveSession.lastTop = nextTop;
    moveSession.didChange = true;
    moveSession.image.style.left = `${nextLeft}px`;
    moveSession.image.style.top = `${nextTop}px`;
    updateDocumentImageSelectionOverlay(moveSession.pageId);
  }

  function releaseDocumentImageMoveSession({ sync = true } = {}) {
    const moveSession = appState.templateEditor.imageMoveSession;

    if (!moveSession) {
      return;
    }

    appState.templateEditor.imageMoveSession = null;
    getDocumentSurfaceByPageId(moveSession.pageId)?.classList.remove("is-image-moving");
    moveSession.image?.classList.remove("is-moving-object");

    if (sync && moveSession.didChange && moveSession.image?.isConnected) {
      syncSelectedPageDocumentHtml({
        pageId: moveSession.pageId,
        preserveSelection: true,
        render: false,
      });
      selectDocumentImage(moveSession.image, moveSession.pageId);
      return;
    }

    updateDocumentImageSelectionOverlay(moveSession.pageId);
  }

  function startDocumentImageMoveSession(imageElement, event, pageId = appState.templateEditor.selectedPageId) {
    appState.templateEditor.imageMoveSession = {
      didChange: false,
      image: imageElement,
      isActive: false,
      lastLeft: null,
      lastTop: null,
      pageId,
      boundsElement: null,
      boundsHeight: 0,
      boundsWidth: 0,
      scaleX: editorCanvasDisplayScale,
      scaleY: editorCanvasDisplayScale,
      startLeft: null,
      startTop: null,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  return Object.freeze({
    handleDocumentImageMove,
    releaseDocumentImageMoveSession,
    startDocumentImageMoveSession,
  });
}
