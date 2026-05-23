import { decorateDocumentGeneratedObjectImage } from "./document-generated-objects.js";
import { documentImageResizeClassNames, documentImageResizeCorners } from "./document-image-utils.js";

export function createDocumentImageSelectionRuntime({
  appState,
  clearDocumentActiveCell,
  getClosestDocumentSurface,
  getDocumentScaleBoxByPageId,
  getDocumentSurfaceByPageId,
}) {
  function decorateDocumentSurfaceImages(rootElement) {
    if (!rootElement?.querySelectorAll) {
      return;
    }

    rootElement.querySelectorAll("img").forEach((imageElement) => {
      decorateDocumentGeneratedObjectImage(imageElement);
      imageElement.classList.add("template-editor-image-object");
      imageElement.setAttribute("draggable", "false");
      imageElement.setAttribute("contenteditable", "false");

      if (!String(imageElement.style.height || "").trim() && !imageElement.getAttribute("height")) {
        imageElement.style.height = "auto";
      }
    });
  }

  function getDocumentImageTarget(target) {
    const surface = getClosestDocumentSurface(target);
    const baseElement =
      target instanceof Element ? target : target?.parentElement instanceof Element ? target.parentElement : null;
    const imageElement = baseElement?.closest("img") || null;

    if (!surface || !imageElement || !surface.contains(imageElement)) {
      return null;
    }

    return imageElement;
  }

  function ensureDocumentImageOverlay(pageId = appState.templateEditor.selectedPageId) {
    const scaleBox = getDocumentScaleBoxByPageId(pageId);

    if (!scaleBox) {
      return null;
    }

    let overlayElement = scaleBox.querySelector(".template-editor-image-selection");

    if (overlayElement) {
      return overlayElement;
    }

    overlayElement = document.createElement("div");
    overlayElement.className = "template-editor-image-selection hidden";
    overlayElement.setAttribute("aria-hidden", "true");
    overlayElement.innerHTML = documentImageResizeCorners
      .map((corner) => (
        `<button class="template-editor-image-resize-handle" data-template-resize-corner="${corner}" type="button" tabindex="-1" aria-label="이미지 크기 조절"></button>`
      ))
      .join("");
    scaleBox.append(overlayElement);
    return overlayElement;
  }

  function updateDocumentImageSelectionOverlay(pageId = appState.templateEditor.selectedPageId) {
    const overlayElement = ensureDocumentImageOverlay(pageId);
    const scaleBox = getDocumentScaleBoxByPageId(pageId);
    const selectedImage = appState.templateEditor.selectedImageElement;
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!overlayElement || !scaleBox || !selectedImage || !surface?.contains(selectedImage)) {
      overlayElement?.classList.add("hidden");
      overlayElement?.classList.remove("is-resizing");
      return;
    }

    const imageRect = selectedImage.getBoundingClientRect();
    const scaleBoxRect = scaleBox.getBoundingClientRect();

    if (imageRect.width < 1 || imageRect.height < 1) {
      overlayElement.classList.add("hidden");
      return;
    }

    overlayElement.style.left = `${Math.round(imageRect.left - scaleBoxRect.left)}px`;
    overlayElement.style.top = `${Math.round(imageRect.top - scaleBoxRect.top)}px`;
    overlayElement.style.width = `${Math.round(imageRect.width)}px`;
    overlayElement.style.height = `${Math.round(imageRect.height)}px`;
    overlayElement.classList.remove("hidden");
  }

  function clearDocumentImageSelection(options = {}) {
    const selectedImage = appState.templateEditor.selectedImageElement;
    const activePageId = options.pageId || appState.templateEditor.selectedPageId;

    if (selectedImage) {
      selectedImage.classList.remove("is-selected-object", "is-moving-object");
    }

    appState.templateEditor.imageMoveSession = null;
    appState.templateEditor.imageResizeSession = null;
    appState.templateEditor.selectedImageElement = null;
    getDocumentSurfaceByPageId(activePageId)?.classList.remove(...documentImageResizeClassNames);

    const overlayElement = ensureDocumentImageOverlay(activePageId);

    overlayElement?.classList.add("hidden");
    overlayElement?.classList.remove("is-resizing");
  }

  function selectDocumentImage(imageElement, pageId = appState.templateEditor.selectedPageId) {
    const surface = getDocumentSurfaceByPageId(pageId);

    if (!surface || !imageElement || !surface.contains(imageElement)) {
      clearDocumentImageSelection({ pageId });
      return;
    }

    if (appState.templateEditor.selectedImageElement === imageElement) {
      updateDocumentImageSelectionOverlay(pageId);
      return;
    }

    clearDocumentImageSelection({ pageId });
    appState.templateEditor.selectedImageElement = imageElement;
    imageElement.classList.add("is-selected-object");
    clearDocumentActiveCell(pageId);
    updateDocumentImageSelectionOverlay(pageId);
  }

  return Object.freeze({
    clearDocumentImageSelection,
    decorateDocumentSurfaceImages,
    ensureDocumentImageOverlay,
    getDocumentImageTarget,
    selectDocumentImage,
    updateDocumentImageSelectionOverlay,
  });
}
