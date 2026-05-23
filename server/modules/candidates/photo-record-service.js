function createCandidatePhotoRecordService({
  buildStoredCandidatePhotoFileRecord,
  createHttpError,
  parseCandidatePhotoFile,
  persistStoredCandidatePhotoFile,
  query,
  readStoredCandidatePhotoFile,
}) {
  async function saveCandidatePhoto(candidateId, payload = {}) {
    const normalizedCandidateId = String(candidateId || "").trim();

    if (!normalizedCandidateId) {
      throw createHttpError(400, "수험생 식별자가 필요합니다.", "CANDIDATE_ID_REQUIRED");
    }

    const [existingCandidate] = await query("SELECT id, examinee_no AS examineeNo FROM candidate_records WHERE id = ?", [normalizedCandidateId]);

    if (!existingCandidate) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.", "CANDIDATE_NOT_FOUND");
    }

    const fileContentBase64 = String(payload.fileContentBase64 || "").trim();

    if (!fileContentBase64) {
      throw createHttpError(400, "업로드할 사진 파일 데이터가 없습니다.", "CANDIDATE_PHOTO_FILE_EMPTY");
    }

    const photo = parseCandidatePhotoFile(payload.fileName, Buffer.from(fileContentBase64, "base64"), {
      expectedExamineeNo: existingCandidate.examineeNo,
    });
    const storedPhotoRecord = buildStoredCandidatePhotoFileRecord(photo);

    await persistStoredCandidatePhotoFile(storedPhotoRecord);
    await query(
      `
        UPDATE candidate_records
        SET
          photo_name = ?,
          photo_mime = ?
        WHERE id = ?
      `,
      [storedPhotoRecord.fileName, storedPhotoRecord.mimeType, normalizedCandidateId],
    );

    return {
      id: normalizedCandidateId,
      photoName: storedPhotoRecord.fileName,
    };
  }

  async function getCandidatePhoto(candidateId) {
    const [candidate] = await query(
      `
        SELECT
          id,
          examinee_no AS examineeNo,
          photo_name AS photoName,
          photo_mime AS photoMime
        FROM candidate_records
        WHERE id = ?
      `,
      [candidateId],
    );

    if (!candidate) {
      throw createHttpError(404, "수험생 사진을 찾을 수 없습니다.", "CANDIDATE_PHOTO_NOT_FOUND");
    }

    const storedPhoto = await readStoredCandidatePhotoFile(candidate.examineeNo, candidate.photoName);

    if (!storedPhoto?.photoBlob) {
      throw createHttpError(404, "수험생 사진을 찾을 수 없습니다.", "CANDIDATE_PHOTO_NOT_FOUND");
    }

    return storedPhoto;
  }

  return Object.freeze({
    getCandidatePhoto,
    saveCandidatePhoto,
  });
}

module.exports = {
  createCandidatePhotoRecordService,
};
