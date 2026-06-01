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
      campus: "글로벌캠퍼스",
    },
    isLoadingOptions: false,
    options: {},
    selectedFilterKeys: ["campus"],
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

  assert.equal(optionParams.get("campus"), "글로벌캠퍼스");
  assert.equal(optionParams.get("excludeSelfFilters"), "1");
  assert.equal(targetParams.get("campus"), "글로벌캠퍼스");
  assert.equal(targetParams.get("excludeSelfFilters"), null);
});
