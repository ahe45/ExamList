const assert = require("node:assert/strict");
const test = require("node:test");

const { pdfGenerationCancelMessage } = require("./cancellation");
const { summarizePdfGenerationBatchStatus } = require("./batch-status");

test("summarizePdfGenerationBatchStatus reports running batches", () => {
  const summary = summarizePdfGenerationBatchStatus(
    { totalRequested: 4 },
    [
      { status: "completed" },
      { status: "running" },
      { status: "queued" },
      { status: "failed" },
    ],
  );

  assert.equal(summary.status, "running");
  assert.equal(summary.progressPercent, 50);
  assert.equal(summary.queuedCount, 1);
  assert.equal(summary.runningCount, 1);
  assert.equal(summary.succeededCount, 1);
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.isTerminal, false);
});

test("summarizePdfGenerationBatchStatus completes successful terminal batches", () => {
  const summary = summarizePdfGenerationBatchStatus(
    { totalRequested: 2 },
    [
      { status: "completed" },
      { status: "failed" },
    ],
  );

  assert.equal(summary.status, "completed");
  assert.equal(summary.progressPercent, 100);
  assert.equal(summary.isTerminal, true);
});

test("summarizePdfGenerationBatchStatus marks cancelled terminal batches as failed", () => {
  const summary = summarizePdfGenerationBatchStatus(
    { errorMessage: pdfGenerationCancelMessage, totalRequested: 2 },
    [
      { status: "completed" },
      { status: "failed" },
    ],
  );

  assert.equal(summary.status, "failed");
  assert.equal(summary.progressPercent, 100);
  assert.equal(summary.isCancelRequested, true);
});
