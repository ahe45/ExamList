const { mapWithConcurrency } = require("../../lib/concurrency");

function createCandidatePhotoArchiveService({
  buildStoredCandidatePhotoFileRecord,
  createHttpError,
  getPool,
  parseCandidatePhotoArchiveBuffer,
  parseCandidatePhotoArchiveFile = null,
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

    let invalidPhotos = 0;
    if (matchedPhotos.length > 0) {
      const schoolStorageCodes = new Map();
      const storedPhotoRecords = [];
      for (const photo of matchedPhotos) {
        const candidateRows = candidateRowsByNo.get(String(photo.examineeNo || "").trim()) || [];
        const candidateSchoolId = candidateRows[0]?.schoolId || schoolId;
        if (!schoolStorageCodes.has(candidateSchoolId)) {
          schoolStorageCodes.set(candidateSchoolId, await resolvePhotoStorageCode(candidateSchoolId));
        }
        storedPhotoRecords.push({
          photo,
          schoolStorageCode: schoolStorageCodes.get(candidateSchoolId),
          candidateIds: candidateRows.map((row) => String(row?.id || "").trim()).filter(Boolean),
        });
      }

      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        for (let offset = 0; offset < storedPhotoRecords.length; offset += 200) {
          const batch = (await mapWithConcurrency(storedPhotoRecords.slice(offset, offset + 200), 4, async descriptor => {
            const photo = descriptor.photo.readPhoto ? await descriptor.photo.readPhoto() : descriptor.photo;
            if (!photo) { invalidPhotos++; return null; }
            const record = buildStoredCandidatePhotoFileRecord(photo, { schoolStorageCode: descriptor.schoolStorageCode });
            await persistStoredCandidatePhotoFile(record);
            return { fileName: record.fileName, mimeType: record.mimeType, candidateIds: descriptor.candidateIds };
          })).filter(Boolean);
          const updates = batch.flatMap((photo) => photo.candidateIds.map(id => [id, photo.fileName, photo.mimeType]));
          for (let index = 0; index < updates.length; index += 200) {
            const rows = updates.slice(index, index + 200);
            const selects = rows.map(() => "SELECT ? AS id, ? AS photoName, ? AS photoMime").join(" UNION ALL ");
            await connection.query(
              `UPDATE candidate_records c JOIN (${selects}) photos ON photos.id = c.id
               SET c.photo_name = photos.photoName, c.photo_mime = photos.photoMime`,
              rows.flat(),
            );
          }
          await options.onProgress?.({ processed: Math.min(offset + 200, storedPhotoRecords.length), total: storedPhotoRecords.length });
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
      photoSkipped: unmatchedPhotos + invalidPhotos + Number(skippedEntries || 0) + Number(duplicateEntries || 0),
      photoUploaded: matchedPhotos.length - invalidPhotos,
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
    const result = parseCandidatePhotoArchiveFile && photoArchiveSessionStore.readSessionFile
      ? await saveParsedCandidatePhotos(await parseCandidatePhotoArchiveFile(await photoArchiveSessionStore.readSessionFile(previewToken, { schoolStorageCode })), options)
      : await saveCandidatePhotoArchiveBuffer(await photoArchiveSessionStore.readSessionBuffer(previewToken, { schoolStorageCode }), options);

    await photoArchiveSessionStore.deleteSession?.(previewToken, { schoolStorageCode });
    return result;
  }

  async function previewCandidatePhotoArchiveStream(input, options = {}) {
    const schoolId = String(options.schoolId || "");
    const schoolStorageCode = await resolvePhotoStorageCode(schoolId);
    const session = await photoArchiveSessionStore.createSessionFromStream(input, { schoolId, schoolStorageCode }, { ...options, schoolStorageCode });
    try {
      const preview = await previewParsedCandidatePhotos(await parseCandidatePhotoArchiveFile(session.archivePath), options);
      return { ...preview, previewToken: session.token, previewExpiresAt: session.expiresAt, previewFileSize: session.fileSize };
    } catch (error) { await photoArchiveSessionStore.deleteSession(session.token, { schoolStorageCode }); throw error; }
  }

  return Object.freeze({
    previewCandidatePhotoArchiveStream,
    previewCandidatePhotoArchiveBuffer,
    saveCandidatePhotoArchiveSession,
    saveCandidatePhotoArchiveBuffer,
  });
}

module.exports = {
  createCandidatePhotoArchiveService,
};
