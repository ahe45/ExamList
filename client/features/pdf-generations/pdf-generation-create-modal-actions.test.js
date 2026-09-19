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

test("PDF single options cascade through revealed fields and stale estimates cannot overwrite the final conditions", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const modal = { isOpen: true, filters: {}, selectedFilterKeys: [], selectedTemplateId: "template-1",
    templates: [{ id: "template-1", generationUnit: "roomCode" }] };
  const targets = [];
  let resolveFirstEstimate;
  globalThis.fetch = async (url) => {
    const params = getUrlParams(url);
    if (String(url).startsWith("/api/candidates/filter-options")) {
      const options = { track: [{ value: "수시" }],
        admission: params.get("track") ? [{ value: "논술" }] : [{ value: "논술" }, { value: "일반" }],
        series: [{ value: "인문" }], unit: [{ value: "학과" }], major: [{ value: "전공1" }, { value: "전공2" }],
        room: [{ value: "101" }],
      };
      return createJsonResponse({ options: Object.fromEntries((params.get("fields") || "").split(",").map(key => [key, options[key] || []])) });
    }
    targets.push(params);
    if (targets.length === 1) return await new Promise(resolve => { resolveFirstEstimate = resolve; });
    return createJsonResponse({ items: [{ candidateCount: params.get("unit") ? 7 : 99 }], total: 1 });
  };
  const actions = createPdfGenerationCreateModalActions({ getCreateModalState: () => modal,
    getCurrentSchoolId: () => "school-1", onStateChange: async () => {} });
  const loading = actions.loadCreateModalOptions();
  for (let i = 0; i < 20 && modal.targetEstimate?.candidateCount !== 7; i++) await new Promise(setImmediate);
  assert.equal(modal.targetEstimate?.candidateCount, 7);
  resolveFirstEstimate(createJsonResponse({ items: [{ candidateCount: 999 }], total: 1 }));
  await loading;
  assert.deepEqual(modal.filters, { track: "수시", admission: "논술", series: "인문", unit: "학과" });
  assert.deepEqual(modal.selectedFilterKeys, ["track", "admission", "series", "unit"]);
  assert.equal(modal.targetEstimate.candidateCount, 7);
  assert.equal(targets.at(-1).get("unit"), "학과");
  assert.equal(modal.isLoadingOptions, false);
  await actions.updatePdfGenerationCreateFilter("unit", "");
  assert.equal(modal.filters.unit, "", "explicit all must remain available for singleton fields");
  assert.ok(modal.selectedFilterKeys.includes("unit"));
});

test("PDF filters are not automatically selected before a template is chosen", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => createJsonResponse({ options: { track: [{ value: "수시" }] } });
  const modal = { isOpen: true, filters: {}, selectedFilterKeys: [], selectedTemplateId: "", templates: [] };
  const actions = createPdfGenerationCreateModalActions({ getCreateModalState: () => modal,
    getCurrentSchoolId: () => "school-1", onStateChange: async () => {} });
  await actions.loadCreateModalOptions();
  assert.deepEqual(modal.selectedFilterKeys, []);
});

test("opening PDF creation selects the sole template, loads its details and selects singleton filters", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  const template = { id: "template-1", name: "확인대장", generationUnit: "roomCode" };
  const detailedTemplate = { ...template, layout: { pages: [{ type: "cover" }] } };
  globalThis.fetch = async (url, options = {}) => {
    requests.push(String(url));
    assert.equal(options.method || "GET", "GET");
    if (url.startsWith("/api/pdf-templates?")) return createJsonResponse({ items: [template], total: 1 });
    if (url.startsWith("/api/pdf-templates/template-1?")) return createJsonResponse(detailedTemplate);
    if (url.startsWith("/api/candidates/filter-options?")) {
      return createJsonResponse({ options: { track: [{ value: "수시" }], admission: [{ value: "논술" }] } });
    }
    assert.ok(url.startsWith("/api/pdf-generations/targets?"));
    return createJsonResponse({ items: [{ candidateCount: 7 }], total: 1 });
  };
  const modal = {};
  const actions = createPdfGenerationCreateModalActions({
    getCreateModalState: () => modal, getCurrentSchoolId: () => "school-1",
    hasPermission: () => true, resetPdfGenerationTemplatePreview: () => {}, onStateChange: async () => {},
  });
  await actions.openPdfGenerationCreateModal();
  assert.equal(modal.selectedTemplateId, template.id);
  assert.deepEqual(actions.getSelectedCreateTemplate(), detailedTemplate);
  assert.deepEqual(modal.selectedFilterKeys, ["track", "admission"]);
  assert.equal(modal.filters.track, "수시");
  assert.equal(modal.filters.admission, "논술");
  assert.equal(modal.targetEstimate.templateId, template.id);
  assert.equal(modal.targetEstimate.candidateCount, 7);
  assert.equal(modal.isLoadingOptions, false);
  assert.ok(requests.includes("/api/pdf-templates/template-1?schoolId=school-1"));
});

for (const count of [0, 2]) {
  test(`opening PDF creation leaves templates unselected when there are ${count} choices`, async (t) => {
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async (url) => {
      if (url.startsWith("/api/pdf-templates?")) {
        return createJsonResponse({ items: Array.from({ length: count }, (_, index) => ({ id: `template-${index}`, generationUnit: "roomCode" })) });
      }
      assert.ok(url.startsWith("/api/candidates/filter-options?"));
      return createJsonResponse({ options: { track: [{ value: "수시" }] } });
    };
    const modal = {};
    const actions = createPdfGenerationCreateModalActions({
      getCreateModalState: () => modal, getCurrentSchoolId: () => "school-1",
      hasPermission: () => true, resetPdfGenerationTemplatePreview: () => {}, onStateChange: async () => {},
    });
    await actions.openPdfGenerationCreateModal();
    assert.equal(modal.selectedTemplateId, "");
    assert.deepEqual(modal.selectedFilterKeys, []);
    assert.equal(modal.targetEstimate, null);
  });
}

test("a template list received after closing the modal does not trigger automatic selection", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let resolveTemplates;
  globalThis.fetch = async (url) => {
    assert.ok(url.startsWith("/api/pdf-templates?"));
    return await new Promise(resolve => { resolveTemplates = resolve; });
  };
  const modal = {};
  const actions = createPdfGenerationCreateModalActions({
    getCreateModalState: () => modal, getCurrentSchoolId: () => "school-1",
    hasPermission: () => true, resetPdfGenerationTemplatePreview: () => {}, onStateChange: async () => {},
  });
  const opening = actions.openPdfGenerationCreateModal();
  await new Promise(setImmediate);
  await actions.closePdfGenerationCreateModal();
  resolveTemplates(createJsonResponse({ items: [{ id: "template-1", generationUnit: "roomCode" }] }));
  await opening;
  assert.equal(modal.isOpen, false);
  assert.equal(modal.selectedTemplateId, "");
  assert.equal(modal.targetEstimate, null);
});
