const { runEditorLayoutScenario } = require("./template-editor/editor-layout");
const { runDocumentInputScenario } = require("./template-editor/document-input");
const { runCandidateBlockGridScenario } = require("./template-editor/candidate-block-grid");
const { runToolbarAndPagePropertiesScenario } = require("./template-editor/toolbar-and-page-properties");
const { runGeneratedObjectsScenario } = require("./template-editor/generated-objects");
const { runImageObjectScenario } = require("./template-editor/image-object");
const { runDataTagsFormattingScenario } = require("./template-editor/data-tags-formatting");
const { runDocumentOverflowScenario } = require("./template-editor/document-overflow");
const { runTableBasicEditingScenario } = require("./template-editor/table-basic-editing");
const { runTableColumnResizeScenario } = require("./template-editor/table-column-resize");
const { runTableRowResizeScenario } = require("./template-editor/table-row-resize");
const { runTableFormatSaveScenario } = require("./template-editor/table-format-save");
const { runTableStructureEditingScenario } = require("./template-editor/table-structure-editing");
const { runTableObjectSelectionScenario } = require("./template-editor/table-object-selection");
const { runSaveRestoreScenario } = require("./template-editor/save-restore");

async function runTemplateEditorScenario(context) {
  await runEditorLayoutScenario(context);
  await runDocumentInputScenario(context);
  await runCandidateBlockGridScenario(context);
  await runToolbarAndPagePropertiesScenario(context);
  await runGeneratedObjectsScenario(context);
  await runImageObjectScenario(context);
  await runDataTagsFormattingScenario(context);
  await runDocumentOverflowScenario(context);
  await runTableBasicEditingScenario(context);
  await runTableColumnResizeScenario(context);
  await runTableRowResizeScenario(context);
  await runTableFormatSaveScenario(context);
  await runTableStructureEditingScenario(context);
  await runTableObjectSelectionScenario(context);
  await runSaveRestoreScenario(context);
}

module.exports = { runTemplateEditorScenario };
