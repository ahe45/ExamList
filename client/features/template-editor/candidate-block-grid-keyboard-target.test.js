const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

class FakeElement {
  constructor({ closestMap = {}, isConnected = true } = {}) {
    this.closestMap = closestMap;
    this.isConnected = isConnected;
  }

  closest(selector) {
    return this.closestMap[selector] || null;
  }
}

test("candidate block keyboard delete guard allows selected grid and surface focus contexts", async () => {
  const { shouldHandleCandidateBlockGridKeyboardDelete } = await importClientModule("candidate-block-grid-keyboard-target.js");
  const gridElement = {};
  const surfaceElement = {};

  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      gridElement,
      surfaceElement,
      targetGridElement: gridElement,
    }),
    true,
  );
  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      activeGridElement: gridElement,
      gridElement,
      surfaceElement,
    }),
    true,
  );
  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      gridElement,
      surfaceElement,
      targetSurfaceElement: surfaceElement,
    }),
    true,
  );
  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      activeSurfaceElement: surfaceElement,
      gridElement,
      surfaceElement,
    }),
    true,
  );
});

test("candidate block keyboard delete guard allows passive document focus contexts", async () => {
  const { shouldHandleCandidateBlockGridKeyboardDelete } = await importClientModule("candidate-block-grid-keyboard-target.js");
  const gridElement = {};
  const surfaceElement = {};

  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      gridElement,
      isTargetDocumentBody: true,
      surfaceElement,
    }),
    true,
  );
  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      gridElement,
      isActiveDocumentBody: true,
      surfaceElement,
    }),
    true,
  );
  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      gridElement,
      isActiveDocumentElement: true,
      surfaceElement,
    }),
    true,
  );
});

test("candidate block keyboard delete guard rejects external editing controls", async () => {
  const { shouldHandleCandidateBlockGridKeyboardDelete } = await importClientModule("candidate-block-grid-keyboard-target.js");
  const gridElement = {};
  const surfaceElement = {};

  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      gridElement,
      isTargetExternalEditingControl: true,
      surfaceElement,
      targetGridElement: gridElement,
    }),
    false,
  );
  assert.equal(
    shouldHandleCandidateBlockGridKeyboardDelete({
      activeGridElement: gridElement,
      gridElement,
      isActiveExternalEditingControl: true,
      surfaceElement,
    }),
    false,
  );
});

test("candidate block keyboard delete guard rejects unrelated keyboard contexts", async () => {
  const { shouldHandleCandidateBlockGridKeyboardDelete } = await importClientModule("candidate-block-grid-keyboard-target.js");
  const gridElement = {};
  const surfaceElement = {};

  assert.equal(shouldHandleCandidateBlockGridKeyboardDelete({ gridElement, surfaceElement }), false);
  assert.equal(shouldHandleCandidateBlockGridKeyboardDelete({ surfaceElement }), false);
  assert.equal(shouldHandleCandidateBlockGridKeyboardDelete({ gridElement }), false);
});

test("candidate block external editing control ignores grid-owned and disconnected controls", async () => {
  const { isCandidateBlockGridExternalEditingControl } = await importClientModule("candidate-block-grid-keyboard-target.js");
  const surfaceElement = {};
  const externalInput = new FakeElement();
  const gridInput = new FakeElement();
  const disconnectedInput = new FakeElement({ isConnected: false });
  const gridElement = {
    contains: (element) => element === gridInput,
  };

  externalInput.closestMap["input, textarea, select, button, [contenteditable='true']"] = externalInput;
  gridInput.closestMap["input, textarea, select, button, [contenteditable='true']"] = gridInput;
  disconnectedInput.closestMap["input, textarea, select, button, [contenteditable='true']"] = disconnectedInput;

  assert.equal(
    isCandidateBlockGridExternalEditingControl(externalInput, gridElement, surfaceElement, FakeElement),
    true,
  );
  assert.equal(
    isCandidateBlockGridExternalEditingControl(gridInput, gridElement, surfaceElement, FakeElement),
    false,
  );
  assert.equal(
    isCandidateBlockGridExternalEditingControl(disconnectedInput, gridElement, surfaceElement, FakeElement),
    false,
  );
});

test("candidate block external editing control ignores controls inside the document surface", async () => {
  const { isCandidateBlockGridExternalEditingControl } = await importClientModule("candidate-block-grid-keyboard-target.js");
  const surfaceElement = {};
  const surfaceInput = new FakeElement();
  const gridElement = {
    contains: () => false,
  };

  surfaceInput.closestMap["input, textarea, select, button, [contenteditable='true']"] = surfaceInput;
  surfaceInput.closestMap["[data-editor-document-surface]"] = surfaceElement;

  assert.equal(
    isCandidateBlockGridExternalEditingControl(surfaceInput, gridElement, surfaceElement, FakeElement),
    false,
  );
});
