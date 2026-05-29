const path = require("path");
const { createCandidatePhotoArchiveService } = require("./photo-archive-service");
const { createCandidatePhotoFileStorage } = require("./photo-file-storage");
const { createCandidatePhotoParser } = require("./photo-parser");
const { createCandidatePhotoRecordService } = require("./photo-record-service");
const { createCandidatePhotoArchiveSessionStore } = require("./photo-archive-session-store");

function createCandidatePhotoService({
  createHttpError,
  getPool,
  photoStorageDirName = "storage/candidate-photos",
  query,
  rootDir = process.cwd(),
}) {
  const photoStorageDirectoryPath = path.join(rootDir, photoStorageDirName);
  const photoArchiveSessionTtlMinutes = Number(process.env.EXAMLIST_PHOTO_ARCHIVE_SESSION_TTL_MINUTES) || 30;
  const photoArchiveSessionStore = createCandidatePhotoArchiveSessionStore({
    createHttpError,
    directoryPath: path.join(rootDir, "storage", "tmp", "candidate-photo-archives"),
    ttlMs: photoArchiveSessionTtlMinutes * 60 * 1000,
  });
  const photoStorage = createCandidatePhotoFileStorage({
    createHttpError,
    photoStorageDirectoryPath,
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
  });
  const photoRecordService = createCandidatePhotoRecordService({
    buildStoredCandidatePhotoFileRecord: photoStorage.buildStoredCandidatePhotoFileRecord,
    createHttpError,
    parseCandidatePhotoFile: photoParser.parseCandidatePhotoFile,
    persistStoredCandidatePhotoFile: photoStorage.persistStoredCandidatePhotoFile,
    query,
    readStoredCandidatePhotoFile: photoStorage.readStoredCandidatePhotoFile,
  });

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

    if (!examineeNo) {
      return candidate;
    }

    const storedPhoto = await photoStorage.readStoredCandidatePhotoFile(
      examineeNo,
      resolveCandidatePhotoName(candidate),
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
