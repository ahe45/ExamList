import test from "node:test";
import assert from "node:assert/strict";

import {
  getCompletedBatchGenerationIds,
  prepareGeneratedBatchResultModalState,
} from "./pdf-generation-auto-download.js";

test("completed batch generation ids include only completed rows from the target batch", () => {
  const ids = getCompletedBatchGenerationIds(
    [
      { batchId: "batch-1", id: "completed-1", status: "completed" },
      { batchId: "batch-1", id: "failed-1", status: "failed" },
      { batchId: "batch-2", id: "completed-2", status: "completed" },
      { batchId: "batch-1", id: "completed-3", status: "completed" },
    ],
    "batch-1",
  );

  assert.deepEqual(ids, ["completed-1", "completed-3"]);
});

test("generated result modal opens with generated PDFs only when at least two are completed", () => {
  const appState = {
    pdfGenerations: {
      downloadModal: { isOpen: false, mode: "merge" },
      generatedResultModal: { isOpen: false, mode: "merge" },
      items: [
        { batchId: "batch-1", id: "completed-1", status: "completed" },
        { batchId: "batch-1", id: "completed-2", status: "completed" },
        { batchId: "batch-1", id: "failed-1", status: "failed" },
        { batchId: "batch-2", id: "completed-3", status: "completed" },
      ],
      selectedGenerationIds: ["previous"],
      selectionAnchorGenerationId: "previous",
    },
  };

  const opened = prepareGeneratedBatchResultModalState({
    appState,
    batch: {
      archiveDownloadUrl: "/api/pdf-generations/archives/archive-1/download",
      archiveFileName: "generated.zip",
      failedCount: 1,
      succeededCount: 2,
      templateName: "수험표",
      totalRequested: 3,
    },
    batchId: "batch-1",
    canDownload: true,
  });

  assert.equal(opened, true);
  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, ["previous"]);
  assert.equal(appState.pdfGenerations.selectionAnchorGenerationId, "previous");
  assert.equal(appState.pdfGenerations.downloadModal.isOpen, false);
  assert.equal(appState.pdfGenerations.downloadModal.mode, "merge");
  assert.equal(appState.pdfGenerations.generatedResultModal.isOpen, true);
  assert.equal(appState.pdfGenerations.generatedResultModal.isSubmitting, false);
  assert.equal(appState.pdfGenerations.generatedResultModal.mode, "merge");
  assert.deepEqual(appState.pdfGenerations.generatedResultModal.generationIds, ["completed-1", "completed-2"]);
  assert.equal(appState.pdfGenerations.generatedResultModal.archiveFileName, "generated.zip");
  assert.equal(appState.pdfGenerations.generatedResultModal.failedCount, 1);
});

test("generated result modal uses explicit batch items instead of grid selection state", () => {
  const appState = {
    pdfGenerations: {
      generatedResultModal: { isOpen: false, mode: "merge" },
      items: [],
      selectedGenerationIds: ["previous"],
      selectionAnchorGenerationId: "previous",
    },
  };

  const opened = prepareGeneratedBatchResultModalState({
    appState,
    batchId: "batch-1",
    canDownload: true,
    items: [
      { batchId: "batch-1", id: "completed-1", status: "completed" },
      { batchId: "batch-1", id: "completed-2", status: "completed" },
      { batchId: "batch-2", id: "completed-3", status: "completed" },
    ],
  });

  assert.equal(opened, true);
  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, ["previous"]);
  assert.deepEqual(appState.pdfGenerations.generatedResultModal.generationIds, ["completed-1", "completed-2"]);
});

test("generated result modal stays closed when fewer than two generated PDFs are completed", () => {
  const appState = {
    pdfGenerations: {
      downloadModal: { isOpen: false, mode: "merge" },
      generatedResultModal: { isOpen: false, mode: "merge" },
      items: [
        { batchId: "batch-1", id: "completed-1", status: "completed" },
        { batchId: "batch-1", id: "failed-1", status: "failed" },
      ],
      selectedGenerationIds: ["previous"],
      selectionAnchorGenerationId: "previous",
    },
  };

  const opened = prepareGeneratedBatchResultModalState({
    appState,
    batchId: "batch-1",
    canDownload: true,
  });

  assert.equal(opened, false);
  assert.deepEqual(appState.pdfGenerations.selectedGenerationIds, ["previous"]);
  assert.equal(appState.pdfGenerations.downloadModal.isOpen, false);
  assert.equal(appState.pdfGenerations.downloadModal.mode, "merge");
  assert.equal(appState.pdfGenerations.generatedResultModal.isOpen, false);
  assert.equal(appState.pdfGenerations.generatedResultModal.mode, "merge");
});
