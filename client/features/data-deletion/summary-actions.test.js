import test from "node:test";
import assert from "node:assert/strict";

import { createDataDeletionSummaryActions } from "./summary-actions.js";

function createJsonResponse(payload = {}) {
  return {
    headers: {
      get: () => "application/json",
    },
    json: async () => payload,
    ok: true,
    status: 200,
  };
}

function getUrlParams(url = "") {
  return new URL(url, "http://example.test").searchParams;
}

test("data deletion modal option request excludes each field from its own filters", async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  const modal = {
    isOpen: true,
    isLoadingOptions: false,
    isLoadingSummary: false,
    options: {},
    selectedScope: "candidates",
    selectedTemplateIds: [],
    summary: null,
    summaryErrorMessage: "",
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));

    if (String(url).startsWith("/api/candidates/filter-options")) {
      return createJsonResponse({ options: {} });
    }

    return createJsonResponse({ scopes: [] });
  };

  const actions = createDataDeletionSummaryActions({
    buildDataDeletionFilterPayload: () => ({ track: "수시" }),
    getCurrentSchoolId: () => "school-1",
    getDataDeletionModalState: () => modal,
    onStateChange: async () => {},
  });

  await actions.loadDataDeletionModalData();

  const optionUrl = requestedUrls.find((url) => url.startsWith("/api/candidates/filter-options"));
  const summaryUrl = requestedUrls.find((url) => url.startsWith("/api/data-deletion/summary"));
  const optionParams = getUrlParams(optionUrl);
  const summaryParams = getUrlParams(summaryUrl);

  assert.equal(optionParams.get("track"), "수시");
  assert.equal(optionParams.get("excludeSelfFilters"), "1");
  assert.equal(summaryParams.get("track"), "수시");
  assert.equal(summaryParams.get("excludeSelfFilters"), null);
});

test("options become usable before the summary and stale results cannot replace newer filters", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = (url) => new Promise((resolve) => requests.push({ url: String(url), resolve: (payload) => resolve(createJsonResponse(payload)) }));
  const modal = { isOpen: true, selectedScope: "candidates", selectedTemplateIds: [], summary: { old: true } };
  let track = "first";
  const actions = createDataDeletionSummaryActions({
    buildDataDeletionFilterPayload: () => ({ track }),
    getCurrentSchoolId: () => "school-1",
    getDataDeletionModalState: () => modal,
    onStateChange: async () => {},
  });
  const first = actions.loadDataDeletionModalData();
  await new Promise(setImmediate);
  assert.equal(requests.length, 2);
  assert.equal(modal.summary, null);
  assert.equal(getUrlParams(requests[1].url).get("scope"), "candidates");
  assert.equal(getUrlParams(requests[0].url).get("fields").split(",").length, 11);
  requests[0].resolve({ options: { track: [{ value: "first" }] } });
  await new Promise(setImmediate);
  assert.equal(modal.isLoadingOptions, false);
  assert.equal(modal.isLoadingSummary, true);
  track = "second";
  const second = actions.loadDataDeletionModalData();
  await new Promise(setImmediate);
  requests[2].resolve({ options: { track: [{ value: "second" }] } });
  requests[3].resolve({ scopes: [{ scope: "candidates", totalCount: 2 }] });
  await second;
  requests[1].resolve({ scopes: [{ scope: "candidates", totalCount: 99 }] });
  await first;
  assert.equal(modal.options.track[0].value, "second");
  assert.equal(modal.summary.scopes[0].totalCount, 2);
  assert.equal(modal.isLoadingSummary, false);
  const closed = actions.loadDataDeletionModalData();
  await new Promise(setImmediate);
  modal.isOpen = false;
  requests[4].resolve({ options: { stale: [] } });
  requests[5].resolve({ stale: true });
  await closed;
  assert.equal(modal.summary, null);
  assert.equal(modal.options.stale, undefined);
});

test("failed option refresh preserves the available list and chosen conditions while count completes", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const options = { track: [{ value: "수시", candidateCount: 12 }] };
  const filters = { track: "수시", admission: "논술" };
  const modal = { isOpen: true, selectedScope: "candidates", selectedTemplateIds: [],
    filters, selectedFilterKeys: ["track", "admission"], options };
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("/api/candidates/filter-options")) throw new Error("Temporary network error");
    assert.equal(getUrlParams(String(url)).get("track"), "수시");
    assert.equal(getUrlParams(String(url)).get("admission"), "논술");
    return createJsonResponse({ scopes: [{ scope: "candidates", totalCount: 0 }] });
  };
  const actions = createDataDeletionSummaryActions({
    buildDataDeletionFilterPayload: () => ({ ...modal.filters }),
    getCurrentSchoolId: () => "school-1", getDataDeletionModalState: () => modal,
    onStateChange: async () => {},
  });
  await actions.loadDataDeletionModalData();
  assert.equal(modal.options, options);
  assert.deepEqual(modal.filters, filters);
  assert.deepEqual(modal.selectedFilterKeys, ["track", "admission"]);
  assert.equal(modal.summary.scopes[0].totalCount, 0);
  assert.equal(modal.isLoadingOptions, false);
  assert.equal(modal.isLoadingSummary, false);
});
