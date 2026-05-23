const AdmZip = require("adm-zip");
const path = require("path");

function createCandidatePhotoParser({ createHttpError, getCandidatePhotoMimeType }) {
  function parseCandidatePhotoFileName(fileName, { expectedExamineeNo = "" } = {}) {
    const normalizedFileName = path.basename(String(fileName || "").trim());

    if (!normalizedFileName) {
      throw createHttpError(400, "사진 파일 이름이 없습니다.", "CANDIDATE_PHOTO_NAME_EMPTY");
    }

    const extension = path.extname(normalizedFileName).toLowerCase();
    const mimeType = getCandidatePhotoMimeType(extension);

    if (!mimeType) {
      throw createHttpError(400, "사진 파일 형식은 JPG, JPEG, PNG만 지원합니다.", "CANDIDATE_PHOTO_TYPE_INVALID");
    }

    const derivedExamineeNo = path.basename(normalizedFileName, extension).trim();
    const normalizedExpectedExamineeNo = String(expectedExamineeNo || "").trim();
    const normalizedExamineeNo = normalizedExpectedExamineeNo || derivedExamineeNo;

    if (!normalizedExamineeNo) {
      throw createHttpError(400, "사진 파일명에서 수험번호를 확인할 수 없습니다.", "CANDIDATE_PHOTO_EXAMINEE_NO_REQUIRED");
    }

    if (normalizedExpectedExamineeNo && normalizedExpectedExamineeNo !== derivedExamineeNo) {
      throw createHttpError(400, "사진 파일명과 수험번호가 일치하지 않습니다.", "CANDIDATE_PHOTO_EXAMINEE_NO_MISMATCH");
    }

    return {
      examineeNo: normalizedExamineeNo,
      fileName: normalizedFileName,
      mimeType,
    };
  }

  function parseCandidatePhotoFile(fileName, fileBuffer, options = {}) {
    const photo = parseCandidatePhotoFileName(fileName, options);

    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw createHttpError(400, "사진 파일 데이터가 없습니다.", "CANDIDATE_PHOTO_FILE_EMPTY");
    }

    return {
      ...photo,
      fileBuffer,
    };
  }

  function parseCandidatePhotoArchiveBuffer(fileBuffer, { includeFileData = true } = {}) {
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw createHttpError(400, "사진 ZIP 파일 데이터가 없습니다.", "CANDIDATE_PHOTO_ARCHIVE_EMPTY");
    }

    let zip;

    try {
      zip = new AdmZip(fileBuffer);
    } catch (_error) {
      throw createHttpError(400, "사진 ZIP 파일을 해석할 수 없습니다.", "CANDIDATE_PHOTO_ARCHIVE_INVALID");
    }

    const candidatePhotos = new Map();
    let duplicateEntries = 0;
    let skippedEntries = 0;
    let totalEntries = 0;

    zip.getEntries().forEach((entry) => {
      if (entry.isDirectory) {
        return;
      }

      totalEntries += 1;

      try {
        const entryFileName = path.basename(String(entry.entryName || "").trim());
        const photo = includeFileData
          ? parseCandidatePhotoFile(entryFileName, entry.getData())
          : parseCandidatePhotoFileName(entryFileName);

        if (candidatePhotos.has(photo.examineeNo)) {
          duplicateEntries += 1;
        }

        candidatePhotos.set(photo.examineeNo, photo);
      } catch (_error) {
        skippedEntries += 1;
      }
    });

    if (candidatePhotos.size === 0) {
      throw createHttpError(
        400,
        "ZIP 파일에서 업로드 가능한 수험생 사진을 찾을 수 없습니다. 파일명은 수험번호.jpg, 수험번호.jpeg, 수험번호.png 형식이어야 합니다.",
        "CANDIDATE_PHOTO_ARCHIVE_NO_PHOTO",
      );
    }

    return {
      duplicateEntries,
      photos: Array.from(candidatePhotos.values()),
      skippedEntries,
      totalEntries,
    };
  }

  function parseCandidatePhotoArchivePreviewBuffer(fileBuffer) {
    return parseCandidatePhotoArchiveBuffer(fileBuffer, { includeFileData: false });
  }

  return Object.freeze({
    parseCandidatePhotoArchiveBuffer,
    parseCandidatePhotoArchivePreviewBuffer,
    parseCandidatePhotoFile,
    parseCandidatePhotoFileName,
  });
}

module.exports = {
  createCandidatePhotoParser,
};
