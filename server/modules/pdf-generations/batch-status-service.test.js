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
    "",
    true,
    "batch-1",
  ]);
  assert.deepEqual(auditLogs.map((entry) => entry.action), ["pdf_generation_batch_completed"]);
});
