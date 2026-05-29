const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createCandidatePhotoArchiveSessionStore } = require("./photo-archive-session-store");

function createHttpError(statusCode, message, errorCode = "") {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

test("candidate photo archive session store writes and deletes preview ZIP sessions", async () => {
  const directoryPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-photo-session-"));
  const store = createCandidatePhotoArchiveSessionStore({
    createHttpError,
    directoryPath,
    ttlMs: 60 * 1000,
  });

  try {
    const session = await store.createSession(Buffer.from("zip"));
    const restoredBuffer = await store.readSessionBuffer(session.token);

    assert.match(session.token, /^[0-9a-f-]{36}$/i);
    assert.equal(restoredBuffer.toString("utf8"), "zip");

    await store.deleteSession(session.token);
    await assert.rejects(
      () => store.readSessionBuffer(session.token),
      /사진 ZIP 미리보기 세션이 만료되었습니다/,
    );
  } finally {
    await fs.promises.rm(directoryPath, { force: true, recursive: true });
  }
});

test("candidate photo archive session store cleans dynamic school directories in place", async () => {
  const rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-photo-session-dynamic-"));
  const defaultDirectoryPath = path.join(rootDir, "default");
  const store = createCandidatePhotoArchiveSessionStore({
    createHttpError,
    directoryPath: defaultDirectoryPath,
    resolveDirectoryPath: ({ schoolStorageCode } = {}) =>
      path.join(rootDir, String(schoolStorageCode || "default")),
    ttlMs: 60 * 1000,
  });
  const options = { schoolStorageCode: "SEOUL01" };

  try {
    const firstSession = await store.createSession(Buffer.from("first"), {}, options);
    await store.createSession(Buffer.from("second"), {}, options);
    const restoredBuffer = await store.readSessionBuffer(firstSession.token, options);

    assert.equal(restoredBuffer.toString("utf8"), "first");
    assert.equal(
      fs.existsSync(path.join(rootDir, "SEOUL01", `${firstSession.token}.json`)),
      true,
    );
  } finally {
    await fs.promises.rm(rootDir, { force: true, recursive: true });
  }
});
