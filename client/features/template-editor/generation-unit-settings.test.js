const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("generation unit settings use candidate grid columns with defaults", async () => {
  const {
    formatGenerationUnitFieldsSummary,
    getGenerationUnitFieldOptions,
    getTemplateGenerationUnitFields,
    normalizeGenerationUnitFields,
    writeGenerationUnitSettingsToTemplate,
  } = await importClientModule("generation-unit-settings.js");

  const optionKeys = getGenerationUnitFieldOptions().map((option) => option.key);

  assert.equal(optionKeys.includes("date"), true);
  assert.equal(optionKeys.includes("periodCode"), true);
  assert.equal(optionKeys.includes("roomCode"), true);
  assert.equal(optionKeys.includes("designatedSort"), false);
  assert.equal(optionKeys.includes("examineeNo"), false);
  assert.equal(optionKeys.includes("temporaryNo"), false);
  assert.equal(optionKeys.includes("name"), false);
  assert.equal(optionKeys.includes("birth"), false);

  assert.deepEqual(getTemplateGenerationUnitFields({ layout: { generation: {} } }), ["date", "periodCode", "roomCode"]);
  assert.deepEqual(normalizeGenerationUnitFields(["date", "date", "opt1", "name", "roomCode"]), ["date", "opt1", "roomCode"]);
  assert.equal(formatGenerationUnitFieldsSummary(["date", "periodCode", "roomCode"]), "날짜 > 교시 코드 > 고사실 코드");

  const template = {
    generationUnit: "roomCode",
    layout: {
      generation: {},
    },
  };

  writeGenerationUnitSettingsToTemplate(template, ["date", "periodCode", "roomCode", "opt1"]);

  assert.equal(template.generationUnit, "custom");
  assert.equal(template.layout.generation.unit, "custom");
  assert.deepEqual(template.layout.generation.unitFields, ["date", "periodCode", "roomCode", "opt1"]);
});
