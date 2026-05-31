const { normalizeListLimit, parseJsonColumn } = require("./filters");
const { normalizeArchiveGenerationIds } = require("./archives");
const { normalizeRetentionDays } = require("./queue-options");

function createSqlPlaceholders(values = []) {
  return values.map(() => "?").join(", ");
}

function collectUniqueValues(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

async function queryRowsOrEmpty(query, sql, params = []) {
  try {
    const rows = await query(sql, params);

    return Array.isArray(rows) ? rows : [];
  } catch (_error) {
    return [];
  }
}

async function buildAuditTemplateTitleMaps(query, items = []) {
  const entityIds = collectUniqueValues(items.map((item) => item.entityId));
  const batchIds = collectUniqueValues(
    items
      .filter((item) => String(item.entityType || "") === "pdf_generation_batch")
      .map((item) => item.entityId),
  );
  const metadataTemplateIds = collectUniqueValues(items.map((item) => item.metadata?.templateId));
  const templateTitleByEntityId = new Map();
  const templateTitleByTemplateId = new Map();

  if (entityIds.length) {
    const historyRows = await queryRowsOrEmpty(
      query,
      `
        SELECT
          id,
          template_id AS templateId,
          template_name AS templateName
        FROM pdf_generation_histories
        WHERE id IN (${createSqlPlaceholders(entityIds)})
      `,
      entityIds,
    );

    for (const row of historyRows) {
      const templateName = String(row.templateName || "").trim();

      if (templateName) {
        templateTitleByEntityId.set(String(row.id || ""), templateName);
        if (row.templateId) {
          templateTitleByTemplateId.set(String(row.templateId || ""), templateName);
        }
      }
    }
  }

  if (batchIds.length) {
    const batchRows = await queryRowsOrEmpty(
      query,
      `
        SELECT
          id,
          template_id AS templateId,
          template_name AS templateName
        FROM pdf_generation_batches
        WHERE id IN (${createSqlPlaceholders(batchIds)})
      `,
      batchIds,
    );

    for (const row of batchRows) {
      const templateName = String(row.templateName || "").trim();

      if (templateName) {
        templateTitleByEntityId.set(String(row.id || ""), templateName);
        if (row.templateId) {
          templateTitleByTemplateId.set(String(row.templateId || ""), templateName);
        }
      }
    }
  }

  const missingTemplateIds = metadataTemplateIds.filter((templateId) => !templateTitleByTemplateId.has(templateId));

  if (missingTemplateIds.length) {
    const templateRows = await queryRowsOrEmpty(
      query,
      `
        SELECT
          id,
          name
        FROM pdf_templates
        WHERE id IN (${createSqlPlaceholders(missingTemplateIds)})
      `,
      missingTemplateIds,
    );

    for (const row of templateRows) {
      const templateName = String(row.name || "").trim();

      if (templateName) {
        templateTitleByTemplateId.set(String(row.id || ""), templateName);
      }
    }
  }

  return {
    templateTitleByEntityId,
    templateTitleByTemplateId,
  };
}

function resolveAuditTemplateTitle(item = {}, titleMaps = {}) {
  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
    ? item.metadata
    : {};
  const templateId = String(metadata.templateId || "").trim();
  const metadataTitle = String(metadata.templateTitle || metadata.templateName || "").trim();

  return metadataTitle ||
    titleMaps.templateTitleByEntityId?.get(String(item.entityId || "")) ||
    titleMaps.templateTitleByTemplateId?.get(templateId) ||
    "";
}

function createPdfGenerationFileActions({
  createHttpError,
  fs,
  query,
  writeAuditLog,
}) {
  async function getPdfGenerationFile(generationId) {
    const rows = await query(
      `
        SELECT
          id,
          file_name AS fileName,
          file_path AS filePath,
          purged_at AS purgedAt,
          status
        FROM pdf_generation_histories
        WHERE id = ?
        LIMIT 1
      `,
      [generationId],
    );
    const generationRow = rows[0];

    if (!generationRow || String(generationRow.status || "") !== "completed" || generationRow.purgedAt) {
      throw createHttpError(404, "다운로드할 PDF 파일을 찾을 수 없습니다.", "PDF_GENERATION_NOT_FOUND");
    }

    const filePath = String(generationRow.filePath || "").trim();

    if (!filePath || !fs.existsSync(filePath)) {
      throw createHttpError(404, "생성된 PDF 파일이 존재하지 않습니다.", "PDF_GENERATION_FILE_MISSING");
    }

    await writeAuditLog({
      action: "pdf_generation_downloaded",
      entityId: String(generationRow.id || ""),
      status: "completed",
    });

    return {
      fileName: String(generationRow.fileName || "generated.pdf"),
      filePath,
      id: String(generationRow.id || ""),
    };
  }

  async function cleanupExpiredPdfGenerations(request = {}) {
    const retentionDays = normalizeRetentionDays(request.retentionDays, normalizeRetentionDays(process.env.PDF_RETENTION_DAYS, 30));
    const cutoffDate = retentionDays > 0
      ? new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
      : new Date();
    const rows = await query(
      `
        SELECT
          id,
          file_path AS filePath
        FROM pdf_generation_histories
        WHERE status = 'completed'
          AND purged_at IS NULL
          AND file_path <> ''
          AND (
            (expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP)
            OR (expires_at IS NULL AND created_at <= ?)
          )
        LIMIT 200
      `,
      [cutoffDate],
    );
    let purgedCount = 0;

    for (const row of rows) {
      const filePath = String(row.filePath || "").trim();

      if (filePath) {
        await fs.promises.rm(filePath, { force: true }).catch(() => {});
      }

      await query(
        `
          UPDATE pdf_generation_histories
          SET
            file_path = '',
            file_size_bytes = 0,
            purged_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          LIMIT 1
        `,
        [row.id],
      );
      purgedCount += 1;
    }

    await writeAuditLog({
      action: "pdf_generation_retention_cleanup",
      entityType: "pdf_generation_retention",
      metadata: {
        purgedCount,
        retentionDays,
      },
      status: "completed",
    });

    return {
      purgedCount,
      retentionDays,
    };
  }

  async function deletePdfGenerations(request = {}) {
    const generationIds = normalizeArchiveGenerationIds(request.generationIds || request.ids || []);

    if (!generationIds.length) {
      throw createHttpError(400, "삭제할 PDF 생성 결과를 선택하세요.", "PDF_GENERATION_DELETE_TARGET_REQUIRED");
    }

    const placeholders = generationIds.map(() => "?").join(", ");
    const rows = await query(
      `
        SELECT
          id,
          file_name AS fileName,
          file_path AS filePath,
          file_size_bytes AS fileSizeBytes,
          status
        FROM pdf_generation_histories
        WHERE id IN (${placeholders})
          AND status = 'completed'
      `,
      generationIds,
    );
    let fileDeletedCount = 0;
    let fileMissingCount = 0;
    let totalFileSizeBytes = 0;

    for (const row of rows) {
      const filePath = String(row.filePath || "").trim();

      totalFileSizeBytes += Number(row.fileSizeBytes) || 0;

      if (!filePath) {
        fileMissingCount += 1;
        continue;
      }

      const existed = fs.existsSync(filePath);

      await fs.promises.rm(filePath, { force: true }).catch(() => {});
      if (existed) {
        fileDeletedCount += 1;
      } else {
        fileMissingCount += 1;
      }
    }

    if (rows.length) {
      const deleteIds = rows.map((row) => String(row.id || "")).filter(Boolean);
      const deletePlaceholders = deleteIds.map(() => "?").join(", ");

      await query(
        `
          DELETE FROM pdf_generation_histories
          WHERE id IN (${deletePlaceholders})
            AND status = 'completed'
        `,
        deleteIds,
      );
    }

    await writeAuditLog({
      action: "pdf_generation_deleted",
      entityId: rows.length === 1 ? String(rows[0].id || "") : "",
      entityType: "pdf_generation",
      metadata: {
        deletedCount: rows.length,
        fileDeletedCount,
        fileMissingCount,
        requestedCount: generationIds.length,
        totalFileSizeBytes,
      },
      status: "completed",
    });

    return {
      deletedCount: rows.length,
      fileDeletedCount,
      fileMissingCount,
      requestedCount: generationIds.length,
      totalFileSizeBytes,
    };
  }

  async function listPdfAuditLogs(rawFilter = {}) {
    const limit = normalizeListLimit(rawFilter.limit, 50, 1, 2000);
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
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [limit],
    );

    const items = rows.map((row) => ({
      action: String(row.action || ""),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
      entityId: String(row.entityId || ""),
      entityType: String(row.entityType || ""),
      id: String(row.id || ""),
      metadata: parseJsonColumn(row.metadataJson, {}),
      status: String(row.status || ""),
    }));
    const titleMaps = await buildAuditTemplateTitleMaps(query, items);

    return {
      items: items.map((item) => {
        const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
          ? item.metadata
          : {};
        const templateTitle = resolveAuditTemplateTitle(item, titleMaps);

        if (!templateTitle && !metadata.templateId) {
          return item;
        }

        return {
          ...item,
          metadata: {
            ...metadata,
            templateTitle,
          },
        };
      }),
      limit,
      total: rows.length,
    };
  }

  return Object.freeze({
    cleanupExpiredPdfGenerations,
    deletePdfGenerations,
    getPdfGenerationFile,
    listPdfAuditLogs,
  });
}

module.exports = {
  createPdfGenerationFileActions,
};
