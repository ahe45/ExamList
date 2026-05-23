const { runEmptyCanvasBackspaceBoundaryCase } = require("./toolbar-page/document-boundary");
const { runEmptyCanvasTagInsertionCase } = require("./toolbar-page/tag-insertion");
const { runPagePropertiesCases } = require("./toolbar-page/page-properties");
const { runToolbarColorPickerCase } = require("./toolbar-page/toolbar-formatting");

async function runToolbarAndPagePropertiesScenario(context) {
  const { client } = context;

  await runToolbarColorPickerCase(client);
  await runPagePropertiesCases(client);
  await runEmptyCanvasBackspaceBoundaryCase(client);
  await runEmptyCanvasTagInsertionCase(client);
}

module.exports = { runToolbarAndPagePropertiesScenario };
