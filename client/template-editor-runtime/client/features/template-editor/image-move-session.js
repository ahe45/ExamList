(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(globalScope);
    return;
  }

  globalScope.ExamListTemplateEditorImageMoveSession = factory(globalScope);
})(typeof globalThis !== "undefined" ? globalThis : this, (globalScope) => {
  const geometry = globalScope.ExamListTemplateEditorImageSessionGeometry;

  if (!geometry) {
    throw new Error("image-session-geometry.js must be loaded before image-move-session.js.");
  }

  function createTemplateEditorImageMoveSessionController({
    getTemplateEditorDocumentElement,
    getTemplateEditorSurface,
    prepareTemplateEditorImageForMove,
    selectTemplateEditorImage,
    state,
    syncTemplateEditorContent,
    updateTemplateEditorImageSelectionOverlay,
  }) {
    function handleTemplateEditorImageMove(event) {
      const moveSession = state.templateEditor.imageMoveSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (
        !moveSession ||
        moveSession.pointerId !== event.pointerId ||
        !moveSession.image ||
        !templateEditorSurface?.contains(moveSession.image)
      ) {
        return;
      }

      event.preventDefault();

      const visualDeltaX = event.clientX - moveSession.startX;
      const visualDeltaY = event.clientY - moveSession.startY;

      if (!moveSession.isActive && Math.hypot(visualDeltaX, visualDeltaY) < 4) {
        return;
      }

      if (!moveSession.isActive) {
        const startingPosition = prepareTemplateEditorImageForMove(moveSession.image);

        if (!startingPosition) {
          releaseTemplateEditorImageMoveSession({ sync: false });
          return;
        }

        moveSession.startLeft = startingPosition.left;
        moveSession.startTop = startingPosition.top;
        moveSession.lastLeft = startingPosition.left;
        moveSession.lastTop = startingPosition.top;
        moveSession.scaleX = Math.max(Number(startingPosition.scaleX || 1) || 1, 0.01);
        moveSession.scaleY = Math.max(Number(startingPosition.scaleY || 1) || 1, 0.01);
        moveSession.boundsWidth = Number(startingPosition.boundsWidth) || 0;
        moveSession.boundsHeight = Number(startingPosition.boundsHeight) || 0;
        moveSession.boundsElement = startingPosition.boundsElement || null;
        moveSession.isActive = true;
        templateEditorSurface?.classList.add("is-image-moving");
        moveSession.image.classList.add("is-moving-object");
      }

      const documentElement = getTemplateEditorDocumentElement();

      if (!documentElement && !moveSession.boundsElement) {
        return;
      }

      const imageRect = moveSession.image.getBoundingClientRect();
      const activeScaleX = Math.max(Number(moveSession.scaleX || 1) || 1, 0.01);
      const activeScaleY = Math.max(Number(moveSession.scaleY || 1) || 1, 0.01);
      const deltaX = visualDeltaX / activeScaleX;
      const deltaY = visualDeltaY / activeScaleY;
      const imageWidth = imageRect.width / activeScaleX;
      const imageHeight = imageRect.height / activeScaleY;
      const boundsWidth = moveSession.boundsWidth || documentElement?.clientWidth || 0;
      const boundsHeight =
        moveSession.boundsHeight ||
        Math.max(documentElement?.scrollHeight || 0, documentElement?.clientHeight || 0);
      const nextLeft = geometry.getTemplateEditorBoundedCoordinate(
        moveSession.startLeft + deltaX,
        boundsWidth - imageWidth,
      );
      const nextTop = geometry.getTemplateEditorBoundedCoordinate(
        moveSession.startTop + deltaY,
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
      updateTemplateEditorImageSelectionOverlay();
    }

    function handleTemplateEditorImageMoveEnd(event) {
      const moveSession = state.templateEditor.imageMoveSession;

      if (!moveSession || moveSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releaseTemplateEditorImageMoveSession({ sync: true });
    }

    function releaseTemplateEditorImageMoveSession({ sync = true } = {}) {
      const moveSession = state.templateEditor.imageMoveSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (!moveSession) {
        return;
      }

      window.removeEventListener("pointermove", handleTemplateEditorImageMove);
      window.removeEventListener("pointerup", handleTemplateEditorImageMoveEnd);
      window.removeEventListener("pointercancel", handleTemplateEditorImageMoveEnd);
      state.templateEditor.imageMoveSession = null;
      templateEditorSurface?.classList.remove("is-image-moving");
      moveSession.image?.classList.remove("is-moving-object");

      if (sync && moveSession.didChange && moveSession.image && templateEditorSurface?.contains(moveSession.image)) {
        syncTemplateEditorContent();
        selectTemplateEditorImage(moveSession.image);
        return;
      }

      updateTemplateEditorImageSelectionOverlay();
    }

    function startTemplateEditorImageMoveSession(imageElement, event) {
      const templateEditorSurface = getTemplateEditorSurface();

      if (!imageElement || !templateEditorSurface?.contains(imageElement)) {
        return;
      }

      state.templateEditor.imageMoveSession = {
        image: imageElement,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: null,
        startTop: null,
        lastLeft: null,
        lastTop: null,
        scaleX: 1,
        scaleY: 1,
        boundsElement: null,
        boundsWidth: 0,
        boundsHeight: 0,
        isActive: false,
        didChange: false,
      };

      window.addEventListener("pointermove", handleTemplateEditorImageMove);
      window.addEventListener("pointerup", handleTemplateEditorImageMoveEnd);
      window.addEventListener("pointercancel", handleTemplateEditorImageMoveEnd);
    }

    return Object.freeze({
      releaseTemplateEditorImageMoveSession,
      startTemplateEditorImageMoveSession,
    });
  }

  return Object.freeze({
    createTemplateEditorImageMoveSessionController,
  });
});
