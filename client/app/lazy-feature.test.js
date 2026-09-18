import test from "node:test";
import assert from "node:assert/strict";
import { createLazyActions } from "./lazy-feature.js";

test("lazy action guards stay synchronous and initialization runs once", async () => {
  let count = 0;
  const actions = createLazyActions(async () => { count += 1; return { isDirty: () => true, clear: value => value }; });
  const guard = actions.isDirty;
  assert.equal(guard(), undefined);
  assert.equal(count, 0);
  await Promise.all([actions.load(), actions.load()]);
  assert.equal(count, 1);
  assert.equal(guard(), true);
  assert.equal(actions.clear("saved"), "saved");
});

test("failed lazy initialization can retry", async () => {
  let attempts = 0;
  const actions = createLazyActions(async () => { if (++attempts === 1) throw new Error("network"); return { ready: () => true }; });
  await assert.rejects(actions.load(), /network/);
  await actions.load();
  assert.equal(actions.ready(), true);
});
