import test from "node:test";
import assert from "node:assert/strict";

import { loadViewData } from "./bootstrap-loader.js";

function createNoopActions() {
  return new Proxy({}, {
    get() {
      return async () => {};
    },
  });
}

test("PDF generation history opens the generated PDF tab by default", async () => {
  const calls = [];

  await loadViewData({
    accountActions: createNoopActions(),
    candidatesActions: createNoopActions(),
    editorActions: createNoopActions(),
    generationActions: {
      loadArtifacts: async () => {
        calls.push("loadArtifacts");
      },
      loadGenerations: async () => {
        calls.push("loadGenerations");
      },
      resetPdfGenerationActiveTab: () => {
        calls.push("resetPdfGenerationActiveTab");
      },
    },
    route: { params: {}, view: "pdfGenerationHistory" },
    schoolActions: createNoopActions(),
    schoolSettingsActions: createNoopActions(),
    templatesActions: {
      loadSummary: async () => {
        calls.push("loadSummary");
      },
    },
  });

  assert.deepEqual(calls, [
    "loadSummary",
    "resetPdfGenerationActiveTab",
    "loadGenerations",
    "loadArtifacts",
  ]);
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("school ID resolution precedes parallel summary and candidate requests", async () => {
  const school = deferred(), summary = deferred(), list = deferred(), started = deferred();
  const calls = [];
  const loading = loadViewData({
    route: { view: "candidateLookup", params: { schoolId: "0000" } },
    schoolActions: { loadSchoolDetail: () => school.promise },
    templatesActions: { loadSummary: () => { calls.push("summary"); return summary.promise; } },
    candidatesActions: { loadCandidates: () => { calls.push("candidates"); started.resolve(); return list.promise; } },
  });
  assert.deepEqual(calls, []);
  school.resolve();
  await started.promise;
  assert.deepEqual(calls, ["summary", "candidates"]);
  list.resolve(); summary.resolve();
  await loading;
});

test("settings and template load concurrently and a rejection drains other requests", async () => {
  const settings = deferred(), template = deferred(), started = deferred();
  let finished = false;
  const loading = loadViewData({
    route: { view: "templateEditor", params: { templateId: "template" } },
    templatesActions: { loadSummary: async () => { throw new Error("summary failed"); } },
    schoolSettingsActions: { loadSchoolSettings: () => settings.promise },
    editorActions: { loadTemplateEditor: () => { started.resolve(); return template.promise; } },
  });
  const checked = assert.rejects(loading, /summary failed/).then(() => { finished = true; });
  await started.promise;
  assert.equal(finished, false);
  template.resolve(); settings.resolve();
  await checked;
});
