const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

function createElement({ closestMatch = false, contains = null, ownerDocument = null } = {}) {
  return {
    ownerDocument,
    closest() {
      return closestMatch ? this : null;
    },
    contains: contains || (() => false),
  };
}

test("candidate block grid refocus allows passive document focus", async () => {
  const { shouldRefocusCandidateBlockGridElement } = await importClientModule("candidate-block-grid-selection-focus.js");
  const ownerDocument = {
    body: {},
    documentElement: {},
  };
  const gridElement = createElement({ ownerDocument });

  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, null), true);
  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, ownerDocument.body), true);
  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, ownerDocument.documentElement), true);
});

test("candidate block grid refocus keeps focus when the grid owns the active element", async () => {
  const { shouldRefocusCandidateBlockGridElement } = await importClientModule("candidate-block-grid-selection-focus.js");
  const childElement = createElement({ closestMatch: true });
  const gridElement = createElement({
    contains: (element) => element === childElement,
  });

  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, gridElement), true);
  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, childElement), true);
});

test("candidate block grid refocus does not steal focus from external editing controls", async () => {
  const { shouldRefocusCandidateBlockGridElement } = await importClientModule("candidate-block-grid-selection-focus.js");
  const gridElement = createElement();
  const inputElement = createElement({ closestMatch: true });
  const contentEditableChild = createElement({ closestMatch: true });

  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, inputElement), false);
  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, contentEditableChild), false);
});

test("candidate block grid refocus can recover from external non-editing focus", async () => {
  const { shouldRefocusCandidateBlockGridElement } = await importClientModule("candidate-block-grid-selection-focus.js");
  const gridElement = createElement();
  const panelElement = createElement({ closestMatch: false });

  assert.equal(shouldRefocusCandidateBlockGridElement(gridElement, panelElement), true);
});
