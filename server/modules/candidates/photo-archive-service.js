function createCandidatePhotoArchiveService({
  buildStoredCandidatePhotoFileRecord,
  createHttpError,
  getPool,
  parseCandidatePhotoArchiveBuffer,
  parseCandidatePhotoArchivePreviewBuffer = parseCandidatePhotoArchiveBuffer,
  photoArchiveSessionStore = null,
  persistStoredCandidatePhotoFile,
  query,
  resolveSchoolStorageCode = null,
}) {
  async function resolvePhotoStorageCode(schoolId = "") {
    return typeof resolveSchoolStorageCode === "function"
      ? resolveSchoolStorageCode(schoolId)
      : String(schoolId || "").trim();
  }

  function createServiceError(statusCode, message, errorCode) {
    if (typeof createHttpError === "function") {
      return createHttpError(statusCode, message, errorCode);
    }

    return Object.assign(new Error(message), { errorCode, statusCode });
  }

  async function previewParsedCandidatePhotos({ duplicateEntries = 0, photos, skippedEntries = 0, totalEntries = 0 } = {}, options = {}) {
    const duplicateCount = Number(duplicateEntries || 0);
    const invalidEntryCount = Number(skippedEntries || 0);
    const schoolId = String(options.schoolId || "").trim();
    const examineeNos = Array.from(
      new Set(
        (Array.isArray(photos) ? photos : [])
          .map((photo) => String(photo?.examineeNo || "").trim())
          .filter(Boolean),
      ),
    );
    const existingRows =
      examineeNos.length > 0
        ? await query(
            `SELECT examinee_no AS examineeNo FROM candidate_records WHERE examinee_no IN (?)${schoolId ? " AND school_id = ?" : ""}`,
            [examineeNos, ...(schoolId ? [schoolId] : [])],
          )
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

  async function previewCandidatePhotoArchiveBuffer(fileBuffer, options = {}) {
    const preview = await previewParsedCandidatePhotos(parseCandidatePhotoArchivePreviewBuffer(fileBuffer), options);
    const schoolId = String(options.schoolId || "").trim();
    const schoolStorageCode = schoolId ? await resolvePhotoStorageCode(schoolId) : "";
    const session = await photoArchiveSessionStore?.createSession?.(
      fileBuffer,
      { schoolId, schoolStorageCode },
      { schoolStorageCode },
    );

    if (!session?.token) {
      return preview;
    }

    return {
      ...preview,
      previewExpiresAt: session.expiresAt,
      previewFileSize: session.fileSize,
      previewToken: session.token,
    };
  }

  async function saveParsedCandidatePhotos({ duplicateEntries = 0, photos, skippedEntries = 0 } = {}, options = {}) {
    const schoolId = String(options.schoolId || "").trim();
    const examineeNos = (Array.isArray(photos) ? photos : []).map((photo) => photo.examineeNo);
    const existingRows =
      examineeNos.length > 0
        ? await query(
            `SELECT id, school_id AS schoolId, examinee_no AS examineeNo FROM candidate_records WHERE examinee_no IN (?)${schoolId ? " AND school_id = ?" : ""}`,
            [examineeNos, ...(schoolId ? [schoolId] : [])],
          )
        : [];
    const candidateRowsByNo = existingRows.reduce((rowMap, row) => {
      const examineeNo = String(row.examineeNo || "").trim();
      const rows = rowMap.get(examineeNo) || [];

      rows.push(row);
      rowMap.set(examineeNo, rows);

      return rowMap;
    }, new Map());
    const matchedPhotos = (Array.isArray(photos) ? photos : []).filter((photo) =>
      Boolean(candidateRowsByNo.get(String(photo.examineeNo || "").trim())?.length),
    );
    const unmatchedPhotos = Math.max(0, (Array.isArray(photos) ? photos.length : 0) - matchedPhotos.length);

    if (matchedPhotos.length > 0) {
      const storedPhotoRecords = [];
      const connection = await getPool().getConnection();

      for (const photo of matchedPhotos) {
        const candidateRows = candidateRowsByNo.get(String(photo.examineeNo || "").trim()) || [];
        const candidateRow = candidateRows[0] || null;
        const schoolStorageCode = await resolvePhotoStorageCode(candidateRow?.schoolId || schoolId);

        storedPhotoRecords.push({
          ...buildStoredCandidatePhotoFileRecord(photo, { schoolStorageCode }),
          candidateIds: candidateRows.map((row) => String(row?.id || "").trim()).filter(Boolean),
        });
      }

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
              WHERE id IN (?)
            `,
            [storedPhotoRecord.fileName, storedPhotoRecord.mimeType, storedPhotoRecord.candidateIds],
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

  async function saveCandidatePhotoArchiveBuffer(fileBuffer, options = {}) {
    return saveParsedCandidatePhotos(parseCandidatePhotoArchiveBuffer(fileBuffer), options);
  }

  async function saveCandidatePhotoArchiveSession(previewToken = "", options = {}) {
    if (!photoArchiveSessionStore?.readSessionBuffer) {
      throw createServiceError(410, "사진 ZIP 미리보기 세션을 찾을 수 없습니다. ZIP 파일을 다시 선택해 주세요.", "CANDIDATE_PHOTO_ARCHIVE_SESSION_UNAVAILABLE");
    }

    const schoolId = String(options.schoolId || "").trim();
    const schoolStorageCode = schoolId ? await resolvePhotoStorageCode(schoolId) : "";
    const fileBuffer = await photoArchiveSessionStore.readSessionBuffer(previewToken, { schoolStorageCode });
    const result = await saveCandidatePhotoArchiveBuffer(fileBuffer, options);

    await photoArchiveSessionStore.deleteSession?.(previewToken, { schoolStorageCode });
    return result;
  }

  return Object.freeze({
    previewCandidatePhotoArchiveBuffer,
    saveCandidatePhotoArchiveSession,
    saveCandidatePhotoArchiveBuffer,
  });
}

module.exports = {
  createCandidatePhotoArchiveService,
};
