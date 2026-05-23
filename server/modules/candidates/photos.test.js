const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createCandidatePhotoService } = require("./photos");

function createHttpError(statusCode, message, errorCode = "") {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

async function withTempRoot(callback) {
  const rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-candidate-photos-"));

  try {
    return await callback(rootDir);
  } finally {
    await fs.promises.rm(rootDir, { force: true, recursive: true });
  }
}

function createService(rootDir) {
  return createCandidatePhotoService({
    createHttpError,
    getPool() {
      throw new Error("getPool should not be used while hydrating photos");
    },
    query() {
      throw new Error("query should not be used while hydrating photos");
    },
    rootDir,
  });
}

test("hydrateCandidatesWithPhotos fills candidate photo data urls from storage", async () => {
  await withTempRoot(async (rootDir) => {
    const photoDir = path.join(rootDir, "storage", "candidate-photos");
    const photoBytes = Buffer.from("fake-image");
    const service = createService(rootDir);

    await fs.promises.mkdir(photoDir, { recursive: true });
    await fs.promises.writeFile(path.join(photoDir, "260100001.png"), photoBytes);

    const [candidate] = await service.hydrateCandidatesWithPhotos([
      {
        examineeNo: "260100001",
        hasPhoto: true,
        name: "홍길동",
        photoFileId: "260100001.png",
      },
    ]);

    assert.equal(candidate.photoFileId, "260100001.png");
    assert.equal(candidate.photoMime, "image/png");
    assert.equal(candidate.photoName, "260100001.png");
    assert.equal(candidate.photoUrl, `data:image/png;base64,${photoBytes.toString("base64")}`);
  });
});

test("hydrateCandidatesWithPhotos preserves candidates when stored photo is missing", async () => {
  await withTempRoot(async (rootDir) => {
    const service = createService(rootDir);
    const sourceCandidate = {
      examineeNo: "260100002",
      hasPhoto: true,
      photoFileId: "260100002.jpg",
    };
    const [candidate] = await service.hydrateCandidatesWithPhotos([sourceCandidate]);

    assert.equal(candidate, sourceCandidate);
  });
});
