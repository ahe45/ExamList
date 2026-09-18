const test = require("node:test");
const assert = require("node:assert/strict");
const { createOperationService } = require("./service");
function harness() {
  const rows = new Map();
  const service = createOperationService({ query: async (sql, values = []) => {
    if (sql.startsWith("INSERT")) rows.set(values[0], { jobId: values[0], owner: values[1], status: "queued", processed: 0, total: 0 });
    else if (sql.startsWith("SELECT")) { const row = rows.get(values[0]); return row?.owner === values[1] ? [{ ...row }] : []; }
    else if (sql.includes("WHERE status IN")) for (const row of rows.values()) { if (["queued", "running"].includes(row.status)) { row.status = "failed"; row.errorMessage = values[0]; } }
    else if (sql.startsWith("UPDATE")) {
      const row = rows.get(values[values.length - 1]);
      if (sql.includes("status = 'completed'")) Object.assign(row, { status: "completed", resultJson: values[0], processed: row.total });
      else if (sql.includes("SET status = 'failed'")) Object.assign(row, { status: "failed", errorMessage: values[0] });
      else if (sql.includes("SET processed")) Object.assign(row, { processed: values[0], total: values[1] });
      else row.status = "running";
    }
    return [];
  } });
  return { service, rows };
}
async function terminal(service, id) {
  for (let i = 0; i < 100; i++) { const row = await service.get(id, "owner"); if (["failed", "completed"].includes(row.status)) return row; await new Promise(setImmediate); }
  throw new Error("job did not finish");
}
test("long operations return job IDs, report progress, serialize work, and survive prior job failures", async () => {
  const { service } = harness(); let release;
  const gate = new Promise(resolve => { release = resolve; }); const order = [];
  const first = await service.submit({ ownerId: "owner", kind: "test" }, async progress => { order.push(1); await progress({ processed: 1, total: 2 }); await gate; throw new Error("fixture failure"); });
  const second = await service.submit({ ownerId: "owner", kind: "test" }, async () => { order.push(2); return { processed: 3 }; });
  await new Promise(setImmediate);
  assert.equal((await service.get(first.jobId, "owner")).processed, 1);
  assert.equal((await service.get(second.jobId, "owner")).status, "queued");
  await assert.rejects(service.get(first.jobId, "other"), { statusCode: 404 });
  release();
  assert.equal((await terminal(service, first.jobId)).errorMessage, "fixture failure");
  assert.deepEqual((await terminal(service, second.jobId)).result, { processed: 3 }); assert.deepEqual(order, [1, 2]);
});
test("startup marks interrupted operations failed without reapplying data mutations", async () => {
  const { service, rows } = harness(); rows.set("old", { jobId: "old", owner: "owner", status: "running" });
  rows.set("done", { jobId: "done", owner: "owner", status: "completed", resultJson: '{"processed":1}' });
  await service.recover(); assert.equal((await service.get("old", "owner")).status, "failed");
  assert.equal((await service.get("done", "owner")).status, "completed");
});
