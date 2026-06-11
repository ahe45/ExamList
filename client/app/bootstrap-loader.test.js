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
