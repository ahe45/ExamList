const { getPreviewContentStyles } = require("./styles-content");
const { getPreviewElementStyles } = require("./styles-elements");
const { getPreviewLayoutStyles } = require("./styles-layout");
const { getPreviewPrintStyles } = require("./styles-print");

function getPreviewDocumentStyles(template = {}) {
  return [
    getPreviewLayoutStyles(),
    getPreviewContentStyles(),
    getPreviewElementStyles(),
    getPreviewPrintStyles(template),
  ].join("\n");
}

module.exports = {
  getPreviewDocumentStyles,
};
