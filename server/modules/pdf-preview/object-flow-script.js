// Runs in the PDF browser after data fitting. Editor flow spacers are transient
// and are stripped when saving, so rebuild their occupied space from geometry.
function syncPreviewObjectFlow(root) {
  root.querySelectorAll(".preview-document-body .template-doc").forEach((documentElement) => {
    const objects = Array.from(documentElement.children).filter((element) =>
      element.matches("table, img, .preview-candidate-block-grid") &&
      getComputedStyle(element).position === "absolute",
    );

    objects.forEach((element) => {
      let spacer = element.previousElementSibling;
      if (!spacer?.hasAttribute("data-preview-object-flow-spacer")) {
        spacer = documentElement.ownerDocument.createElement("div");
        spacer.setAttribute("data-preview-object-flow-spacer", "true");
        spacer.setAttribute("aria-hidden", "true");
        spacer.style.cssText = "display:block;clear:both;border:0;margin:0;padding:0;min-height:0;font-size:0;line-height:0;overflow:hidden;pointer-events:none";
        documentElement.insertBefore(spacer, element);
      }

      const objectRect = element.getBoundingClientRect();
      const spacerRect = spacer.getBoundingClientRect();
      const documentRect = documentElement.getBoundingClientRect();
      const spacerTop = Math.max(0, spacerRect.top - documentRect.top - documentElement.clientTop);
      const objectBottom = objectRect.bottom - documentRect.top - documentElement.clientTop;
      // Match the editor: reserve at least the object's height, and include
      // any gap between its saved position and the preceding document content.
      spacer.style.height = `${Math.max(0, Math.ceil(Math.max(objectRect.height, objectBottom - spacerTop)))}px`;
    });
  });
}

module.exports = { syncPreviewObjectFlow };
