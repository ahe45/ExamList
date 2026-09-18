const test = require("node:test");
const assert = require("node:assert/strict");
const { createPdfGenerationQueueHistoryStore } = require("./queue-history-store");
const { createPdfGenerationQueueRecoveryController } = require("./queue-recovery");

test("startup recovers every queued PDF beyond the first 100 jobs", async () => {
  const ids = Array.from({ length: 250 }, (_, index) => `generation-${index}`);
  let requeued = false;
  const store = createPdfGenerationQueueHistoryStore({
    query: async (sql, params) => {
      if (sql.includes("UPDATE")) { requeued = true; return {}; }
      assert.equal(requeued, true);
      assert.doesNotMatch(sql, /LIMIT/);
      assert.deepEqual(params, []);
      return ids.map(id => ({ id }));
    },
  });
  const scheduled = [];
  const controller = createPdfGenerationQueueRecoveryController({
    queueHistoryStore: store,
    scheduleQueuedGeneration: async id => { scheduled.push(id); },
    getBullQueueState: () => ({ queue: {} }),
  });
  const result = await controller.startPdfGenerationQueue();
  assert.equal(result.queuedCount, 250);
  assert.deepEqual(scheduled, ids);
});
