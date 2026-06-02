const {
  runConfiguredHeightFirstRowShrinkCase,
  runFixedSingleCellShiftRowResizeCases,
  runLowerEdgeRowResizeKeepsTargetRowAndFocusCase,
  runMixedColumnThenRowResizeCase,
  runMixedRowThenColumnResizeCase,
  runPercentTableHeightMiddleRowShrinkCase,
  runStaleTableHeightMiddleRowShrinkCase,
} = require("./table-resize/row-cases");

async function runTableRowResizeScenario(context) {
  const { client } = context;
  await runFixedSingleCellShiftRowResizeCases(client);
  await runMixedRowThenColumnResizeCase(client);
  await runMixedColumnThenRowResizeCase(client);
  await runConfiguredHeightFirstRowShrinkCase(client);
  await runStaleTableHeightMiddleRowShrinkCase(client);
  await runPercentTableHeightMiddleRowShrinkCase(client);
  await runLowerEdgeRowResizeKeepsTargetRowAndFocusCase(client);
}

module.exports = { runTableRowResizeScenario };
