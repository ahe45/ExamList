const { isCoverPage } = require("./element-helpers");
const { renderImageElement, renderPhotoCell } = require("./element-image-renderer");
const {
  renderCheckboxElement,
  renderLineElement,
  renderShapeElement,
  renderSignatureBoxElement,
} = require("./element-shape-renderer");
const { renderTableElement } = require("./element-table-renderer");
const { renderTextElement } = require("./element-text-renderer");

function renderPageElement(element, pageInstance, baseContext, page) {
  if (element.visible === false) {
    return "";
  }

  switch (element.type) {
    case "table":
      return renderTableElement(element, pageInstance, baseContext);
    case "image":
    case "candidatePhoto":
      return renderImageElement(element, baseContext);
    case "line":
      return renderLineElement(element);
    case "rect":
    case "ellipse":
      return renderShapeElement(element);
    case "checkbox":
      return renderCheckboxElement(element);
    case "signatureBox":
      return renderSignatureBoxElement(element);
    case "pageNumber":
      if (isCoverPage(page)) {
        return "";
      }
      return renderTextElement(element, baseContext);
    case "text":
    case "dataText":
    default:
      return renderTextElement(element, baseContext);
  }
}

module.exports = {
  renderPageElement,
  renderPhotoCell,
};
