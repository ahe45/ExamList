const test = require("node:test");
const assert = require("node:assert/strict");
const { createPdfGenerationQueueService } = require("./queue-service");
const { resolveQueueConcurrency } = require("./queue-options");
const tick = () => new Promise(resolve => setImmediate(resolve));

function setupEnvironment(t, concurrency = "2") {
  const previous = { driver: process.env.PDF_QUEUE_DRIVER, concurrency: process.env.PDF_QUEUE_CONCURRENCY };
  process.env.PDF_QUEUE_DRIVER = "memory";
  process.env.PDF_QUEUE_CONCURRENCY = concurrency;
  t.after(() => {
    for (const [key, value] of [["PDF_QUEUE_DRIVER", previous.driver], ["PDF_QUEUE_CONCURRENCY", previous.concurrency]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

test("memory queue runs two jobs at a time and drains the remaining jobs", async t => {
  setupEnvironment(t);
  const started = []; const releases = new Map();
  const queue = createPdfGenerationQueueService({
    processQueuedPdfGeneration: id => { started.push(id); return new Promise(resolve => releases.set(id, resolve)); },
    writeAuditLog: async () => {},
  });
  for (const id of ["a", "a", "b", "c"]) await queue.scheduleQueuedGeneration(id);
  await tick();
  assert.deepEqual(started, ["a", "b"]);
  releases.get("a")(); await tick();
  assert.deepEqual(started, ["a", "b", "c"]);
  releases.get("b")(); releases.get("c")(); await tick();
});

test("a retry cannot overlap the same job's active attempt", async t => {
  setupEnvironment(t);
  let attempts = 0; let release;
  const queue = createPdfGenerationQueueService({
    processQueuedPdfGeneration: async id => {
      attempts++;
      if (attempts === 1) {
        await queue.scheduleQueuedGeneration(id);
        await new Promise(resolve => { release = resolve; });
      }
    },
    writeAuditLog: async () => {},
  });
  await queue.scheduleQueuedGeneration("a"); await tick(); await tick();
  assert.equal(attempts, 1);
  release(); await tick();
  assert.equal(attempts, 2);
});

test("a worker failure releases its slot even when error logging also fails", async t => {
  setupEnvironment(t, "1");
  const started = [];
  const queue = createPdfGenerationQueueService({
    processQueuedPdfGeneration: async id => { started.push(id); if (id === "a") throw new Error("failed"); },
    writeAuditLog: async () => { throw new Error("database unavailable"); },
  });
  await queue.scheduleQueuedGeneration("a"); await queue.scheduleQueuedGeneration("b");
  await tick(); await tick();
  assert.deepEqual(started, ["a", "b"]);
});

test("queue concurrency defaults to two and respects bounded explicit settings", t => {
  setupEnvironment(t);
  for (const [value, expected] of [["",2],["invalid",2],["0",2],["1",1],["3",3],["99",5]]) {
    process.env.PDF_QUEUE_CONCURRENCY = value;
    assert.equal(resolveQueueConcurrency(), expected);
  }
});
