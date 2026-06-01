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
