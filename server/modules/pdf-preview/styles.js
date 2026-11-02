const { getPreviewContentStyles } = require("./styles-content");
const { getPreviewElementStyles } = require("./styles-elements");
const { getPreviewLayoutStyles } = require("./styles-layout");
const { getPreviewPrintStyles } = require("./styles-print");
const { getDocumentLineHeightStyles } = require("../../../shared/document-html-sanitizer");

function getPreviewDocumentStyles(template = {}) {
  return [
    getPreviewLayoutStyles(),
    getPreviewContentStyles(),
    getPreviewElementStyles(),
    getPreviewPrintStyles(template),
    getDocumentLineHeightStyles(),
  ].join("\n");
}

module.exports = {
  getPreviewDocumentStyles,
};
