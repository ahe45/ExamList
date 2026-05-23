const {
  runFixedSingleCellShiftRowResizeCases,
  runMixedColumnThenRowResizeCase,
  runMixedRowThenColumnResizeCase,
} = require("./table-resize/row-cases");

async function runTableRowResizeScenario(context) {
  const { client } = context;
  await runFixedSingleCellShiftRowResizeCases(client);
  await runMixedRowThenColumnResizeCase(client);
  await runMixedColumnThenRowResizeCase(client);
}

module.exports = { runTableRowResizeScenario };
