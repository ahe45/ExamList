const { runInlineTokenTextHeightCase, runRepeatedTokenAlignmentCase } = require("./data-tags/alignment");
const { runDataTagLineHeightCases } = require("./data-tags/line-height");
const { runDataTagSampleDisplaySyncCase } = require("./data-tags/sample-display");
const { runDataTagCommandFormattingCases } = require("./data-tags/tag-formatting");
const { runDataTagToolbarFormattingCases } = require("./data-tags/toolbar-formatting");

async function runDataTagsFormattingScenario(context) {
  const { client } = context;

  await runDataTagCommandFormattingCases(client);
  await runDataTagToolbarFormattingCases(client);
  await runDataTagSampleDisplaySyncCase(client);
  await runDataTagLineHeightCases(client);
  await runInlineTokenTextHeightCase(client);
  await runRepeatedTokenAlignmentCase(client);
}

module.exports = { runDataTagsFormattingScenario };
