(function (globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(globalScope);
    return;
  }

  globalScope.ExamListTemplateEditorImagePositioning = factory(globalScope);
})(typeof globalThis !== "undefined" ? globalThis : this, (globalScope) => {
  const geometry = globalScope.ExamListTemplateEditorImageSessionGeometry;

  if (!geometry) {
    throw new Error("image-session-geometry.js must be loaded before image-positioning.js.");
  }

  function createTemplateEditorImagePositioningController({
    TEMPLATE_EDITOR_IMAGE_MIN_SIZE,
    getTemplateEditorDocumentElement,
    getTemplateEditorSurface,
    parseTemplateEditorPixelStyle,
  }) {
    function getTemplateEditorFinitePixelValue(value) {
      const parsedValue = Number.parseFloat(String(value || "").trim());

      return Number.isFinite(parsedValue) ? parsedValue : 0;
    }

    function getTemplateEditorCandidateBlockImageContainer(imageElement) {
      const blockElement = imageElement?.closest?.("[data-candidate-block-instance].is-candidate-block-focus-editor") || null;

      if (!(blockElement instanceof HTMLElement)) {
        return null;
      }

      const blockRect = blockElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(blockElement);
      const cssScale = getTemplateEditorFinitePixelValue(
        computedStyle.getPropertyValue("--examlist-candidate-block-focus-editor-scale") ||
          computedStyle.getPropertyValue("--examlist-candidate-block-focus-scale"),
      );
      const logicalWidth =
        getTemplateEditorFinitePixelValue(blockElement.dataset?.candidateBlockLogicalContentWidth) ||
        getTemplateEditorFinitePixelValue(blockElement.dataset?.candidateBlockLogicalWidth) ||
        blockElement.clientWidth ||
        blockElement.offsetWidth ||
        (cssScale > 0 ? blockRect.width / cssScale : 0) ||
        blockRect.width ||
        0;
      const logicalHeight =
        getTemplateEditorFinitePixelValue(blockElement.dataset?.candidateBlockLogicalContentHeight) ||
        getTemplateEditorFinitePixelValue(blockElement.dataset?.candidateBlockLogicalHeight) ||
        blockElement.clientHeight ||
        blockElement.offsetHeight ||
        (cssScale > 0 ? blockRect.height / cssScale : 0) ||
        blockRect.height ||
        0;
      const scaleX = logicalWidth > 0 && blockRect.width > 0 ? blockRect.width / logicalWidth : cssScale || 1;
      const scaleY = logicalHeight > 0 && blockRect.height > 0 ? blockRect.height / logicalHeight : cssScale || 1;

      return {
        element: blockElement,
        height: Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.floor(logicalHeight || TEMPLATE_EDITOR_IMAGE_MIN_SIZE)),
        rect: blockRect,
        scaleX: Math.max(scaleX || 1, 0.01),
        scaleY: Math.max(scaleY || 1, 0.01),
        width: Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.floor(logicalWidth || TEMPLATE_EDITOR_IMAGE_MIN_SIZE)),
      };
    }

    function removeEmptyTemplateEditorImageHost(hostElement, containerElement) {
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

    function getTemplateEditorTableCellImageContainer(imageElement) {
      const templateEditorSurface = getTemplateEditorSurface();
      const cellElement = imageElement?.closest?.("td, th") || null;

      if (!(cellElement instanceof HTMLElement) || !templateEditorSurface?.contains(cellElement)) {
        return null;
      }

      const cellRect = cellElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(cellElement);
      const candidateBlockContainer = getTemplateEditorCandidateBlockImageContainer(imageElement);
      const scaleX = Math.max(candidateBlockContainer?.scaleX || 1, 0.01);
      const scaleY = Math.max(candidateBlockContainer?.scaleY || 1, 0.01);
      const borderLeft = getTemplateEditorFinitePixelValue(computedStyle.borderLeftWidth);
      const borderRight = getTemplateEditorFinitePixelValue(computedStyle.borderRightWidth);
      const borderTop = getTemplateEditorFinitePixelValue(computedStyle.borderTopWidth);
      const borderBottom = getTemplateEditorFinitePixelValue(computedStyle.borderBottomWidth);
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
        height: Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.floor(paddingBoxHeight || TEMPLATE_EDITOR_IMAGE_MIN_SIZE)),
        rect: {
          left: cellRect.left + borderLeft * scaleX,
          top: cellRect.top + borderTop * scaleY,
        },
        scaleX,
        scaleY,
        width: Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.floor(paddingBoxWidth || TEMPLATE_EDITOR_IMAGE_MIN_SIZE)),
      };
    }

    function lockTemplateEditorImageTableCellSize(cellElement, scaleY = 1) {
      if (!(cellElement instanceof HTMLElement)) {
        return;
      }

      const safeScaleY = Math.max(Number(scaleY) || 1, 0.01);
      const cellRect = cellElement.getBoundingClientRect();
      const rowElement = cellElement.parentElement;
      const measuredCellHeight = cellRect.height > 0 ? cellRect.height / safeScaleY : cellElement.offsetHeight || 0;
      const cellHeight = Math.max(TEMPLATE_EDITOR_IMAGE_MIN_SIZE, Math.round(measuredCellHeight));

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

    function prepareTemplateEditorImageForMove(imageElement) {
      const documentElement = getTemplateEditorDocumentElement();
      const templateEditorSurface = getTemplateEditorSurface();
      const cellContainer = getTemplateEditorTableCellImageContainer(imageElement);
      const candidateBlockContainer = getTemplateEditorCandidateBlockImageContainer(imageElement);
      const containerElement = cellContainer?.element || candidateBlockContainer?.element || documentElement;

      if (!containerElement || !templateEditorSurface?.contains(imageElement)) {
        return null;
      }

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
            left: parseTemplateEditorPixelStyle(imageElement.style.left, imageElement.offsetLeft),
            scaleX: cellContainer.scaleX,
            scaleY: cellContainer.scaleY,
            top: parseTemplateEditorPixelStyle(imageElement.style.top, imageElement.offsetTop),
          };
        }

        const imageRect = imageElement.getBoundingClientRect();
        const imageWidth = Math.max(
          Math.round(imageRect.width / Math.max(cellContainer.scaleX, 0.01)),
          TEMPLATE_EDITOR_IMAGE_MIN_SIZE,
        );
        const imageHeight = Math.max(
          Math.round(imageRect.height / Math.max(cellContainer.scaleY, 0.01)),
          TEMPLATE_EDITOR_IMAGE_MIN_SIZE,
        );
        const boundedLeft = geometry.getTemplateEditorBoundedCoordinate(
          (imageRect.left - cellContainer.rect.left) / Math.max(cellContainer.scaleX, 0.01),
          cellContainer.width - imageWidth,
        );
        const boundedTop = geometry.getTemplateEditorBoundedCoordinate(
          (imageRect.top - cellContainer.rect.top) / Math.max(cellContainer.scaleY, 0.01),
          cellContainer.height - imageHeight,
        );
        const previousParent = imageElement.parentElement;

        lockTemplateEditorImageTableCellSize(cellContainer.element, cellContainer.scaleY);
        imageElement.style.width = `${imageWidth}px`;
        imageElement.style.height = `${imageHeight}px`;
        imageElement.style.position = "absolute";
        imageElement.style.left = `${boundedLeft}px`;
        imageElement.style.top = `${boundedTop}px`;
        imageElement.style.margin = "0";
        imageElement.style.zIndex = "2";
        imageElement.classList.add("is-floating-object");
        cellContainer.element.append(imageElement);
        removeEmptyTemplateEditorImageHost(previousParent, cellContainer.element);

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

      if (imageElement.parentElement === containerElement && imageElement.style.position === "absolute") {
        imageElement.classList.add("is-floating-object");
        return {
          boundsElement: containerElement,
          boundsHeight:
            candidateBlockContainer?.height ||
            Math.max(documentElement?.scrollHeight || 0, documentElement?.clientHeight || 0),
          boundsWidth: candidateBlockContainer?.width || documentElement?.clientWidth || 0,
          left: parseTemplateEditorPixelStyle(imageElement.style.left, imageElement.offsetLeft),
          scaleX: candidateBlockContainer?.scaleX || 1,
          scaleY: candidateBlockContainer?.scaleY || 1,
          top: parseTemplateEditorPixelStyle(imageElement.style.top, imageElement.offsetTop),
        };
      }

      const imageRect = imageElement.getBoundingClientRect();
      const containerRect = candidateBlockContainer?.rect || containerElement.getBoundingClientRect();
      const scaleX = candidateBlockContainer?.scaleX || 1;
      const scaleY = candidateBlockContainer?.scaleY || 1;
      const boundsWidth = candidateBlockContainer?.width || documentElement?.clientWidth || containerElement.clientWidth || 0;
      const boundsHeight =
        candidateBlockContainer?.height ||
        Math.max(documentElement?.scrollHeight || 0, documentElement?.clientHeight || 0, containerElement.clientHeight || 0);
      const imageWidth = Math.max(Math.round(imageRect.width / Math.max(scaleX, 0.01)), TEMPLATE_EDITOR_IMAGE_MIN_SIZE);
      const imageHeight = Math.max(Math.round(imageRect.height / Math.max(scaleY, 0.01)), TEMPLATE_EDITOR_IMAGE_MIN_SIZE);
      const boundedLeft = geometry.getTemplateEditorBoundedCoordinate(
        (imageRect.left - containerRect.left) / Math.max(scaleX, 0.01),
        boundsWidth - imageWidth,
      );
      const boundedTop = geometry.getTemplateEditorBoundedCoordinate(
        (imageRect.top - containerRect.top) / Math.max(scaleY, 0.01),
        boundsHeight - imageHeight,
      );
      const previousParent = imageElement.parentElement;

      imageElement.style.width = `${imageWidth}px`;
      imageElement.style.height = `${imageHeight}px`;
      imageElement.style.position = "absolute";
      imageElement.style.left = `${boundedLeft}px`;
      imageElement.style.top = `${boundedTop}px`;
      imageElement.style.margin = "0";
      imageElement.style.zIndex = "2";
      imageElement.classList.add("is-floating-object");
      containerElement.append(imageElement);

      if (candidateBlockContainer) {
        removeEmptyTemplateEditorImageHost(previousParent, containerElement);
      }

      return {
        boundsElement: containerElement,
        boundsHeight,
        boundsWidth,
        left: boundedLeft,
        scaleX,
        scaleY,
        top: boundedTop,
      };
    }

    return Object.freeze({
      prepareTemplateEditorImageForMove,
    });
  }

  return Object.freeze({
    createTemplateEditorImagePositioningController,
  });
});
