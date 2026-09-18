import test from "node:test";
import assert from "node:assert/strict";

import { createPdfGenerationCreateModalActions } from "./pdf-generation-create-modal-actions.js";

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

test("PDF generation create modal option request excludes each field from its own filters", async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  const modal = {
    errorMessage: "",
    filters: {
      track: "수시",
    },
    isLoadingOptions: false,
    options: {},
    selectedFilterKeys: ["track"],
    selectedTemplateId: "template-1",
    targetEstimate: null,
    templates: [
      {
        generationUnit: "roomCode",
        id: "template-1",
        name: "확인대장",
      },
    ],
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));

    if (String(url).startsWith("/api/candidates/filter-options")) {
      return createJsonResponse({ options: {} });
    }

    return createJsonResponse({ items: [], total: 0 });
  };

  const actions = createPdfGenerationCreateModalActions({
    appState: { pdfGenerations: {} },
    closeActiveGenerationOverlay: () => {},
    closePdfGenerationCreateModalAfterActiveGeneration: () => {},
    getCreateModalState: () => modal,
    getCurrentSchoolId: () => "school-1",
    hasPermission: () => true,
    loadGenerations: async () => {},
    onStateChange: async () => {},
    pollActiveGenerationBatch: async () => {},
    resetPdfGenerationTemplatePreview: () => {},
    scheduleActiveGenerationClock: () => {},
    updateActiveGenerationFromBatch: () => {},
    updateActiveGenerationOverlayDom: () => {},
  });

  await actions.loadCreateModalOptions();

  const optionUrl = requestedUrls.find((url) => url.startsWith("/api/candidates/filter-options"));
  const targetUrl = requestedUrls.find((url) => url.startsWith("/api/pdf-generations/targets"));
  const optionParams = getUrlParams(optionUrl);
  const targetParams = getUrlParams(targetUrl);

  assert.equal(optionParams.get("track"), "수시");
  assert.equal(optionParams.get("excludeSelfFilters"), "1");
  assert.equal(targetParams.get("track"), "수시");
  assert.equal(targetParams.get("excludeSelfFilters"), null);
});

test("PDF options load independently of estimates and ignore older requests", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = (url) => new Promise((resolve) => requests.push({ url: String(url), resolve: (payload) => resolve(createJsonResponse(payload)) }));
  const modal = { isOpen: true, filters: { track: "first" }, selectedFilterKeys: ["track"], selectedTemplateId: "template-1", templates: [{ id: "template-1", generationUnit: "roomCode" }] };
  const actions = createPdfGenerationCreateModalActions({
    getCreateModalState: () => modal,
    getCurrentSchoolId: () => "school-1",
    onStateChange: async () => {},
  });
  const first = actions.loadCreateModalOptions();
  await new Promise(setImmediate);
  assert.equal(requests.length, 2);
  assert.deepEqual(getUrlParams(requests[0].url).get("fields").split(","), ["track", "admission", "series"]);
  requests[0].resolve({ options: { track: [{ value: "first" }] } });
  await new Promise(setImmediate);
  assert.equal(modal.isLoadingOptions, false);
  assert.equal(modal.isLoadingTargetEstimate, true);
  modal.filters.track = "second";
  modal.selectedFilterKeys = ["track", "admission", "series"];
  const second = actions.loadCreateModalOptions();
  await new Promise(setImmediate);
  assert.deepEqual(getUrlParams(requests[2].url).get("fields").split(","), ["track", "admission", "series", "unit"]);
  requests[2].resolve({ options: { track: [{ value: "second" }] } });
  requests[3].resolve({ items: [{ candidateCount: 2 }], total: 1 });
  await second;
  requests[1].resolve({ items: [{ candidateCount: 99 }], total: 1 });
  await first;
  assert.equal(modal.targetEstimate.candidateCount, 2);
  assert.equal(modal.options.track[0].value, "second");
  assert.equal(modal.isLoadingTargetEstimate, false);
});
