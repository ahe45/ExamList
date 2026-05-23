function createCandidatePhotoArchiveService({
  buildStoredCandidatePhotoFileRecord,
  getPool,
  parseCandidatePhotoArchiveBuffer,
  parseCandidatePhotoArchivePreviewBuffer = parseCandidatePhotoArchiveBuffer,
  persistStoredCandidatePhotoFile,
  query,
}) {
  async function previewParsedCandidatePhotos({ duplicateEntries = 0, photos, skippedEntries = 0, totalEntries = 0 } = {}) {
    const duplicateCount = Number(duplicateEntries || 0);
    const invalidEntryCount = Number(skippedEntries || 0);
    const examineeNos = Array.from(
      new Set(
        (Array.isArray(photos) ? photos : [])
          .map((photo) => String(photo?.examineeNo || "").trim())
          .filter(Boolean),
      ),
    );
    const existingRows =
      examineeNos.length > 0
        ? await query("SELECT examinee_no AS examineeNo FROM candidate_records WHERE examinee_no IN (?)", [examineeNos])
        : [];
    const existingExamineeNos = new Set(existingRows.map((row) => String(row?.examineeNo || "").trim()));
    const matchedCount = (Array.isArray(photos) ? photos : []).filter((photo) =>
      existingExamineeNos.has(String(photo?.examineeNo || "").trim()),
    ).length;
    const unmatchedCount = Math.max(0, (Array.isArray(photos) ? photos.length : 0) - matchedCount);
    const skippedCount = unmatchedCount + invalidEntryCount;

    return {
      duplicateCount,
      duplicateEntryCount: duplicateCount,
      estimatedSkipCount: skippedCount + duplicateCount,
      estimatedUploadCount: matchedCount,
      invalidEntryCount,
      matchedCount,
      recognizedPhotoCount: Array.isArray(photos) ? photos.length : 0,
      skippedCount,
      totalEntries: Number(totalEntries || 0),
      unmatchedCount,
      uploadableCount: matchedCount,
    };
  }

  async function previewCandidatePhotoArchiveBuffer(fileBuffer) {
    return previewParsedCandidatePhotos(parseCandidatePhotoArchivePreviewBuffer(fileBuffer));
  }

  async function saveParsedCandidatePhotos({ duplicateEntries = 0, photos, skippedEntries = 0 } = {}) {
    const examineeNos = (Array.isArray(photos) ? photos : []).map((photo) => photo.examineeNo);
    const existingRows =
      examineeNos.length > 0
        ? await query("SELECT id, examinee_no AS examineeNo FROM candidate_records WHERE examinee_no IN (?)", [examineeNos])
        : [];
    const candidateIdsByNo = new Map(existingRows.map((row) => [String(row.examineeNo || "").trim(), String(row.id || "")]));
    const matchedPhotos = (Array.isArray(photos) ? photos : []).filter((photo) => candidateIdsByNo.has(String(photo.examineeNo || "").trim()));
    const unmatchedPhotos = Math.max(0, (Array.isArray(photos) ? photos.length : 0) - matchedPhotos.length);

    if (matchedPhotos.length > 0) {
      const storedPhotoRecords = matchedPhotos.map((photo) => ({
        ...buildStoredCandidatePhotoFileRecord(photo),
        candidateId: candidateIdsByNo.get(String(photo.examineeNo || "").trim()),
      }));
      const connection = await getPool().getConnection();

      try {
        await connection.beginTransaction();

        for (const storedPhotoRecord of storedPhotoRecords) {
          await persistStoredCandidatePhotoFile(storedPhotoRecord);
          await connection.query(
            `
              UPDATE candidate_records
              SET
                photo_name = ?,
                photo_mime = ?
              WHERE id = ?
            `,
            [storedPhotoRecord.fileName, storedPhotoRecord.mimeType, storedPhotoRecord.candidateId],
          );
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    return {
      photoSkipped: unmatchedPhotos + Number(skippedEntries || 0) + Number(duplicateEntries || 0),
      photoUploaded: matchedPhotos.length,
    };
  }

  async function saveCandidatePhotoArchiveBuffer(fileBuffer) {
    return saveParsedCandidatePhotos(parseCandidatePhotoArchiveBuffer(fileBuffer));
  }

  return Object.freeze({
    previewCandidatePhotoArchiveBuffer,
    saveCandidatePhotoArchiveBuffer,
  });
}

module.exports = {
  createCandidatePhotoArchiveService,
};
