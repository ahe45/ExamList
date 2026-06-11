const { randomUUID } = require("crypto");

const {
  createArchiveEntryNameFactory,
  normalizeArchiveFileName,
  normalizeArchiveGenerationIds,
  writeZipArchive,
} = require("./archives");
const { sortGenerationFilesForMergedDownload } = require("./archive-ordering");
const { formatTimestamp, sanitizeFileName } = require("./file-name");

const ACADEMIC_YEAR_SUFFIX = "\uD559\uB144\uB3C4";
const ARCHIVE_ARTIFACT_LABEL = "\uAC1C\uBCC4";
const MERGED_ARTIFACT_LABEL = "\uBCD1\uD569";

function normalizeMergedPdfFileName(fileName, fallbackName = "pdf-generations") {
  const normalizedFileName = sanitizeFileName(String(fileName || fallbackName || "pdf-generations").trim())
    .replace(/\.pdf$/i, "")
    .trim();

  return `${normalizedFileName || "pdf-generations"}.pdf`;
}

function normalizeArtifactFileNamePart(value = "") {
  return String(value || "").trim();
}

function formatArtifactAcademicYear(value = "") {
  const academicYear = String(value || "")
    .trim()
    .replace(new RegExp(`\\s*${ACADEMIC_YEAR_SUFFIX}\\s*$`, "u"), "")
    .trim();

  return academicYear ? `${academicYear}${ACADEMIC_YEAR_SUFFIX}` : "";
}

function buildArtifactDefaultFileName(generationFiles = [], artifactLabel = "", generatedAt = new Date()) {
  const representativeFile = Array.isArray(generationFiles) && generationFiles.length ? generationFiles[0] : {};
  const parts = [
    representativeFile.schoolSettingsName || representativeFile.schoolName || representativeFile.schoolCode || representativeFile.schoolId,
    formatArtifactAcademicYear(representativeFile.academicYear),
    artifactLabel,
    formatTimestamp(generatedAt),
  ].map(normalizeArtifactFileNamePart).filter(Boolean);

  return sanitizeFileName(parts.join("_")) || `pdf-generations_${formatTimestamp(generatedAt)}`;
}

function createUniqueStringList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values])
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

function normalizeArtifactListLimit(value, fallback = 200, minimum = 1, maximum = 2000) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function buildArtifactSchoolWhereClause(rawSchoolId = "") {
  const schoolId = String(rawSchoolId || "").trim();

  if (!schoolId) {
    return {
      params: [],
      sql: "",
    };
  }

  const encodedSchoolId = JSON.stringify(schoolId);

  return {
    params: [
      `%"schoolId":${encodedSchoolId}%`,
      `%"schoolIds":[%${encodedSchoolId}%]%`,
    ],
    sql: " AND (metadata_json LIKE ? OR metadata_json LIKE ?)",
  };
}

function getArtifactKind(entityType = "") {
  if (entityType === "pdf_generation_merged") {
    return "merged";
  }

  if (entityType === "pdf_generation_archive") {
    return "archive";
  }

  return "";
}

function getArtifactExtension(kind = "") {
  return kind === "merged" ? ".pdf" : ".zip";
}

function getArtifactDownloadPath(kind = "", artifactId = "") {
  const encodedArtifactId = encodeURIComponent(artifactId);

  if (kind === "merged") {
    return `/api/pdf-generations/merged/${encodedArtifactId}/download`;
  }

  if (kind === "archive") {
    return `/api/pdf-generations/archives/${encodedArtifactId}/download`;
  }

  return "";
}

async function getFileStatOrNull(fs, filePath = "") {
  const normalizedFilePath = String(filePath || "").trim();

  if (!normalizedFilePath) {
    return null;
  }

  return fs.promises.stat(normalizedFilePath).catch(() => null);
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
          pdf_generation_histories.school_id AS schoolId,
          ss.academic_year AS academicYear,
          ss.school_name AS schoolSettingsName,
          s.code AS schoolCode,
          s.name AS schoolName,
          file_name AS fileName,
          file_path AS filePath,
          generation_unit AS generationUnit,
          purged_at AS purgedAt,
          request_json AS requestJson,
          status,
          target_name AS targetName
        FROM pdf_generation_histories
        LEFT JOIN schools s
          ON s.id = pdf_generation_histories.school_id
        LEFT JOIN school_settings ss
          ON ss.school_id = pdf_generation_histories.school_id
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
        academicYear: generationRow.academicYear,
        fileName: generationRow.fileName,
        filePath,
        generationUnit: generationRow.generationUnit,
        generationId,
        requestJson: generationRow.requestJson,
        schoolCode: generationRow.schoolCode,
        schoolId: generationRow.schoolId,
        schoolName: generationRow.schoolName,
        schoolSettingsName: generationRow.schoolSettingsName,
        targetName: generationRow.targetName,
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
    const createdAt = new Date();
    const archiveFileName = normalizeArchiveFileName(
      request.archiveName,
      buildArtifactDefaultFileName(generationFiles, ARCHIVE_ARTIFACT_LABEL, createdAt),
    );
    const archivePath = path.join(storageRoot, "archives", `${archiveId}.zip`);

    await writeZipArchive({
      entries: archiveEntries,
      filePath: archivePath,
      fs,
    });

    const archiveStat = await getFileStatOrNull(fs, archivePath);

    await writeAuditLog({
      action: "pdf_generation_archive_created",
      entityId: archiveId,
      entityType: "pdf_generation_archive",
      metadata: {
        archiveFileName,
        generationCount: archiveEntries.length,
        generationIds: createUniqueStringList(generationFiles.map((generationFile) => generationFile.generationId)),
        archiveFilePath: archivePath,
        fileSizeBytes: archiveStat?.size || 0,
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
    const generationFiles = sortGenerationFilesForMergedDownload(
      await resolveCompletedGenerationFiles(
        generationIds,
        "PDF_MERGE_GENERATION_NOT_FOUND",
        "병합할 PDF 생성 이력을 찾을 수 없습니다.",
      ),
    );
    const storageRoot = await resolvePdfStorageRootForSchool(
      generationFiles[0]?.schoolId,
      generationFiles[0]?.schoolCode,
    );

    await ensureStorageDirectories(storageRoot);

    const mergedDocument = await PDFDocument.create();
    let mergedPageCount = 0;

    for (const generationFile of generationFiles) {
      const sourceBytes = await fs.promises.readFile(generationFile.filePath);
      const sourceDocument = await PDFDocument.load(sourceBytes);
      const copiedPages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

      copiedPages.forEach((page) => mergedDocument.addPage(page));
      mergedPageCount += copiedPages.length;
    }

    const mergedId = `pdf-merged-${randomUUID()}`;
    const createdAt = new Date();
    const mergedFileName = normalizeMergedPdfFileName(
      request.fileName || request.archiveName,
      buildArtifactDefaultFileName(generationFiles, MERGED_ARTIFACT_LABEL, createdAt),
    );
    const mergedPath = path.join(storageRoot, "merged", `${mergedId}.pdf`);
    const mergedBytes = await mergedDocument.save();

    await fs.promises.writeFile(mergedPath, mergedBytes);

    const mergedStat = await getFileStatOrNull(fs, mergedPath);

    await writeAuditLog({
      action: "pdf_generation_merged_created",
      entityId: mergedId,
      entityType: "pdf_generation_merged",
      metadata: {
        fileSizeBytes: mergedStat?.size || 0,
        generationCount: generationFiles.length,
        generationIds: createUniqueStringList(generationFiles.map((generationFile) => generationFile.generationId)),
        mergedFileName,
        mergedFilePath: mergedPath,
        pageCount: mergedPageCount,
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
      pageCount: mergedPageCount,
    };
  }

  async function listPdfGenerationArtifacts(rawFilter = {}) {
    const limit = normalizeArtifactListLimit(rawFilter.limit);
    const schoolWhere = buildArtifactSchoolWhereClause(rawFilter.schoolId);
    const rows = await query(
      `
        SELECT
          id,
          action,
          entity_type AS entityType,
          entity_id AS entityId,
          status,
          metadata_json AS metadataJson,
          created_at AS createdAt
        FROM pdf_audit_logs
        WHERE (
          (entity_type = 'pdf_generation_merged' AND action = 'pdf_generation_merged_created')
          OR (entity_type = 'pdf_generation_archive' AND action = 'pdf_generation_archive_created')
        )
        ${schoolWhere.sql}
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [...schoolWhere.params, limit],
    );
    const items = [];

    for (const row of Array.isArray(rows) ? rows : []) {
      const metadata = parseJsonObject(row.metadataJson);
      const kind = getArtifactKind(String(row.entityType || ""));
      const artifactId = String(row.entityId || "").trim();
      const filePath = String(
        kind === "merged"
          ? metadata.mergedFilePath || metadata.filePath || ""
          : metadata.archiveFilePath || metadata.filePath || "",
      ).trim();
      const fallbackName = artifactId ? `${artifactId}${getArtifactExtension(kind)}` : "";
      const fileName = String(
        kind === "merged"
          ? metadata.mergedFileName || metadata.fileName || ""
          : metadata.archiveFileName || metadata.fileName || "",
      ).trim() || (filePath ? path.basename(filePath) : fallbackName);
      const fileStat = await getFileStatOrNull(fs, filePath);
      const downloadPath = getArtifactDownloadPath(kind, artifactId);
      const downloadUrl = downloadPath && fileName
        ? `${downloadPath}?name=${encodeURIComponent(fileName)}`
        : downloadPath;

      items.push({
        action: String(row.action || ""),
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
        downloadUrl,
        fileExists: Boolean(fileStat),
        fileName,
        filePath,
        fileSizeBytes: fileStat?.size || Number(metadata.fileSizeBytes) || 0,
        generationCount: Number(metadata.generationCount) || (Array.isArray(metadata.generationIds) ? metadata.generationIds.length : 0),
        generationIds: createUniqueStringList(metadata.generationIds),
        id: artifactId,
        kind,
        logId: String(row.id || ""),
        pageCount: Number(metadata.pageCount) || 0,
        schoolIds: createUniqueStringList(metadata.schoolIds || metadata.schoolId),
        status: String(row.status || ""),
      });
    }

    return {
      items,
      limit,
      total: items.length,
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
    listPdfGenerationArtifacts,
  });
}

module.exports = {
  createPdfGenerationArchiveService,
};
