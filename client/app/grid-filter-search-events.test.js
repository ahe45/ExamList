import test from "node:test";
import assert from "node:assert/strict";

import {
  handleGridFilterSearchCompositionEnd,
  handleGridFilterSearchInput,
  markGridFilterSearchCompositionStart,
} from "./grid-filter-search-events.js";

function createFilterSearchInput(selector, value = "") {
  return {
    selectionEnd: String(value).length,
    selectionStart: String(value).length,
    value,
    matches(query) {
      return query === selector;
    },
  };
}

test("grid filter search defers rendering while IME composition is active", async () => {
  const selector = "[data-grid-filter-search-input]";
  const tableState = { filterMenuSearch: "" };
  let renderCount = 0;
  const options = {
    getTableState: () => tableState,
    onStateChange: async () => {
      renderCount += 1;
    },
    selector,
  };
  const inputElement = createFilterSearchInput(selector, "서");

  assert.equal(markGridFilterSearchCompositionStart({ target: inputElement }, selector), true);
  assert.equal(await handleGridFilterSearchInput({ target: inputElement }, options), true);
  assert.equal(tableState.filterMenuSearch, "서");
  assert.equal(renderCount, 0);

  inputElement.value = "서울";
  inputElement.selectionStart = 2;
  inputElement.selectionEnd = 2;

  assert.equal(await handleGridFilterSearchCompositionEnd({ target: inputElement }, options), true);
  assert.equal(tableState.filterMenuSearch, "서울");
  assert.equal(renderCount, 1);
});

test("grid filter search renders immediately outside IME composition", async () => {
  const selector = "[data-grid-filter-search-input]";
  const tableState = { filterMenuSearch: "" };
  let renderCount = 0;
  const inputElement = createFilterSearchInput(selector, "서울");

  assert.equal(await handleGridFilterSearchInput({
    isComposing: false,
    target: inputElement,
  }, {
    getTableState: () => tableState,
    onStateChange: async () => {
      renderCount += 1;
    },
    selector,
  }), true);
  assert.equal(tableState.filterMenuSearch, "서울");
  assert.equal(renderCount, 1);
});

test("grid filter search can refresh options without replacing the search input", async () => {
  const selector = "[data-grid-filter-search-input]";
  const tableState = { filterMenuSearch: "" };
  let refreshCount = 0;
  let renderCount = 0;
  const inputElement = createFilterSearchInput(selector, "서울");

  assert.equal(await handleGridFilterSearchInput({
    target: inputElement,
  }, {
    getTableState: () => tableState,
    onStateChange: async () => {
      renderCount += 1;
    },
    refreshFilterMenu: () => {
      refreshCount += 1;
      return true;
    },
    selector,
  }), true);
  assert.equal(tableState.filterMenuSearch, "서울");
  assert.equal(refreshCount, 1);
  assert.equal(renderCount, 0);
});
