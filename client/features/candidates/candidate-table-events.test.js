import test from "node:test";
import assert from "node:assert/strict";

import { handleCandidateTableChange, handleCandidateTableClick } from "./candidate-table-events.js";

function createCandidateClickEvent(selector, element) {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: {
      closest(query) {
        return query === selector ? element : null;
      },
    },
  };
}

function createCandidatePaginationContext(table) {
  const candidates = {
    items: Array.from({ length: 95 }, (_, index) => ({ id: `candidate-${index + 1}` })),
    table,
  };
  let renderCount = 0;

  return {
    context: {
      appState: { candidates, currentView: "candidateLookup" },
      canManageCandidates: () => false,
      clampCandidatePage: () => {
        const totalPages = Math.max(1, Math.ceil(candidates.items.length / Math.max(1, Number(table.pageSize) || 1)));

        table.page = Math.min(Math.max(1, Number(table.page) || 1), totalPages);
        return totalPages;
      },
      closeCandidateFilterMenu: () => {
        table.filterMenuKey = "";
      },
      closeCandidatePageSizeMenu: () => {
        table.pageSizeMenuOpen = false;
      },
      getCandidateTableState: () => table,
      onStateChange: async () => {
        renderCount += 1;
      },
      onStateChangePreservingCandidateGridScroll: async () => {},
      openCandidateDetail: () => {},
      setCandidateFilterValues: () => {},
      toggleCandidateSort: () => {},
    },
    getRenderCount: () => renderCount,
  };
}

test("candidate pagination previous and next buttons update the current page", async () => {
  const table = { filters: {}, page: 2, pageSize: 30, pageSizeMenuOpen: false, sortRules: [] };
  const { context, getRenderCount } = createCandidatePaginationContext(table);
  const nextEvent = createCandidateClickEvent("[data-candidate-grid-nav]", {
    dataset: { candidateGridNav: "next" },
    disabled: false,
  });
  const previousEvent = createCandidateClickEvent("[data-candidate-grid-nav]", {
    dataset: { candidateGridNav: "prev" },
    disabled: false,
  });

  assert.equal(await handleCandidateTableClick(nextEvent, context), true);
  assert.equal(table.page, 3);
  assert.equal(nextEvent.defaultPrevented, true);

  assert.equal(await handleCandidateTableClick(previousEvent, context), true);
  assert.equal(table.page, 2);
  assert.equal(previousEvent.defaultPrevented, true);
  assert.equal(getRenderCount(), 2);
});

test("candidate page picker moves directly to the selected page", async () => {
  const table = { filters: {}, page: 1, pageSize: 30, pageSizeMenuOpen: true, sortRules: [] };
  const { context, getRenderCount } = createCandidatePaginationContext(table);
  const changeEvent = createCandidateClickEvent("[data-candidate-grid-page-picker]", {
    value: "3",
  });

  assert.equal(await handleCandidateTableChange(changeEvent, context), true);
  assert.equal(table.page, 3);
  assert.equal(table.pageSizeMenuOpen, false);
  assert.equal(getRenderCount(), 1);
});
