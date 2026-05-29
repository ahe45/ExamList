const path = require("path");
const { createCandidatePhotoArchiveService } = require("./photo-archive-service");
const { createCandidatePhotoFileStorage } = require("./photo-file-storage");
const { createCandidatePhotoParser } = require("./photo-parser");
const { createCandidatePhotoRecordService } = require("./photo-record-service");
const { createCandidatePhotoArchiveSessionStore } = require("./photo-archive-session-store");
const {
  resolveSchoolStorageRoot,
  resolveStorageBaseRoot,
} = require("../storage-paths");

function createCandidatePhotoService({
  createHttpError,
  getSchoolById = null,
  getPool,
  query,
  rootDir = process.cwd(),
}) {
  const photoArchiveSessionTtlMinutes = Number(process.env.EXAMLIST_PHOTO_ARCHIVE_SESSION_TTL_MINUTES) || 30;
  const schoolStorageCodeCache = new Map();
  const legacyPhotoArchiveSessionDirectoryPath = path.join(
    resolveStorageBaseRoot(path, rootDir),
    "tmp",
    "candidate-photo-archives",
  );
  const photoArchiveSessionStore = createCandidatePhotoArchiveSessionStore({
    createHttpError,
    directoryPath: legacyPhotoArchiveSessionDirectoryPath,
    resolveDirectoryPath: ({ schoolStorageCode } = {}) => {
      const normalizedSchoolStorageCode = String(schoolStorageCode || "").trim();

      return normalizedSchoolStorageCode
        ? path.join(resolveSchoolStorageRoot(path, rootDir, normalizedSchoolStorageCode), "tmp", "candidate-photo-archives")
        : legacyPhotoArchiveSessionDirectoryPath;
    },
    ttlMs: photoArchiveSessionTtlMinutes * 60 * 1000,
  });
  const photoStorage = createCandidatePhotoFileStorage({
    createHttpError,
    rootDir,
  });
  const photoParser = createCandidatePhotoParser({
    createHttpError,
    getCandidatePhotoMimeType: photoStorage.getCandidatePhotoMimeType,
  });
  const photoArchiveService = createCandidatePhotoArchiveService({
    buildStoredCandidatePhotoFileRecord: photoStorage.buildStoredCandidatePhotoFileRecord,
    createHttpError,
    getPool,
    parseCandidatePhotoArchiveBuffer: photoParser.parseCandidatePhotoArchiveBuffer,
    parseCandidatePhotoArchivePreviewBuffer: photoParser.parseCandidatePhotoArchivePreviewBuffer,
    photoArchiveSessionStore,
    persistStoredCandidatePhotoFile: photoStorage.persistStoredCandidatePhotoFile,
    query,
    resolveSchoolStorageCode,
  });
  const photoRecordService = createCandidatePhotoRecordService({
    buildStoredCandidatePhotoFileRecord: photoStorage.buildStoredCandidatePhotoFileRecord,
    createHttpError,
    parseCandidatePhotoFile: photoParser.parseCandidatePhotoFile,
    persistStoredCandidatePhotoFile: photoStorage.persistStoredCandidatePhotoFile,
    query,
    readStoredCandidatePhotoFile: photoStorage.readStoredCandidatePhotoFile,
    resolveSchoolStorageCode,
  });

  async function resolveSchoolStorageCode(schoolId = "") {
    const normalizedSchoolId = String(schoolId || "").trim() || "school-default";

    if (!schoolStorageCodeCache.has(normalizedSchoolId)) {
      schoolStorageCodeCache.set(
        normalizedSchoolId,
        (async () => {
          if (typeof getSchoolById === "function") {
            const school = await getSchoolById(normalizedSchoolId).catch(() => null);
            const schoolCode = String(school?.code || "").trim();

            if (schoolCode) {
              return schoolCode;
            }
          }

          return normalizedSchoolId;
        })(),
      );
    }

    return schoolStorageCodeCache.get(normalizedSchoolId);
  }

  function resolveCandidateExamineeNo(candidate = {}) {
    return String(candidate.examineeNo || candidate.examNo || "").trim();
  }

  function resolveCandidatePhotoName(candidate = {}) {
    return String(candidate.photoName || candidate.photoFileId || "").trim();
  }

  function shouldHydrateCandidatePhoto(candidate = {}) {
    return Boolean(candidate?.hasPhoto || resolveCandidatePhotoName(candidate));
  }

  function createPhotoDataUrl(storedPhoto = null) {
    if (!storedPhoto?.photoBlob || !Buffer.isBuffer(storedPhoto.photoBlob)) {
      return "";
    }

    const mimeType = String(storedPhoto.photoMime || "image/jpeg").trim() || "image/jpeg";

    return `data:${mimeType};base64,${storedPhoto.photoBlob.toString("base64")}`;
  }

  async function hydrateCandidateWithPhoto(candidate = {}) {
    if (!shouldHydrateCandidatePhoto(candidate)) {
      return candidate;
    }

    const examineeNo = resolveCandidateExamineeNo(candidate);
    const schoolStorageCode = await resolveSchoolStorageCode(candidate.schoolId);

    if (!examineeNo) {
      return candidate;
    }

    const storedPhoto = await photoStorage.readStoredCandidatePhotoFile(
      examineeNo,
      resolveCandidatePhotoName(candidate),
      { schoolStorageCode },
    );
    const photoUrl = createPhotoDataUrl(storedPhoto);

    if (!photoUrl) {
      return candidate;
    }

    return {
      ...candidate,
      hasPhoto: true,
      photoFileId: String(storedPhoto.photoName || candidate.photoFileId || candidate.photoName || ""),
      photoMime: String(storedPhoto.photoMime || candidate.photoMime || ""),
      photoName: String(storedPhoto.photoName || candidate.photoName || candidate.photoFileId || ""),
      photoUrl,
    };
  }

  async function hydrateCandidatesWithPhotos(candidates = []) {
    if (!Array.isArray(candidates) || !candidates.length) {
      return Array.isArray(candidates) ? candidates : [];
    }

    return Promise.all(candidates.map((candidate) => hydrateCandidateWithPhoto(candidate)));
  }

  return Object.freeze({
    getCandidatePhoto: photoRecordService.getCandidatePhoto,
    hydrateCandidatesWithPhotos,
    previewCandidatePhotoArchiveBuffer: photoArchiveService.previewCandidatePhotoArchiveBuffer,
    saveCandidatePhoto: photoRecordService.saveCandidatePhoto,
    saveCandidatePhotoArchiveBuffer: photoArchiveService.saveCandidatePhotoArchiveBuffer,
    saveCandidatePhotoArchiveSession: photoArchiveService.saveCandidatePhotoArchiveSession,
  });
}

module.exports = {
  createCandidatePhotoService,
};
