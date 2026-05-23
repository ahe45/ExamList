const {
  runFixedSingleCellShiftColumnResizeCases,
  runFullWidthSingleCellTinyShiftResizeCase,
} = require("./table-resize/column-cases");

async function runTableColumnResizeScenario(context) {
  const { client } = context;
  await runFullWidthSingleCellTinyShiftResizeCase(client);
  await runFixedSingleCellShiftColumnResizeCases(client);
}

module.exports = { runTableColumnResizeScenario };
