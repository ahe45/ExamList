const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfGenerationBatchCancelService } = require("./batch-cancel-service");
const { pdfGenerationCancelMessage } = require("./cancellation");

function createHttpError(statusCode, message, errorCode) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("cancelPdfGenerationBatch marks pending generation rows as cancelled", async () => {
  const calls = [];
  const service = createPdfGenerationBatchCancelService({
    cancelBatchGenerationRows: async (batchId, message) => {
      calls.push(["cancelRows", batchId, message]);
    },
    createHttpError,
    getBatchRow: async (batchId) => {
      calls.push(["getBatch", batchId]);
      return { id: batchId, status: "running" };
    },
    markBatchCancelRequested: async (batchId, message) => {
      calls.push(["markBatch", batchId, message]);
    },
    refreshPdfGenerationBatch: async (batchId) => {
      calls.push(["refreshBatch", batchId]);
      return {
        batchId,
        failedCount: 3,
        status: "failed",
        succeededCount: 1,
        totalRequested: 4,
      };
    },
    writeAuditLog: async (entry) => {
      calls.push(["audit", entry]);
    },
  });

  const result = await service.cancelPdfGenerationBatch("batch-1");

  assert.equal(result.status, "failed");
  assert.deepEqual(calls.slice(0, 4), [
    ["getBatch", "batch-1"],
    ["markBatch", "batch-1", pdfGenerationCancelMessage],
    ["cancelRows", "batch-1", pdfGenerationCancelMessage],
    ["refreshBatch", "batch-1"],
  ]);
  assert.equal(calls[4][0], "audit");
  assert.equal(calls[4][1].action, "pdf_generation_batch_cancelled");
  assert.deepEqual(calls[4][1].metadata, {
    failedCount: 3,
    succeededCount: 1,
    totalRequested: 4,
  });
});

test("cancelPdfGenerationBatch only refreshes already terminal batches", async () => {
  const calls = [];
  const service = createPdfGenerationBatchCancelService({
    cancelBatchGenerationRows: async () => {
      calls.push(["cancelRows"]);
    },
    createHttpError,
    getBatchRow: async (batchId) => {
      calls.push(["getBatch", batchId]);
      return { id: batchId, status: "completed" };
    },
    markBatchCancelRequested: async () => {
      calls.push(["markBatch"]);
    },
    refreshPdfGenerationBatch: async (batchId) => {
      calls.push(["refreshBatch", batchId]);
      return { batchId, status: "completed" };
    },
    writeAuditLog: async () => {
      calls.push(["audit"]);
    },
  });

  const result = await service.cancelPdfGenerationBatch("batch-2");

  assert.equal(result.status, "completed");
  assert.deepEqual(calls, [
    ["getBatch", "batch-2"],
    ["refreshBatch", "batch-2"],
  ]);
});
