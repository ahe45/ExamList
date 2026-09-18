const test = require("node:test");
const assert = require("node:assert/strict");
const { createRequestSnapshotStore } = require("./request-snapshot-store");
test("shared immutable snapshots preserve old layouts and compact hydrated retries", async () => {
  const templates = new Map();
  const store = createRequestSnapshotStore(async (sql, params) => {
    if (sql.startsWith("INSERT")) { templates.set(params[0], params[1]); return []; }
    return params[0].map(id => ({ id, templateJson: templates.get(id) }));
  });
  const request = { filters: { room: "101" }, template: { id: "same", layout: { pages: [{ html: "original" }], generation: { unit: "room" } } } };
  const compact = await store.compactRequestJson(JSON.stringify(request));
  const compact2 = await store.compactRequestJson(JSON.stringify({ ...request, filters: { room: "102" } }));
  assert.equal(templates.size, 1);
  assert.equal(JSON.parse(compact).template.layout.pages, undefined);
  assert.equal(JSON.parse(compact2).filters.room, "102");
  const [hydrated] = await store.hydrateRows([{ requestJson: compact }]);
  assert.deepEqual(JSON.parse(hydrated.requestJson).template, request.template);
  assert.equal(await store.compactRequestJson(hydrated.requestJson), compact);
  await store.compactRequestJson(JSON.stringify({ ...request, template: { ...request.template, layout: { pages: [{ html: "new" }] } } }));
  assert.equal(templates.size, 2);
  assert.deepEqual(JSON.parse((await store.hydrateRows([{ requestJson: compact }]))[0].requestJson).template, request.template);
  assert.deepEqual(await store.hydrateRows([{ requestJson: JSON.stringify(request) }]), [{ requestJson: JSON.stringify(request) }]);
});
test("missing shared snapshot fails rather than substituting today's template", async () => {
  const store = createRequestSnapshotStore(async () => []);
  await assert.rejects(store.hydrateRows([{ requestJson: JSON.stringify({ templateSnapshotId: "missing" }) }]), { errorCode: "PDF_SNAPSHOT_MISSING" });
});
