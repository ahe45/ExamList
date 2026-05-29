const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const defaultSessionTtlMs = 30 * 60 * 1000;
const sessionTokenPattern = /^[0-9a-f-]{36}$/i;

function createStoreError(createHttpError, statusCode, message, errorCode) {
  if (typeof createHttpError === "function") {
    return createHttpError(statusCode, message, errorCode);
  }

  return Object.assign(new Error(message), { errorCode, statusCode });
}

function normalizeSessionTtlMs(value) {
  const normalizedValue = Number(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return defaultSessionTtlMs;
  }

  return Math.min(Math.max(Math.floor(normalizedValue), 60 * 1000), 24 * 60 * 60 * 1000);
}

function normalizeSessionToken(token = "") {
  const normalizedToken = String(token || "").trim();

  return sessionTokenPattern.test(normalizedToken) ? normalizedToken : "";
}

function createCandidatePhotoArchiveSessionStore({
  createHttpError,
  directoryPath,
  resolveDirectoryPath = null,
  ttlMs = defaultSessionTtlMs,
} = {}) {
  const sessionDirectoryPath = String(directoryPath || "").trim();
  const sessionTtlMs = normalizeSessionTtlMs(ttlMs);

  function createError(statusCode, message, errorCode) {
    return createStoreError(createHttpError, statusCode, message, errorCode);
  }

  function getSessionDirectoryPath(options = {}) {
    if (typeof resolveDirectoryPath === "function") {
      return String(resolveDirectoryPath(options) || "").trim();
    }

    return sessionDirectoryPath;
  }

  function assertSessionDirectory(options = {}) {
    const directoryPath = getSessionDirectoryPath(options);

    if (!directoryPath) {
      throw createError(500, "사진 ZIP 임시 저장소를 사용할 수 없습니다.", "CANDIDATE_PHOTO_ARCHIVE_SESSION_STORE_UNAVAILABLE");
    }

    return directoryPath;
  }

  function getSessionPaths(token, options = {}) {
    const normalizedToken = normalizeSessionToken(token);

    if (!normalizedToken) {
      throw createError(400, "사진 ZIP 미리보기 세션이 올바르지 않습니다.", "CANDIDATE_PHOTO_ARCHIVE_SESSION_INVALID");
    }

    const directoryPath = assertSessionDirectory(options);

    return {
      archivePath: path.join(directoryPath, `${normalizedToken}.zip`),
      directoryPath,
      metadataPath: path.join(directoryPath, `${normalizedToken}.json`),
      token: normalizedToken,
    };
  }

  async function deleteSession(token, options = {}) {
    if (!getSessionDirectoryPath(options)) {
      return false;
    }

    const { archivePath, metadataPath } = getSessionPaths(token, options);

    await Promise.all(
      [archivePath, metadataPath].map((targetPath) =>
        fs.promises.rm(targetPath, { force: true }).catch(() => {}),
      ),
    );
    return true;
  }

  async function cleanupExpiredSessions(now = Date.now(), options = {}) {
    const directoryPath = getSessionDirectoryPath(options);

    if (!directoryPath) {
      return 0;
    }

    let entries = [];

    try {
      entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return 0;
      }

      throw error;
    }

    let deletedCount = 0;

    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const token = path.basename(entry.name, ".json");

          if (!normalizeSessionToken(token)) {
            return;
          }

          try {
            const metadata = JSON.parse(
              await fs.promises.readFile(path.join(directoryPath, entry.name), "utf8"),
            );
            const expiresAtMs = Date.parse(metadata.expiresAt || "");

            if (Number.isFinite(expiresAtMs) && expiresAtMs > now) {
              return;
            }
          } catch (_error) {
            // Corrupt metadata cannot be trusted, so remove the paired files.
          }

          await deleteSession(token, options);
          deletedCount += 1;
        }),
    );

    return deletedCount;
  }

  async function createSession(fileBuffer, metadata = {}, options = {}) {
    const directoryPath = assertSessionDirectory(options);

    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw createError(400, "사진 ZIP 파일 데이터가 없습니다.", "CANDIDATE_PHOTO_ARCHIVE_EMPTY");
    }

    await fs.promises.mkdir(directoryPath, { recursive: true });
    await cleanupExpiredSessions(Date.now(), options);

    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = new Date(now + sessionTtlMs).toISOString();
    const { archivePath, metadataPath } = getSessionPaths(token, options);
    const sessionMetadata = {
      createdAt: new Date(now).toISOString(),
      expiresAt,
      fileSize: fileBuffer.length,
      token,
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    };

    await fs.promises.writeFile(archivePath, fileBuffer);
    await fs.promises.writeFile(metadataPath, JSON.stringify(sessionMetadata, null, 2));

    return {
      expiresAt,
      fileSize: fileBuffer.length,
      token,
    };
  }

  async function readSessionBuffer(token, options = {}) {
    assertSessionDirectory(options);

    const { archivePath, metadataPath } = getSessionPaths(token, options);
    let metadata = null;

    try {
      metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf8"));
    } catch (_error) {
      throw createError(410, "사진 ZIP 미리보기 세션이 만료되었습니다. ZIP 파일을 다시 선택해 주세요.", "CANDIDATE_PHOTO_ARCHIVE_SESSION_EXPIRED");
    }

    const expiresAtMs = Date.parse(metadata.expiresAt || "");

    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      await deleteSession(token, options);
      throw createError(410, "사진 ZIP 미리보기 세션이 만료되었습니다. ZIP 파일을 다시 선택해 주세요.", "CANDIDATE_PHOTO_ARCHIVE_SESSION_EXPIRED");
    }

    try {
      return await fs.promises.readFile(archivePath);
    } catch (_error) {
      await deleteSession(token, options);
      throw createError(410, "사진 ZIP 미리보기 세션이 만료되었습니다. ZIP 파일을 다시 선택해 주세요.", "CANDIDATE_PHOTO_ARCHIVE_SESSION_EXPIRED");
    }
  }

  return Object.freeze({
    cleanupExpiredSessions,
    createSession,
    deleteSession,
    readSessionBuffer,
  });
}

module.exports = {
  createCandidatePhotoArchiveSessionStore,
};
