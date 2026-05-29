const { randomUUID } = require("crypto");

const {
  createArchiveEntryNameFactory,
  normalizeArchiveFileName,
  normalizeArchiveGenerationIds,
  writeZipArchive,
} = require("./archives");
const { formatTimestamp, sanitizeFileName } = require("./file-name");

function normalizeMergedPdfFileName(fileName, fallbackName = "pdf-generations") {
  const normalizedFileName = sanitizeFileName(String(fileName || fallbackName || "pdf-generations").trim())
    .replace(/\.pdf$/i, "")
    .trim();

  return `${normalizedFileName || "pdf-generations"}.pdf`;
}

function createUniqueStringList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
}

function parseJsonObject(value = "") {
  try {
    const parsedValue = JSON.parse(String(value || "{}"));

    return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue) ? parsedValue : {};
  } catch (_error) {
    return {};
  }
}

function createPdfGenerationArchiveService({
  createHttpError,
  ensureStorageDirectories,
  fs,
  legacyStorageRoot,
  path,
  query,
  resolvePdfStorageRootForSchool,
  writeAuditLog,
}) {
  async function resolveCompletedGenerationFiles(generationIds, missingMessageCode, missingMessage) {
    const placeholders = generationIds.map(() => "?").join(", ");
    const rows = await query(
      `
        SELECT
          pdf_generation_histories.id,
          school_id AS schoolId,
          s.code AS schoolCode,
          file_name AS fileName,
          file_path AS filePath,
          purged_at AS purgedAt,
          status
        FROM pdf_generation_histories
        LEFT JOIN schools s
          ON s.id = pdf_generation_histories.school_id
        WHERE pdf_generation_histories.id IN (${placeholders})
      `,
      generationIds,
    );
    const generationRowMap = new Map(rows.map((row) => [String(row.id || ""), row]));
    const files = [];

    for (const generationId of generationIds) {
      const generationRow = generationRowMap.get(generationId);

      if (!generationRow || String(generationRow.status || "") !== "completed" || generationRow.purgedAt) {
        throw createHttpError(404, missingMessage, missingMessageCode);
      }

      const filePath = String(generationRow.filePath || "").trim();
      const fileExists = await fs.promises
        .access(filePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (!filePath || !fileExists) {
        throw createHttpError(404, "대상 PDF 파일이 존재하지 않습니다.", "PDF_GENERATION_FILE_MISSING");
      }

      files.push({
        fileName: generationRow.fileName,
        filePath,
        generationId,
        schoolCode: generationRow.schoolCode,
        schoolId: generationRow.schoolId,
      });
    }

    return files;
  }

  async function createPdfGenerationArchive(request = {}) {
    const generationIds = normalizeArchiveGenerationIds(request.generationIds);

    if (!generationIds.length) {
      throw createHttpError(400, "압축할 PDF 생성 이력을 선택해주세요.", "PDF_ARCHIVE_GENERATION_IDS_REQUIRED");
    }

    const generationFiles = await resolveCompletedGenerationFiles(
      generationIds,
      "PDF_ARCHIVE_GENERATION_NOT_FOUND",
      "압축할 PDF 생성 이력을 찾을 수 없습니다.",
    );
    const storageRoot = await resolvePdfStorageRootForSchool(
      generationFiles[0]?.schoolId,
      generationFiles[0]?.schoolCode,
    );

    await ensureStorageDirectories(storageRoot);

    const archiveEntries = [];
    const createEntryName = createArchiveEntryNameFactory();

    for (const generationFile of generationFiles) {
      archiveEntries.push({
        entryName: createEntryName(generationFile.fileName, `${generationFile.generationId}.pdf`),
        filePath: generationFile.filePath,
      });
    }

    const archiveId = `pdf-archive-${randomUUID()}`;
    const archiveFileName = normalizeArchiveFileName(
      request.archiveName,
      `pdf-generations_${formatTimestamp(new Date())}`,
    );
    const archivePath = path.join(storageRoot, "archives", `${archiveId}.zip`);

    await writeZipArchive({
      entries: archiveEntries,
      filePath: archivePath,
      fs,
    });
    await writeAuditLog({
      action: "pdf_generation_archive_created",
      entityId: archiveId,
      entityType: "pdf_generation_archive",
      metadata: {
        generationCount: archiveEntries.length,
        generationIds: createUniqueStringList(generationFiles.map((generationFile) => generationFile.generationId)),
        archiveFilePath: archivePath,
        schoolCodes: createUniqueStringList(generationFiles.map((generationFile) => generationFile.schoolCode)),
        schoolIds: createUniqueStringList(generationFiles.map((generationFile) => generationFile.schoolId)),
      },
      status: "completed",
    });

    return {
      archiveFileName,
      archiveId,
      archivePath,
      downloadUrl: `/api/pdf-generations/archives/${encodeURIComponent(archiveId)}/download?name=${encodeURIComponent(archiveFileName)}`,
      generationCount: archiveEntries.length,
    };
  }

  async function createPdfGenerationMergedFile(request = {}) {
    const generationIds = normalizeArchiveGenerationIds(request.generationIds);

    if (!generationIds.length) {
      throw createHttpError(400, "병합할 PDF 생성 이력을 선택해주세요.", "PDF_MERGE_GENERATION_IDS_REQUIRED");
    }

    const { PDFDocument } = require("pdf-lib");
    const generationFiles = await resolveCompletedGenerationFiles(
      generationIds,
      "PDF_MERGE_GENERATION_NOT_FOUND",
      "병합할 PDF 생성 이력을 찾을 수 없습니다.",
    );
    const storageRoot = await resolvePdfStorageRootForSchool(
      generationFiles[0]?.schoolId,
      generationFiles[0]?.schoolCode,
    );

    await ensureStorageDirectories(storageRoot);

    const mergedDocument = await PDFDocument.create();

    for (const generationFile of generationFiles) {
      const sourceBytes = await fs.promises.readFile(generationFile.filePath);
      const sourceDocument = await PDFDocument.load(sourceBytes);
      const copiedPages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

      copiedPages.forEach((page) => mergedDocument.addPage(page));
    }

    const mergedId = `pdf-merged-${randomUUID()}`;
    const mergedFileName = normalizeMergedPdfFileName(
      request.fileName || request.archiveName,
      `pdf-generations_${formatTimestamp(new Date())}`,
    );
    const mergedPath = path.join(storageRoot, "merged", `${mergedId}.pdf`);
    const mergedBytes = await mergedDocument.save();

    await fs.promises.writeFile(mergedPath, mergedBytes);
    await writeAuditLog({
      action: "pdf_generation_merged_created",
      entityId: mergedId,
      entityType: "pdf_generation_merged",
      metadata: {
        generationCount: generationFiles.length,
        generationIds: createUniqueStringList(generationFiles.map((generationFile) => generationFile.generationId)),
        mergedFilePath: mergedPath,
        schoolCodes: createUniqueStringList(generationFiles.map((generationFile) => generationFile.schoolCode)),
        schoolIds: createUniqueStringList(generationFiles.map((generationFile) => generationFile.schoolId)),
      },
      status: "completed",
    });

    return {
      downloadUrl: `/api/pdf-generations/merged/${encodeURIComponent(mergedId)}/download?name=${encodeURIComponent(mergedFileName)}`,
      generationCount: generationFiles.length,
      mergedFileName,
      mergedId,
      mergedPath,
    };
  }

  async function getPdfGenerationArchiveFile(archiveId, requestedFileName = "") {
    const normalizedArchiveId = String(archiveId || "").trim();
    const batchRows = normalizedArchiveId
      ? await query(
          `
            SELECT archive_file_path AS archiveFilePath
            FROM pdf_generation_batches
            WHERE archive_id = ?
            LIMIT 1
          `,
          [normalizedArchiveId],
        ).catch(() => [])
      : [];
    const auditRows = !batchRows[0]?.archiveFilePath && normalizedArchiveId
      ? await query(
          `
            SELECT metadata_json AS metadataJson
            FROM pdf_audit_logs
            WHERE entity_id = ?
              AND entity_type = 'pdf_generation_archive'
              AND action = 'pdf_generation_archive_created'
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [normalizedArchiveId],
        ).catch(() => [])
      : [];
    const metadata = parseJsonObject(auditRows[0]?.metadataJson);
    const archivePath = String(batchRows[0]?.archiveFilePath || metadata.archiveFilePath || "").trim() ||
      path.join(legacyStorageRoot, "archives", `${normalizedArchiveId}.zip`);
    const fileExists = await fs.promises
      .access(archivePath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (!normalizedArchiveId || !fileExists) {
      throw createHttpError(404, "다운로드할 ZIP 파일을 찾을 수 없습니다.", "PDF_ARCHIVE_NOT_FOUND");
    }

    await writeAuditLog({
      action: "pdf_generation_archive_downloaded",
      entityId: normalizedArchiveId,
      entityType: "pdf_generation_archive",
      status: "completed",
    });

    return {
      fileName: normalizeArchiveFileName(requestedFileName, `pdf-generations_${formatTimestamp(new Date())}`),
      filePath: archivePath,
      id: normalizedArchiveId,
    };
  }

  async function getPdfGenerationMergedFile(mergedId, requestedFileName = "") {
    const normalizedMergedId = String(mergedId || "").trim();
    const auditRows = normalizedMergedId
      ? await query(
          `
            SELECT metadata_json AS metadataJson
            FROM pdf_audit_logs
            WHERE entity_id = ?
              AND entity_type = 'pdf_generation_merged'
              AND action = 'pdf_generation_merged_created'
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [normalizedMergedId],
        ).catch(() => [])
      : [];
    const metadata = parseJsonObject(auditRows[0]?.metadataJson);
    const mergedPath = String(metadata.mergedFilePath || "").trim() ||
      path.join(legacyStorageRoot, "merged", `${normalizedMergedId}.pdf`);
    const fileExists = await fs.promises
      .access(mergedPath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (!normalizedMergedId || !fileExists) {
      throw createHttpError(404, "다운로드할 병합 PDF 파일을 찾을 수 없습니다.", "PDF_MERGE_NOT_FOUND");
    }

    await writeAuditLog({
      action: "pdf_generation_merged_downloaded",
      entityId: normalizedMergedId,
      entityType: "pdf_generation_merged",
      status: "completed",
    });

    return {
      fileName: normalizeMergedPdfFileName(requestedFileName, `pdf-generations_${formatTimestamp(new Date())}`),
      filePath: mergedPath,
      id: normalizedMergedId,
    };
  }

  return Object.freeze({
    createPdfGenerationArchive,
    createPdfGenerationMergedFile,
    getPdfGenerationArchiveFile,
    getPdfGenerationMergedFile,
  });
}

module.exports = {
  createPdfGenerationArchiveService,
};
