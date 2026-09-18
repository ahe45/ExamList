const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfGenerationRepository } = require("./repository");

test("batch status reads exclude large request snapshots", async () => {
  const repository = createPdfGenerationRepository({ query: async (sql, params) => {
    assert.equal(sql, "SELECT status FROM pdf_generation_histories WHERE batch_id = ?");
    assert.deepEqual(params, ["batch-1"]);
    return [{ status: "running" }];
  }});
  assert.deepEqual(await repository.getBatchGenerationRows("batch-1", { statusOnly: true }), [{ status: "running" }]);
});

test("getBatchRow calculates elapsed seconds with the database clock", async () => {
  const queries = [];
  const repository = createPdfGenerationRepository({
    query: async (sql, params) => {
      queries.push({ params, sql });
      return [{ elapsedSeconds: 17, id: "batch-1" }];
    },
  });

  const row = await repository.getBatchRow("batch-1");

  assert.equal(row.elapsedSeconds, 17);
  assert.deepEqual(queries[0].params, ["batch-1"]);
  assert.match(queries[0].sql, /TIMESTAMPDIFF\(SECOND, created_at, COALESCE\(completed_at, CURRENT_TIMESTAMP\)\)/);
});
