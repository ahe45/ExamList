const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createWorkbookSessionStore } = require("./workbook-session-store");
const { createCandidateImportService } = require("./import-service");
test("workbook sessions bind school and owner, expire, and reject path traversal", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-workbook-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = createWorkbookSessionStore(root);
  const token = await store.put([{ name: "test" }], "school", "owner");
  assert.deepEqual(await store.get(token, "school", "owner"), [{ name: "test" }]);
  await assert.rejects(store.get(token, "other", "owner"), { statusCode: 400 });
  await assert.rejects(store.get(token, "school", "other"), { statusCode: 400 });
  await assert.rejects(store.get("../file", "school", "owner"), { statusCode: 400 });
  const file = path.join(root, "storage", "upload-sessions", "workbooks", token + ".json");
  const data = JSON.parse(await fs.readFile(file)); data.expiresAt = 1; await fs.writeFile(file, JSON.stringify(data));
  await assert.rejects(store.get(token, "school", "owner"), { statusCode: 400 });
  await store.remove(token); await assert.rejects(fs.access(file));
});
test("final workbook save reuses parsed rows but compares against current database and reports progress", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-import-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let parses = 0, existing = [], written = [], committed = false;
  const row = { examineeNo: "1", periodCode: "P1", name: "updated" };
  const service = createCandidateImportService({ rootDir: root,
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { statusCode, errorCode }),
    getPool: () => ({ getConnection: async () => ({ beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => {}, release() {} }) }),
    normalizeCandidateWorkbookInput: row => row, parseCandidateWorkbook: async () => { parses++; return [row]; },
    query: async () => existing, resolveSchoolId: async id => id, toCandidateWorkbookRow: row => row,
    upsertCandidateWorkbookRows: async rows => { written.push(...rows); },
  });
  const preview = await service.previewCandidateImport({ fileContentBase64: "fixture", schoolId: "school", ownerId: "owner" });
  assert.equal(preview.insertCount, 1);
  existing = [{ ...row, id: "already-added" }];
  await assert.rejects(service.importCandidates({ previewToken: preview.previewToken, schoolId: "school", ownerId: "owner" }), { errorCode: "CANDIDATE_IMPORT_NOTHING_SELECTED" });
  existing[0].name = "old";
  const progress = [];
  assert.deepEqual(await service.importCandidates({ previewToken: preview.previewToken, schoolId: "school", ownerId: "owner", onProgress: value => progress.push(value) }), { processed: 1 });
  assert.equal(parses, 1); assert.equal(committed, true); assert.deepEqual(written, [row]); assert.deepEqual(progress, [{ processed: 1, total: 1 }]);
  await assert.rejects(service.importCandidates({ previewToken: preview.previewToken, schoolId: "school", ownerId: "owner" }), { statusCode: 400 });
});
