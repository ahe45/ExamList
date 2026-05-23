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
    function prepareTemplateEditorImageForMove(imageElement) {
      const documentElement = getTemplateEditorDocumentElement();
      const templateEditorSurface = getTemplateEditorSurface();

      if (!documentElement || !templateEditorSurface?.contains(imageElement)) {
        return null;
      }

      if (imageElement.parentElement === documentElement && imageElement.style.position === "absolute") {
        imageElement.classList.add("is-floating-object");
        return {
          left: parseTemplateEditorPixelStyle(imageElement.style.left, imageElement.offsetLeft),
          top: parseTemplateEditorPixelStyle(imageElement.style.top, imageElement.offsetTop),
        };
      }

      const imageRect = imageElement.getBoundingClientRect();
      const documentRect = documentElement.getBoundingClientRect();
      const boundedLeft = geometry.getTemplateEditorBoundedCoordinate(
        imageRect.left - documentRect.left,
        documentElement.clientWidth - imageRect.width,
      );
      const boundedTop = geometry.getTemplateEditorBoundedCoordinate(
        imageRect.top - documentRect.top,
        Math.max(documentElement.scrollHeight, documentElement.clientHeight) - imageRect.height,
      );

      imageElement.style.width = `${Math.max(Math.round(imageRect.width), TEMPLATE_EDITOR_IMAGE_MIN_SIZE)}px`;
      imageElement.style.height = `${Math.max(Math.round(imageRect.height), TEMPLATE_EDITOR_IMAGE_MIN_SIZE)}px`;
      imageElement.style.position = "absolute";
      imageElement.style.left = `${boundedLeft}px`;
      imageElement.style.top = `${boundedTop}px`;
      imageElement.style.margin = "0";
      imageElement.style.zIndex = "2";
      imageElement.classList.add("is-floating-object");
      documentElement.append(imageElement);

      return {
        left: boundedLeft,
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
