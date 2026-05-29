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
    query: async () => [{ examineeNo: "260100001", id: "candidate-1" }],
  });

  const result = await service.saveCandidatePhotoArchiveSession("session-token");

  assert.equal(result.photoUploaded, 1);
  assert.equal(result.photoSkipped, 0);
  assert.equal(persisted[0].fileBuffer.toString("utf8"), "zip-from-session");
  assert.deepEqual(updates[0].params, ["260100001.jpg", "image/jpeg", "candidate-1"]);
  assert.equal(deletedToken, "session-token");
});
