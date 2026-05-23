import test from "node:test";
import assert from "node:assert/strict";

import { createPdfGenerationSelectionActions } from "./pdf-generation-selection-actions.js";

function createSelectionActions({ scopedItems, selectedGenerationIds = [] }) {
  const appState = {
    pdfGenerations: {
      items: [],
      selectionAnchorGenerationId: "",
      selectedGenerationIds,
    },
  };
  let renderCount = 0;
  const actions = createPdfGenerationSelectionActions({
    appState,
    getVisibleGenerationItems: () => scopedItems,
    onStateChange: () => {
      renderCount += 1;
    },
  });

  return { actions, appState, getRenderCount: () => renderCount };
}

test("selectAllVisibleGenerations selects every filtered completed generation, not only the page", () => {
  const { actions, appState, getRenderCount } = createSelectionActions({
    scopedItems: [
      { id: "page-1", status: "completed" },
      { id: "page-2", status: "completed" },
      { id: "filtered-off-page", status: "completed" },
      { id: "failed-row", status: "failed" },
    ],
    selectedGenerationIds: ["previous"],
  });

  actions.selectAllVisibleGenerations();

  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, [
    "page-1",
    "page-2",
    "filtered-off-page",
  ]);
  assert.equal(getRenderCount(), 1);
});

test("clearVisibleGenerationSelection clears only the current filtered generation scope", () => {
  const { actions, appState, getRenderCount } = createSelectionActions({
    scopedItems: [
      { id: "filtered-1", status: "completed" },
      { id: "filtered-2", status: "completed" },
    ],
    selectedGenerationIds: ["outside-filter", "filtered-1", "filtered-2"],
  });

  actions.clearVisibleGenerationSelection();

  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, ["outside-filter"]);
  assert.equal(getRenderCount(), 1);
});

test("toggleGenerationSelection selects a shift range in filtered row order", () => {
  const { actions, appState, getRenderCount } = createSelectionActions({
    scopedItems: [
      { id: "first", status: "completed" },
      { id: "second", status: "completed" },
      { id: "third", status: "completed" },
      { id: "failed", status: "failed" },
    ],
  });

  actions.toggleGenerationSelection("first", true);
  actions.toggleGenerationSelection("third", true, { shiftKey: true });

  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, ["first", "second", "third"]);
  assert.equal(appState.pdfGenerations.selectionAnchorGenerationId, "third");
  assert.equal(getRenderCount(), 2);
});

test("toggleGenerationSelection ignores rows without a completed checkbox", () => {
  const { actions, appState, getRenderCount } = createSelectionActions({
    scopedItems: [
      { id: "completed", status: "completed" },
      { id: "failed", status: "failed" },
    ],
  });

  actions.toggleGenerationSelection("failed", true);

  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, []);
  assert.equal(getRenderCount(), 0);
});
