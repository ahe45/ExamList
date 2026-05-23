const { normalizeTemplateLayout } = require("../pdf-templates/layout");
const { buildPreviewWarnings, selectPreviewCandidates } = require("./service");
const { replaceTemplateTokens, renderPreviewDocument } = require("./renderer");

function createTemplate(layout) {
  return {
    description: "???? ???",
    generationUnit: "room",
    id: "template-preview-test",
    layout,
    name: "???? ???",
    orientation: "portrait",
    paperPreset: "A4",
  };
}

module.exports = {
  buildPreviewWarnings,
  createTemplate,
  normalizeTemplateLayout,
  replaceTemplateTokens,
  renderPreviewDocument,
  selectPreviewCandidates,
};
