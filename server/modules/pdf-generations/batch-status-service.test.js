const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfGenerationBatchStatusService } = require("./batch-status-service");

test("refreshPdfGenerationBatch does not create an automatic ZIP when a batch completes", async () => {
  const queries = [];
  const auditLogs = [];
  const batchRow = {
    archiveId: "",
    errorMessage: "",
    generationUnit: "room",
    id: "batch-1",
    templateName: "template",
    totalRequested: 1,
  };
  const generationRows = [
    {
      id: "generation-1",
      status: "completed",
    },
  ];

  const service = createPdfGenerationBatchStatusService({
    getBatchGenerationRows: async () => generationRows,
    getBatchRow: async () => batchRow,
    getPdfGenerationBatch: async () => ({ batchId: "batch-1" }),
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      return [];
    },
    writeAuditLog: async (entry) => {
      auditLogs.push(entry);
    },
  });

  const result = await service.refreshPdfGenerationBatch("batch-1");

  assert.deepEqual(result, { batchId: "batch-1" });
  assert.equal(queries.length, 1);
  assert.doesNotMatch(queries[0].sql, /archive_id/);
  assert.deepEqual(queries[0].params, [
    "completed",
    1,
    0,
    0,
    1,
    0,
    100,
    true,
    "batch-1",
  ]);
  assert.deepEqual(auditLogs.map((entry) => entry.action), ["pdf_generation_batch_completed"]);
});

test("concurrent completions serialize refreshes and write the completion log only once", async () => {
  const batchRow = { id: "batch-1", totalRequested: 2 };
  let activeReads = 0; let maxReads = 0; let logs = 0;
  const service = createPdfGenerationBatchStatusService({
    getBatchRow: async () => ({ ...batchRow }),
    getBatchGenerationRows: async (_id, options) => {
      assert.deepEqual(options, { statusOnly: true });
      maxReads = Math.max(maxReads, ++activeReads);
      await new Promise(resolve => setImmediate(resolve));
      activeReads--;
      return [{ status: "completed" }, { status: "completed" }];
    },
    getPdfGenerationBatch: async (_id, options) => {
      assert.deepEqual(options, { includeItems: false });
      return { batchId: "batch-1", status: "completed" };
    },
    query: async sql => {
      assert.doesNotMatch(sql, /error_message\s*=/); // Preserve an overlapping cancellation request.
      batchRow.completedAt = new Date();
    },
    writeAuditLog: async () => { logs++; },
  });
  await Promise.all([service.refreshPdfGenerationBatch("batch-1"), service.refreshPdfGenerationBatch("batch-1")]);
  assert.equal(maxReads, 1);
  assert.equal(logs, 1);
});
