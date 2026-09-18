const test = require("node:test");
const assert = require("node:assert/strict");
const { mapWithConcurrency } = require("./concurrency");

test("bounded work preserves order and waits for active tasks before rejecting", async () => {
  let active = 0;
  let maximum = 0;
  const values = await mapWithConcurrency([3, 2, 1, 0], 2, async (value) => {
    maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setTimeout(resolve, value));
    active--;
    return value * 2;
  });
  assert.deepEqual(values, [6, 4, 2, 0]);
  assert.equal(maximum, 2);
  let finished = false;
  await assert.rejects(mapWithConcurrency([0, 1, 2], 2, async value => {
    if (value === 0) throw Error("failed");
    await new Promise(setImmediate);
    finished = true;
  }), /failed/);
  assert.equal(finished, true);
});
