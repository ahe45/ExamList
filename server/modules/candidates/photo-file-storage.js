const fs = require("fs");
const path = require("path");

const {
  resolveLegacyCandidatePhotoDirectoryPath,
  resolveSchoolCandidatePhotoDirectoryPath,
} = require("../storage-paths");

function createUniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function createCandidatePhotoFileStorage({
  createHttpError,
  photoStorageDirectoryPath = "",
  rootDir = process.cwd(),
}) {
  const legacyPhotoStorageDirectoryPath =
    photoStorageDirectoryPath || resolveLegacyCandidatePhotoDirectoryPath(path, rootDir);

  function resolvePhotoStorageDirectoryPath(options = {}) {
    const schoolStorageCode = String(options.schoolStorageCode || options.schoolCode || "").trim();

    return schoolStorageCode
      ? resolveSchoolCandidatePhotoDirectoryPath(path, rootDir, schoolStorageCode)
      : legacyPhotoStorageDirectoryPath;
  }

  function getCandidatePhotoMimeType(extension) {
    if (extension === ".jpg" || extension === ".jpeg") {
      return "image/jpeg";
    }

    if (extension === ".png") {
      return "image/png";
    }

    return "";
  }

  function resolveStoredCandidatePhotoExtension({ fileName = "", mimeType = "" } = {}) {
    const normalizedFileName = path.basename(String(fileName || "").trim());
    const normalizedMimeType = String(mimeType || "").trim().toLowerCase();
    const fileExtension = path.extname(normalizedFileName).toLowerCase();

    if (fileExtension === ".jpg" || fileExtension === ".jpeg" || fileExtension === ".png") {
      return fileExtension;
    }

    if (normalizedMimeType === "image/png") {
      return ".png";
    }

    if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") {
      return ".jpg";
    }

    return ".jpg";
  }

  function buildStoredCandidatePhotoFileRecord(photo = {}, options = {}) {
    const normalizedExamineeNo = String(photo.examineeNo || "").trim();
    const fileBuffer = Buffer.isBuffer(photo.fileBuffer) ? photo.fileBuffer : null;
    const photoStorageDirectoryPath = resolvePhotoStorageDirectoryPath({
      schoolStorageCode: options.schoolStorageCode || photo.schoolStorageCode || photo.schoolCode,
    });

    if (!normalizedExamineeNo) {
      throw createHttpError(400, "수험번호가 필요합니다.", "CANDIDATE_PHOTO_EXAMINEE_NO_REQUIRED");
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw createHttpError(400, "사진 파일 데이터가 없습니다.", "CANDIDATE_PHOTO_FILE_EMPTY");
    }

    const extension = resolveStoredCandidatePhotoExtension(photo);
    const fileName = `${normalizedExamineeNo}${extension}`;

    return {
      examineeNo: normalizedExamineeNo,
      fileBuffer,
      fileName,
      filePath: path.join(photoStorageDirectoryPath, fileName),
      mimeType: getCandidatePhotoMimeType(extension) || String(photo.mimeType || "").trim() || "image/jpeg",
    };
  }

  async function persistStoredCandidatePhotoFile(storedPhotoRecord = null) {
    if (!storedPhotoRecord?.filePath || !Buffer.isBuffer(storedPhotoRecord.fileBuffer) || storedPhotoRecord.fileBuffer.length === 0) {
      return null;
    }

    const normalizedFilePath = String(storedPhotoRecord.filePath || "").trim();
    const parsedFilePath = path.parse(normalizedFilePath);

    await fs.promises.mkdir(parsedFilePath.dir, { recursive: true });
    await fs.promises.writeFile(normalizedFilePath, storedPhotoRecord.fileBuffer);

    await Promise.all(
      [".jpg", ".jpeg", ".png"]
        .filter((candidateExtension) => candidateExtension !== parsedFilePath.ext)
        .map(async (candidateExtension) => {
          const candidatePath = path.join(parsedFilePath.dir, `${parsedFilePath.name}${candidateExtension}`);

          try {
            await fs.promises.unlink(candidatePath);
          } catch (error) {
            if (error?.code !== "ENOENT") {
              throw error;
            }
          }
        }),
    );

    return storedPhotoRecord;
  }

  function getStoredCandidatePhotoCandidateFileNames(examineeNo, photoName = "") {
    const normalizedExamineeNo = String(examineeNo || "").trim();
    const normalizedPhotoName = path.basename(String(photoName || "").trim());

    return Array.from(
      new Set(
        [
          normalizedPhotoName,
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.jpeg` : "",
          normalizedExamineeNo ? `${normalizedExamineeNo}.png` : "",
        ].filter(Boolean),
      ),
    );
  }

  async function readStoredCandidatePhotoFile(examineeNo, photoName = "", options = {}) {
    const candidateFileNames = getStoredCandidatePhotoCandidateFileNames(examineeNo, photoName);
    const candidateDirectories = createUniqueList([
      resolvePhotoStorageDirectoryPath(options),
      legacyPhotoStorageDirectoryPath,
    ]);

    for (const candidateDirectoryPath of candidateDirectories) {
      for (const candidateFileName of candidateFileNames) {
        const normalizedCandidateFileName = path.basename(candidateFileName);
        const candidateFilePath = path.join(candidateDirectoryPath, normalizedCandidateFileName);

        try {
          const photoBlob = await fs.promises.readFile(candidateFilePath);

          if (Buffer.isBuffer(photoBlob) && photoBlob.length > 0) {
            const fileExtension = path.extname(normalizedCandidateFileName).toLowerCase();

            return {
              photoBlob,
              photoMime: getCandidatePhotoMimeType(fileExtension) || "application/octet-stream",
              photoName: normalizedCandidateFileName,
            };
          }
        } catch (error) {
          if (error?.code !== "ENOENT") {
            throw error;
          }
        }
      }
    }

    return null;
  }

  return Object.freeze({
    buildStoredCandidatePhotoFileRecord,
    getCandidatePhotoMimeType,
    persistStoredCandidatePhotoFile,
    readStoredCandidatePhotoFile,
  });
}

module.exports = {
  createCandidatePhotoFileStorage,
};
