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
