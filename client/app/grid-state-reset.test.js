import test from "node:test";
import assert from "node:assert/strict";

import { resetGridStateForRouteNavigation } from "./grid-state-reset.js";

function createState() {
  return {
    candidates: {
      table: {
        filterMenuKey: "campus",
        filterMenuPosition: { left: 100, top: 80 },
        filterMenuSearch: "서울",
        filters: { campus: ["서울"] },
        page: 3,
        pageSize: 50,
        pageSizeMenuOpen: true,
        sortRules: [{ key: "name", direction: "desc" }],
      },
    },
    pdfGenerations: {
      selectedGenerationIds: ["generation-1", "generation-2"],
      selectionAnchorGenerationId: "generation-1",
      table: {
        filterMenuKey: "admission",
        filterMenuPosition: { left: 120, top: 90 },
        filterMenuSearch: "논술",
        filters: { admission: ["논술"] },
        page: 2,
        pageSize: 100,
        pageSizeMenuOpen: true,
        sortRules: [{ key: "createdAt", direction: "desc" }],
      },
    },
  };
}

test("resetGridStateForRouteNavigation resets grid filters and sort when moving pages", () => {
  const state = createState();
  const changed = resetGridStateForRouteNavigation(
    state,
    { path: "/schools/demo/candidates", view: "candidateLookup" },
    { path: "/schools/demo/pdf-generations", view: "pdfGenerationHistory" },
  );

  assert.equal(changed, true);
  assert.deepEqual(state.candidates.table.filters, {});
  assert.deepEqual(state.candidates.table.sortRules, []);
  assert.equal(state.candidates.table.filterMenuKey, "");
  assert.equal(state.candidates.table.filterMenuPosition, null);
  assert.equal(state.candidates.table.filterMenuSearch, "");
  assert.equal(state.candidates.table.page, 1);
  assert.equal(state.candidates.table.pageSize, 50);
  assert.equal(state.candidates.table.pageSizeMenuOpen, false);

  assert.deepEqual(state.pdfGenerations.table.filters, {});
  assert.deepEqual(state.pdfGenerations.table.sortRules, [{ key: "sequenceNumber", direction: "asc" }]);
  assert.equal(state.pdfGenerations.table.filterMenuKey, "");
  assert.equal(state.pdfGenerations.table.filterMenuPosition, null);
  assert.equal(state.pdfGenerations.table.filterMenuSearch, "");
  assert.equal(state.pdfGenerations.table.page, 1);
  assert.equal(state.pdfGenerations.table.pageSize, 100);
  assert.equal(state.pdfGenerations.table.pageSizeMenuOpen, false);
  assert.deepEqual(state.pdfGenerations.selectedGenerationIds, []);
  assert.equal(state.pdfGenerations.selectionAnchorGenerationId, "");
});

test("resetGridStateForRouteNavigation keeps grid state on the same page", () => {
  const state = createState();
  const changed = resetGridStateForRouteNavigation(
    state,
    { path: "/schools/demo/candidates", view: "candidateLookup" },
    { path: "/schools/demo/candidates", view: "candidateLookup" },
  );

  assert.equal(changed, false);
  assert.deepEqual(state.candidates.table.filters, { campus: ["서울"] });
  assert.deepEqual(state.pdfGenerations.table.sortRules, [{ key: "createdAt", direction: "desc" }]);
  assert.deepEqual(state.pdfGenerations.selectedGenerationIds, ["generation-1", "generation-2"]);
  assert.equal(state.pdfGenerations.selectionAnchorGenerationId, "generation-1");
});
