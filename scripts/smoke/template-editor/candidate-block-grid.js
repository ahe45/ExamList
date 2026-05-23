const { runCandidateBlockGridSetupSelectionScenario } = require("./candidate-block-grid/setup-selection");
const { runCandidateBlockGridMoveResizeScenario } = require("./candidate-block-grid/move-resize");
const { runCandidateBlockGridGeneratedObjectInsertionScenario } = require("./candidate-block-grid/generated-object-insertion");
const { runCandidateBlockGridTableInsertionResizeScenario } = require("./candidate-block-grid/table-insertion-resize");
const { runCandidateBlockGridTableDeleteSyncScenario } = require("./candidate-block-grid/table-delete-sync");
const { runCandidateBlockGridSaveHydrateDeleteScenario } = require("./candidate-block-grid/save-hydrate-delete");

async function runCandidateBlockGridScenario(context) {
  await runCandidateBlockGridSetupSelectionScenario(context);
  await runCandidateBlockGridGeneratedObjectInsertionScenario(context);
  await runCandidateBlockGridMoveResizeScenario(context);
  await runCandidateBlockGridTableInsertionResizeScenario(context);
  await runCandidateBlockGridTableDeleteSyncScenario(context);
  await runCandidateBlockGridSaveHydrateDeleteScenario(context);
}

module.exports = { runCandidateBlockGridScenario };
