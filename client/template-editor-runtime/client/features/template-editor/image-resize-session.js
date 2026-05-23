(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(globalScope);
    return;
  }

  globalScope.ExamListTemplateEditorImageResizeSession = factory(globalScope);
})(typeof globalThis !== "undefined" ? globalThis : this, (globalScope) => {
  const geometry = globalScope.ExamListTemplateEditorImageSessionGeometry;

  if (!geometry) {
    throw new Error("image-session-geometry.js must be loaded before image-resize-session.js.");
  }

  function createTemplateEditorImageResizeSessionController({
    TEMPLATE_EDITOR_IMAGE_MIN_SIZE,
    getSelectedTemplateEditorImage,
    getTemplateEditorDocumentElement,
    getTemplateEditorImageOverlay,
    getTemplateEditorSurface,
    parseTemplateEditorPixelStyle,
    prepareTemplateEditorImageForMove,
    selectTemplateEditorImage,
    state,
    syncTemplateEditorContent,
    updateTemplateEditorImageSelectionOverlay,
  }) {
    function getTemplateEditorImageTableCell(imageElement, templateEditorSurface) {
      const cellElement = imageElement?.closest?.("td, th") || null;

      return cellElement instanceof HTMLElement && templateEditorSurface?.contains(cellElement)
        ? cellElement
        : null;
    }

    function getTemplateEditorFinitePixelValue(value) {
      const parsedValue = Number.parseFloat(String(value || "").trim());

      return Number.isFinite(parsedValue) ? parsedValue : 0;
    }

    function getTemplateEditorCandidateBlockVisualScale(element) {
      const blockElement = element?.closest?.("[data-candidate-block-instance]") || null;

      if (!(blockElement instanceof HTMLElement)) {
        return { x: 1, y: 1 };
      }

      const blockRect = blockElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(blockElement);
      const cssScale = getTemplateEditorFinitePixelValue(
        computedStyle.getPropertyValue("--examlist-candidate-block-focus-editor-scale") ||
          computedStyle.getPropertyValue("--examlist-candidate-block-focus-scale"),
      );
      const logicalWidth =
        getTemplateEditorFinitePixelValue(blockElement.dataset?.candidateBlockLogicalWidth) ||
        blockElement.offsetWidth ||
        blockElement.clientWidth ||
        (cssScale > 0 ? blockRect.width / cssScale : 0) ||
        blockRect.width ||
        0;
      const logicalHeight =
        getTemplateEditorFinitePixelValue(blockElement.dataset?.candidateBlockLogicalHeight) ||
        blockElement.offsetHeight ||
        blockElement.clientHeight ||
        (cssScale > 0 ? blockRect.height / cssScale : 0) ||
        blockRect.height ||
        0;

      return {
        x: logicalWidth > 0 && blockRect.width > 0 ? blockRect.width / logicalWidth : cssScale || 1,
        y: logicalHeight > 0 && blockRect.height > 0 ? blockRect.height / logicalHeight : cssScale || 1,
      };
    }

    function getTemplateEditorCellContentSize(cellElement, minimumSize) {
      const computedStyle = window.getComputedStyle(cellElement);
      const cellRect = cellElement.getBoundingClientRect();
      const visualScale = getTemplateEditorCandidateBlockVisualScale(cellElement);
      const scaleX = Math.max(visualScale.x || 1, 0.01);
      const scaleY = Math.max(visualScale.y || 1, 0.01);
      const paddingLeft = getTemplateEditorFinitePixelValue(computedStyle.paddingLeft);
      const paddingRight = getTemplateEditorFinitePixelValue(computedStyle.paddingRight);
      const paddingTop = getTemplateEditorFinitePixelValue(computedStyle.paddingTop);
      const paddingBottom = getTemplateEditorFinitePixelValue(computedStyle.paddingBottom);
      const borderLeft = getTemplateEditorFinitePixelValue(computedStyle.borderLeftWidth);
      const borderRight = getTemplateEditorFinitePixelValue(computedStyle.borderRightWidth);
      const borderTop = getTemplateEditorFinitePixelValue(computedStyle.borderTopWidth);
      const borderBottom = getTemplateEditorFinitePixelValue(computedStyle.borderBottomWidth);
      const contentWidth = Math.max(
        minimumSize,
        Math.floor(
          Math.max(
            cellElement.clientWidth - paddingLeft - paddingRight,
            cellRect.width / scaleX - paddingLeft - paddingRight - borderLeft - borderRight,
            0,
          ),
        ),
      );
      const contentHeight = Math.max(
        minimumSize,
        Math.floor(
          Math.max(
            cellElement.clientHeight - paddingTop - paddingBottom,
            cellRect.height / scaleY - paddingTop - paddingBottom - borderTop - borderBottom,
            0,
          ),
        ),
      );

      return {
        height: contentHeight,
        scaleX,
        scaleY,
        width: contentWidth,
      };
    }

    function lockTemplateEditorImageCellHeight(cellElement) {
      const cellRect = cellElement.getBoundingClientRect();
      const visualScale = getTemplateEditorCandidateBlockVisualScale(cellElement);
      const scaleY = Math.max(visualScale.y || 1, 0.01);
      const rowElement = cellElement.parentElement;
      const measuredCellHeight = cellRect.height > 0 ? cellRect.height / scaleY : cellElement.offsetHeight || 0;
      const cellHeight = Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.round(measuredCellHeight));

      if (cellHeight > 0) {
        cellElement.style.height = `${cellHeight}px`;
      }

      if (rowElement instanceof HTMLTableRowElement && Number(cellElement.rowSpan || 1) <= 1) {
        const rowRect = rowElement.getBoundingClientRect();
        const measuredRowHeight = rowRect.height > 0 ? rowRect.height / scaleY : rowElement.offsetHeight || 0;
        const rowHeight = Math.max(cellHeight, Math.round(measuredRowHeight));

        if (rowHeight > 0) {
          rowElement.style.height = `${rowHeight}px`;
          Array.from(rowElement.cells || []).forEach((rowCellElement) => {
            rowCellElement.style.height = `${rowHeight}px`;
          });
        }
      }
    }

    function getTemplateEditorCellImageResizeBounds(imageElement, templateEditorSurface) {
      const cellElement = getTemplateEditorImageTableCell(imageElement, templateEditorSurface);

      if (!cellElement) {
        return null;
      }

      return {
        cellElement,
        ...getTemplateEditorCellContentSize(cellElement, TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
      };
    }

    function applyTemplateEditorCellImageResizeStyle(imageElement) {
      imageElement.style.display = "inline-block";
      imageElement.style.margin = "0";
      imageElement.style.maxWidth = "100%";
      imageElement.style.maxHeight = "100%";

      if (!String(imageElement.style.verticalAlign || "").trim()) {
        imageElement.style.verticalAlign = "top";
      }
    }

    function handleTemplateEditorImageResizeStart(event) {
      const selectedImage = getSelectedTemplateEditorImage();
      const templateEditorSurface = getTemplateEditorSurface();

      if (event.button !== 0 || !selectedImage || !templateEditorSurface?.contains(selectedImage)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const normalizedCorner = geometry.normalizeTemplateEditorImageResizeCorner(event.currentTarget?.dataset?.templateResizeCorner);
      const directions = geometry.getTemplateEditorImageResizeDirections(normalizedCorner);
      const cellResizeBounds = getTemplateEditorCellImageResizeBounds(selectedImage, templateEditorSurface);

      if (!cellResizeBounds && (directions.x < 0 || directions.y < 0)) {
        prepareTemplateEditorImageForMove(selectedImage);
      }

      const imageRect = selectedImage.getBoundingClientRect();
      const documentElement = getTemplateEditorDocumentElement();
      const maxResizeWidth = cellResizeBounds?.width || documentElement?.clientWidth || Number.POSITIVE_INFINITY;
      const maxResizeHeight =
        cellResizeBounds?.height ||
        Math.max(documentElement?.scrollHeight || 0, documentElement?.clientHeight || 0) ||
        Number.POSITIVE_INFINITY;
      const imageWidth = cellResizeBounds ? imageRect.width / Math.max(cellResizeBounds.scaleX || 1, 0.01) : imageRect.width;
      const imageHeight = cellResizeBounds ? imageRect.height / Math.max(cellResizeBounds.scaleY || 1, 0.01) : imageRect.height;
      const startWidth = Math.min(maxResizeWidth, Math.max(imageWidth, TEMPLATE_EDITOR_IMAGE_MIN_SIZE));
      const startHeight = Math.min(maxResizeHeight, Math.max(imageHeight, TEMPLATE_EDITOR_IMAGE_MIN_SIZE));
      const startLeft = cellResizeBounds
        ? 0
        : selectedImage.style.position === "absolute"
          ? parseTemplateEditorPixelStyle(selectedImage.style.left, selectedImage.offsetLeft)
          : Math.max(0, selectedImage.offsetLeft);
      const startTop = cellResizeBounds
        ? 0
        : selectedImage.style.position === "absolute"
          ? parseTemplateEditorPixelStyle(selectedImage.style.top, selectedImage.offsetTop)
          : Math.max(0, selectedImage.offsetTop);

      if (cellResizeBounds) {
        const didClampCellImage =
          Math.round(imageWidth) !== Math.round(startWidth) ||
          Math.round(imageHeight) !== Math.round(startHeight);

        if (didClampCellImage) {
          lockTemplateEditorImageCellHeight(cellResizeBounds.cellElement);
        }

        applyTemplateEditorCellImageResizeStyle(selectedImage);
        selectedImage.style.width = `${Math.round(startWidth)}px`;
        selectedImage.style.height = `${Math.round(startHeight)}px`;
      }

      state.templateEditor.imageResizeSession = {
        corner: normalizedCorner,
        directionX: directions.x,
        directionY: directions.y,
        image: selectedImage,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft,
        startTop,
        startRight: cellResizeBounds ? maxResizeWidth : startLeft + startWidth,
        startBottom: cellResizeBounds ? maxResizeHeight : startTop + startHeight,
        startWidth,
        startHeight,
        lastLeft: startLeft,
        lastTop: startTop,
        lastWidth: Math.max(Math.round(startWidth), TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
        lastHeight: Math.max(Math.round(startHeight), TEMPLATE_EDITOR_IMAGE_MIN_SIZE),
        maxDocumentWidth: maxResizeWidth,
        maxDocumentHeight: maxResizeHeight,
        scaleX: cellResizeBounds?.scaleX || 1,
        scaleY: cellResizeBounds?.scaleY || 1,
        isCellObject: Boolean(cellResizeBounds),
        cellElement: cellResizeBounds?.cellElement || null,
        cellHeightLocked: false,
        didChange: Boolean(
          cellResizeBounds &&
            (Math.round(imageWidth) !== Math.round(startWidth) ||
              Math.round(imageHeight) !== Math.round(startHeight)),
        ),
      };

      templateEditorSurface?.classList.add("is-image-resizing", `is-image-resizing-${normalizedCorner}`);
      getTemplateEditorImageOverlay()?.classList.add("is-resizing");
      window.addEventListener("pointermove", handleTemplateEditorImageResizeMove);
      window.addEventListener("pointerup", handleTemplateEditorImageResizeEnd);
      window.addEventListener("pointercancel", handleTemplateEditorImageResizeEnd);
    }

    function handleTemplateEditorImageResizeMove(event) {
      const resizeSession = state.templateEditor.imageResizeSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (
        !resizeSession ||
        resizeSession.pointerId !== event.pointerId ||
        !resizeSession.image ||
        !templateEditorSurface?.contains(resizeSession.image)
      ) {
        return;
      }

      event.preventDefault();

      const nextRect = geometry.getTemplateEditorImageResizeRect(resizeSession, event, TEMPLATE_EDITOR_IMAGE_MIN_SIZE);

      if (
        nextRect.width === resizeSession.lastWidth &&
        nextRect.height === resizeSession.lastHeight &&
        nextRect.left === resizeSession.lastLeft &&
        nextRect.top === resizeSession.lastTop
      ) {
        return;
      }

      resizeSession.lastWidth = nextRect.width;
      resizeSession.lastHeight = nextRect.height;
      resizeSession.lastLeft = nextRect.left;
      resizeSession.lastTop = nextRect.top;
      resizeSession.didChange = true;

      if (resizeSession.isCellObject) {
        if (!resizeSession.cellHeightLocked && resizeSession.cellElement) {
          lockTemplateEditorImageCellHeight(resizeSession.cellElement);
          resizeSession.cellHeightLocked = true;
        }

        applyTemplateEditorCellImageResizeStyle(resizeSession.image);
      }

      resizeSession.image.style.width = `${nextRect.width}px`;
      resizeSession.image.style.height = `${nextRect.height}px`;

      if (!resizeSession.isCellObject && resizeSession.image.style.position === "absolute") {
        resizeSession.image.style.left = `${geometry.getTemplateEditorBoundedCoordinate(nextRect.left, resizeSession.maxDocumentWidth - nextRect.width)}px`;
        resizeSession.image.style.top = `${geometry.getTemplateEditorBoundedCoordinate(nextRect.top, resizeSession.maxDocumentHeight - nextRect.height)}px`;
      }

      updateTemplateEditorImageSelectionOverlay();
    }

    function handleTemplateEditorImageResizeEnd(event) {
      const resizeSession = state.templateEditor.imageResizeSession;

      if (!resizeSession || resizeSession.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      releaseTemplateEditorImageResizeSession({ sync: true });
    }

    function releaseTemplateEditorImageResizeSession({ sync = true } = {}) {
      const resizeSession = state.templateEditor.imageResizeSession;
      const templateEditorSurface = getTemplateEditorSurface();

      if (!resizeSession) {
        return;
      }

      window.removeEventListener("pointermove", handleTemplateEditorImageResizeMove);
      window.removeEventListener("pointerup", handleTemplateEditorImageResizeEnd);
      window.removeEventListener("pointercancel", handleTemplateEditorImageResizeEnd);
      state.templateEditor.imageResizeSession = null;
      templateEditorSurface?.classList.remove(...geometry.imageResizeClassNames);
      getTemplateEditorImageOverlay()?.classList.remove("is-resizing");

      if (sync && resizeSession.didChange && resizeSession.image && templateEditorSurface?.contains(resizeSession.image)) {
        syncTemplateEditorContent();
        selectTemplateEditorImage(resizeSession.image);
        return;
      }

      updateTemplateEditorImageSelectionOverlay();
    }

    return Object.freeze({
      handleTemplateEditorImageResizeStart,
      releaseTemplateEditorImageResizeSession,
    });
  }

  return Object.freeze({
    createTemplateEditorImageResizeSessionController,
  });
});
