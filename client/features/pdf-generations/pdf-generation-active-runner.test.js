import test from "node:test";
import assert from "node:assert/strict";

import { createPdfGenerationActiveRunner } from "./pdf-generation-active-runner.js";
import { createEmptyActivePdfGeneration } from "./pdf-generation-state.js";

test("active generation clock advances from the elapsed time returned by the server", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const scheduledCallbacks = [];
  let clockMs = 0;

  globalThis.document = {
    querySelector: () => null,
  };
  globalThis.window = {
    clearTimeout: () => {},
    performance: {
      now: () => clockMs,
    },
    setTimeout: (callback) => {
      scheduledCallbacks.push(callback);
      return scheduledCallbacks.length;
    },
  };

  try {
    const appState = {
      pdfGenerations: {
        activeGeneration: createEmptyActivePdfGeneration(),
      },
    };
    const runner = createPdfGenerationActiveRunner({
      appState,
      getCreateModalState: () => ({}),
      hasPermission: () => true,
      loadGenerations: async () => {},
      onStateChange: async () => {},
      resetPdfGenerationTemplatePreview: () => {},
    });

    runner.updateActiveGenerationFromBatch({
      batchId: "batch-1",
      elapsedSeconds: 0,
      status: "running",
      totalRequested: 1,
    });
    assert.equal(appState.pdfGenerations.activeGeneration.elapsedSeconds, 0);
    assert.equal(scheduledCallbacks.length, 1);

    clockMs = 1200;
    await scheduledCallbacks.shift()();

    assert.equal(appState.pdfGenerations.activeGeneration.elapsedSeconds, 1);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});
