const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidatePhotoArchiveService } = require("./photo-archive-service");

test("previewCandidatePhotoArchiveBuffer returns UI-compatible photo summary counts", async () => {
  const service = createCandidatePhotoArchiveService({
    buildStoredCandidatePhotoFileRecord: (photo) => photo,
    getPool: () => ({ getConnection: async () => null }),
    parseCandidatePhotoArchiveBuffer: () => ({}),
    parseCandidatePhotoArchivePreviewBuffer: () => ({
      duplicateEntries: 1,
      photos: [
        { examineeNo: "260100001" },
        { examineeNo: "260100002" },
        { examineeNo: "260100003" },
      ],
      skippedEntries: 2,
      totalEntries: 6,
    }),
    persistStoredCandidatePhotoFile: async () => null,
    query: async () => [
      { examineeNo: "260100001" },
      { examineeNo: "260100003" },
    ],
  });

  const result = await service.previewCandidatePhotoArchiveBuffer(Buffer.from("zip"));

  assert.equal(result.uploadableCount, 2);
  assert.equal(result.estimatedUploadCount, 2);
  assert.equal(result.skippedCount, 3);
  assert.equal(result.estimatedSkipCount, 4);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.duplicateEntryCount, 1);
  assert.equal(result.invalidEntryCount, 2);
  assert.equal(result.unmatchedCount, 1);
  assert.equal(result.totalEntries, 6);
});

test("previewCandidatePhotoArchiveBuffer stores reusable upload session token", async () => {
  let storedBuffer = null;
  const service = createCandidatePhotoArchiveService({
    buildStoredCandidatePhotoFileRecord: (photo) => photo,
    getPool: () => ({ getConnection: async () => null }),
    parseCandidatePhotoArchiveBuffer: () => ({}),
    parseCandidatePhotoArchivePreviewBuffer: () => ({
      photos: [{ examineeNo: "260100001" }],
      totalEntries: 1,
    }),
    persistStoredCandidatePhotoFile: async () => null,
    photoArchiveSessionStore: {
      createSession: async (fileBuffer) => {
        storedBuffer = fileBuffer;
        return {
          expiresAt: "2026-05-29T00:00:00.000Z",
          fileSize: fileBuffer.length,
          token: "session-token",
        };
      },
    },
    query: async () => [{ examineeNo: "260100001" }],
  });

  const result = await service.previewCandidatePhotoArchiveBuffer(Buffer.from("zip"));

  assert.equal(storedBuffer.toString("utf8"), "zip");
  assert.equal(result.previewToken, "session-token");
  assert.equal(result.previewFileSize, 3);
  assert.equal(result.uploadableCount, 1);
});

test("saveCandidatePhotoArchiveSession reuses preview ZIP without binary reupload", async () => {
  const persisted = [];
  const updates = [];
  let deletedToken = "";
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    query: async (sql, params) => {
      updates.push({ params, sql });
    },
    release: () => {},
    rollback: async () => {},
  };
  const service = createCandidatePhotoArchiveService({
    buildStoredCandidatePhotoFileRecord: (photo) => ({
      fileBuffer: photo.fileBuffer,
      fileName: `${photo.examineeNo}.jpg`,
      filePath: `/tmp/${photo.examineeNo}.jpg`,
      mimeType: "image/jpeg",
    }),
    getPool: () => ({ getConnection: async () => connection }),
    parseCandidatePhotoArchiveBuffer: (fileBuffer) => ({
      photos: [{ examineeNo: "260100001", fileBuffer }],
      totalEntries: 1,
    }),
    persistStoredCandidatePhotoFile: async (photo) => {
      persisted.push(photo);
    },
    photoArchiveSessionStore: {
      deleteSession: async (token) => {
        deletedToken = token;
      },
      readSessionBuffer: async (token) => {
        assert.equal(token, "session-token");
        return Buffer.from("zip-from-session");
      },
    },
    query: async () => [
      { examineeNo: "260100001", id: "candidate-1" },
      { examineeNo: "260100001", id: "candidate-2" },
    ],
  });

  const result = await service.saveCandidatePhotoArchiveSession("session-token");

  assert.equal(result.photoUploaded, 1);
  assert.equal(result.photoSkipped, 0);
  assert.equal(persisted[0].fileBuffer.toString("utf8"), "zip-from-session");
  assert.deepEqual(updates[0].params, ["candidate-1", "260100001.jpg", "image/jpeg", "candidate-2", "260100001.jpg", "image/jpeg"]);
  assert.equal(deletedToken, "session-token");
});

test("photo uploads batch database updates and preserve all candidate mappings", async () => {
  const photos = Array.from({ length: 451 }, (_, index) => ({ examineeNo: String(index), fileBuffer: Buffer.from("photo") }));
  const updates = [];
  let active = 0, maximum = 0, committed = false, released = false;
  const service = createCandidatePhotoArchiveService({
    parseCandidatePhotoArchiveBuffer: () => ({ photos, skippedEntries: 2, duplicateEntries: 1 }),
    query: async () => photos.flatMap(photo => [
      { id: `a-${photo.examineeNo}`, examineeNo: photo.examineeNo, schoolId: "school" },
      { id: `b-${photo.examineeNo}`, examineeNo: photo.examineeNo, schoolId: "school" },
    ]),
    buildStoredCandidatePhotoFileRecord: photo => ({ ...photo, fileName: `${photo.examineeNo}.jpg`, mimeType: "image/jpeg" }),
    persistStoredCandidatePhotoFile: async () => {
      maximum = Math.max(maximum, ++active);
      await new Promise(setImmediate);
      active--;
    },
    getPool: () => ({ getConnection: async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => { updates.push(params); },
      commit: async () => { committed = true; },
      rollback: async () => { throw Error("Unexpected rollback"); },
      release: () => { released = true; },
    }) }),
  });
  const result = await service.saveCandidatePhotoArchiveBuffer(Buffer.from("zip"));
  assert.equal(result.photoUploaded, 451);
  assert.equal(result.photoSkipped, 3);
  assert.equal(maximum, 4);
  assert.equal(updates.length, 5);
  assert.equal(updates.flat().length, 902 * 3);
  assert.ok(updates.every(params => params.length <= 600));
  assert.equal(committed && released, true);
});

test("failed photo writes settle before rollback and release the connection", async () => {
  let active = 0, rolledBack = false, released = false;
  const service = createCandidatePhotoArchiveService({
    parseCandidatePhotoArchiveBuffer: () => ({ photos: ["a", "b"].map(examineeNo => ({ examineeNo })) }),
    query: async () => ["a", "b"].map(id => ({ id, examineeNo: id })),
    buildStoredCandidatePhotoFileRecord: photo => photo,
    persistStoredCandidatePhotoFile: async photo => {
      active++;
      await new Promise(setImmediate);
      active--;
      if (photo.examineeNo === "a") throw Error("disk full");
    },
    getPool: () => ({ getConnection: async () => ({
      beginTransaction: async () => {},
      query: async () => { throw Error("Unexpected database update"); },
      commit: async () => { throw Error("Unexpected commit"); },
      rollback: async () => { assert.equal(active, 0); rolledBack = true; },
      release: () => { released = true; },
    }) }),
  });
  await assert.rejects(service.saveCandidatePhotoArchiveBuffer(Buffer.from("zip")), /disk full/);
  assert.equal(rolledBack && released, true);
});
