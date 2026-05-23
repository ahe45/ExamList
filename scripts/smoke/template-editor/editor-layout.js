const { assertCoverPageToggle } = require("./editor-layout-cover");
const {
  assertEditorGridLayout,
  assertEditorSurfaceHasNoUndefined,
} = require("./editor-layout-grid");
const { assertImageInsertPopover } = require("./editor-layout-popovers");
const { assertEditorWorkspaceShell } = require("./editor-layout-shell");

async function runEditorLayoutScenario(context) {
  const { client } = context;

  await assertEditorWorkspaceShell(client);
  await assertEditorGridLayout(client);
  await assertEditorSurfaceHasNoUndefined(client);
  await assertCoverPageToggle(client);
  await assertImageInsertPopover(client);
}

module.exports = { runEditorLayoutScenario };
