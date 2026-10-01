const {
  runConfiguredHeightFirstRowShrinkCase,
  runFixedSingleCellShiftRowResizeCases,
  runLowerEdgeRowResizeKeepsTargetRowAndFocusCase,
  runMixedColumnThenRowResizeCase,
  runMixedRowThenColumnResizeCase,
  runPercentTableHeightMiddleRowShrinkCase,
  runStaleTableHeightMiddleRowShrinkCase,
} = require("./table-resize/row-cases");
const { runSavedMinimumHeightRowShrinkCase } = require("./table-resize/saved-minimum-height");

async function runTableRowResizeScenario(context) {
  const { client } = context;
  for (const zoom of [1, 0.8, 1.25]) {
    await runSavedMinimumHeightRowShrinkCase(client, zoom);
  }
  await runFixedSingleCellShiftRowResizeCases(client);
  await runMixedRowThenColumnResizeCase(client);
  await runMixedColumnThenRowResizeCase(client);
  await runConfiguredHeightFirstRowShrinkCase(client);
  await runStaleTableHeightMiddleRowShrinkCase(client);
  await runPercentTableHeightMiddleRowShrinkCase(client);
  await runLowerEdgeRowResizeKeepsTargetRowAndFocusCase(client);
}

module.exports = { runTableRowResizeScenario };
