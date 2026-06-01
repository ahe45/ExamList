const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplateEditorTableBorderConfigController } = require("./table-border-config.js");

function createBorderConfigHarness() {
  const borderColorInput = { value: "#000000", dataset: {} };
  const borderStyleInput = { value: "solid", dataset: {} };
  const borderTargetInput = { value: "all", dataset: {} };
  const borderWidthInput = { value: "1", dataset: {} };
  const controller = createTemplateEditorTableBorderConfigController({
    getTemplateEditorBorderColorInput: () => borderColorInput,
    getTemplateEditorBorderStyleInput: () => borderStyleInput,
    getTemplateEditorBorderTargetInput: () => borderTargetInput,
    getTemplateEditorBorderWidthInput: () => borderWidthInput,
    normalizeTemplateEditorColorValue: (value) => value,
  });

  return {
    borderStyleInput,
    borderWidthInput,
    controller,
  };
}

test("table border width accepts half-pixel dropdown values", () => {
  const { borderStyleInput, borderWidthInput, controller } = createBorderConfigHarness();

  borderWidthInput.value = "1.5";
  assert.equal(controller.getTemplateEditorBorderConfig().width, 1.5);

  borderWidthInput.value = "2.5";
  borderStyleInput.value = "double";
  assert.equal(controller.getTemplateEditorBorderConfig().width, 4.5);

  borderWidthInput.value = "3";
  borderStyleInput.value = "solid";
  assert.equal(controller.getTemplateEditorBorderConfig().width, 3);
});

test("table border width clamps to the dropdown range and removes zero-width borders", () => {
  const { borderWidthInput, controller } = createBorderConfigHarness();

  borderWidthInput.value = "7";
  assert.equal(controller.getTemplateEditorBorderConfig().width, 3);

  borderWidthInput.value = "0";
  assert.deepEqual(
    {
      style: controller.getTemplateEditorBorderConfig().style,
      width: controller.getTemplateEditorBorderConfig().width,
    },
    {
      style: "none",
      width: 0,
    },
  );
});
