const { randomUUID } = require("crypto");

const {
  applyMetadataToSnapshot,
  buildBlankTemplateSnapshot,
  clearSnapshotCanvasContent,
  cloneSnapshotWithFreshIds,
} = require("./defaults");
const { normalizeTemplateLayout } = require("./layout");
const { createPdfTemplateReadActions } = require("./service-read");
const { normalizeTemplateDuplicateOptions } = require("./duplicate-options");
const { insertVersionRow, replaceSnapshotRows } = require("./snapshot-store");
const { normalizeTemplateMetadata } = require("./validation");

const defaultTemplateSource = Object.freeze({
  schoolName: "한국대학교",
  templateName: "기본 템플릿",
});

function extractQueryRows(queryResult) {
  if (Array.isArray(queryResult?.[0])) {
    return queryResult[0];
  }

  return Array.isArray(queryResult) ? queryResult : [];
}

async function resolveNextTemplateVersionNo(connection, templateId, latestVersionNo = 0) {
  const rows = extractQueryRows(
    await connection.query(
      `
        SELECT COALESCE(MAX(version_no), 0) AS maxVersionNo
        FROM pdf_template_versions
        WHERE template_id = ?
      `,
      [templateId],
    ),
  );
  const currentLatestVersionNo = Number(latestVersionNo) || 0;
  const maxVersionNo = Number(rows[0]?.maxVersionNo) || 0;

  return Math.max(currentLatestVersionNo, maxVersionNo) + 1;
}

function createPdfTemplateService({ createHttpError, getDefaultSchoolId = null, getPool, query, renderListThumbnail = null }) {
  async function resolveSchoolId(schoolId = "") {
    const normalizedSchoolId = String(schoolId || "").trim();

    if (normalizedSchoolId) {
      return normalizedSchoolId;
    }

    return typeof getDefaultSchoolId === "function" ? getDefaultSchoolId() : "school-default";
  }

  const {
    getDashboardTemplateSummary,
    getTemplateById,
    listTemplates,
  } = createPdfTemplateReadActions({
    createHttpError,
    query,
    renderListThumbnail,
  });

  function getSourceTemplateMetadata(sourceTemplate, requestedMetadata) {
    return {
      description: requestedMetadata.description,
      generationUnit: sourceTemplate.generationUnit || sourceTemplate.layout?.generation?.unit || requestedMetadata.generationUnit,
      name: requestedMetadata.name,
      orientation: sourceTemplate.orientation || sourceTemplate.layout?.paper?.orientation || requestedMetadata.orientation,
      paperPreset: sourceTemplate.paperPreset || sourceTemplate.layout?.paper?.preset || requestedMetadata.paperPreset,
    };
  }

  async function getDefaultTemplateSource() {
    const defaultSchoolId = await resolveSchoolId();
    const rows = await query(
      `
        SELECT id
        FROM pdf_templates
        WHERE school_id = ?
          AND name = ?
          AND deleted_at IS NULL
        ORDER BY updated_at DESC, created_at DESC, id ASC
        LIMIT 1
      `,
      [defaultSchoolId, defaultTemplateSource.templateName],
    );
    const sourceTemplateId = String(rows[0]?.id || "").trim();

    if (!sourceTemplateId) {
      throw createHttpError(
        404,
        `${defaultTemplateSource.schoolName}의 '${defaultTemplateSource.templateName}' 양식을 찾을 수 없습니다.`,
        "DEFAULT_TEMPLATE_NOT_FOUND",
      );
    }

    const sourceTemplate = await getTemplateById(sourceTemplateId, { schoolId: defaultSchoolId });

    if (!sourceTemplate?.layout) {
      throw createHttpError(
        500,
        `${defaultTemplateSource.schoolName}의 '${defaultTemplateSource.templateName}' 양식 레이아웃을 불러올 수 없습니다.`,
        "DEFAULT_TEMPLATE_LAYOUT_NOT_FOUND",
      );
    }

    return sourceTemplate;
  }

  async function buildTemplateCreationSnapshot(metadata, templateId, options = {}) {
    const creationMode = String(options.creationMode || "").trim();

    const sourceTemplate = await getDefaultTemplateSource();
    const sourceMetadata = getSourceTemplateMetadata(sourceTemplate, metadata);
    const sourceSnapshot = cloneSnapshotWithFreshIds(sourceTemplate.layout, sourceMetadata, templateId, {
      preserveLayoutSettings: true,
    });

    return {
      metadata: sourceMetadata,
      snapshot: creationMode === "blank" ? clearSnapshotCanvasContent(sourceSnapshot) : sourceSnapshot,
    };
  }

  async function createTemplate(payload = {}) {
    const requestedMetadata = normalizeTemplateMetadata(payload);
    const schoolId = await resolveSchoolId(payload.schoolId);
    const templateId = `template-${randomUUID()}`;
    const { metadata, snapshot } = await buildTemplateCreationSnapshot(requestedMetadata, templateId, {
      creationMode: payload.creationMode || payload.templateMode || payload.sourceType || "",
    });
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
          INSERT INTO pdf_templates (
            id,
            school_id,
            name,
            description,
            paper_preset,
            orientation,
            generation_unit,
            is_active,
            cover_enabled,
            content_enabled,
            latest_version_no,
            layout_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          templateId,
          schoolId,
          metadata.name,
          metadata.description,
          metadata.paperPreset,
          metadata.orientation,
          metadata.generationUnit,
          1,
          1,
          1,
          1,
          JSON.stringify(snapshot),
        ],
      );

      await replaceSnapshotRows(connection, templateId, snapshot);
      await insertVersionRow(connection, templateId, 1, snapshot, "system");

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getTemplateById(templateId, { schoolId });
  }

  async function updateTemplate(templateId, payload = {}) {
    const existingTemplate = await getTemplateById(templateId, {
      schoolId: payload.schoolId || "",
    });
    const schoolId = String(existingTemplate.schoolId || (await resolveSchoolId(payload.schoolId))).trim();
    const metadata = normalizeTemplateMetadata(payload, existingTemplate);
    const snapshot = payload.layout
      ? normalizeTemplateLayout(payload.layout, metadata, templateId)
      : applyMetadataToSnapshot(
          existingTemplate.layout || buildBlankTemplateSnapshot(metadata, { templateId }),
          metadata,
          templateId,
        );
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();

      const nextVersionNo = await resolveNextTemplateVersionNo(connection, templateId, existingTemplate.latestVersionNo);

      await connection.query(
        `
          UPDATE pdf_templates
          SET
            name = ?,
            description = ?,
            paper_preset = ?,
            orientation = ?,
            generation_unit = ?,
            latest_version_no = ?,
            layout_json = ?
          WHERE id = ? AND school_id = ? AND deleted_at IS NULL
        `,
        [
          metadata.name,
          metadata.description,
          metadata.paperPreset,
          metadata.orientation,
          metadata.generationUnit,
          nextVersionNo,
          JSON.stringify(snapshot),
          templateId,
          schoolId,
        ],
      );

      await replaceSnapshotRows(connection, templateId, snapshot);
      await insertVersionRow(connection, templateId, nextVersionNo, snapshot, "system");

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getTemplateById(templateId, { schoolId });
  }

  async function deleteTemplate(templateId, options = {}) {
    const existingTemplate = await getTemplateById(templateId, options);
    const schoolId = String(existingTemplate.schoolId || options.schoolId || "").trim();
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(`DELETE FROM pdf_template_elements WHERE template_id = ?`, [templateId]);
      await connection.query(`DELETE FROM pdf_template_pages WHERE template_id = ?`, [templateId]);
      await connection.query(`DELETE FROM pdf_template_versions WHERE template_id = ?`, [templateId]);
      await connection.query(
        `
          DELETE FROM pdf_templates
          WHERE id = ?
            AND school_id = ?
        `,
        [templateId, schoolId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      id: templateId,
      name: existingTemplate.name,
      deleted: true,
    };
  }

  async function duplicateTemplate(templateId, options = {}) {
    const duplicateOptions = normalizeTemplateDuplicateOptions(options);
    const existingTemplate = await getTemplateById(templateId, {
      schoolId: duplicateOptions.lookupSchoolId,
    });
    const schoolId = String(
      duplicateOptions.sourceSchoolId
        ? duplicateOptions.targetSchoolId || (await resolveSchoolId())
        : duplicateOptions.targetSchoolId || existingTemplate.schoolId || (await resolveSchoolId()),
    ).trim();
    const metadata = {
      description: existingTemplate.description,
      generationUnit: existingTemplate.generationUnit,
      name: `${existingTemplate.name} 복사본`,
      orientation: existingTemplate.orientation,
      paperPreset: existingTemplate.paperPreset,
    };
    const nextTemplateId = `template-${randomUUID()}`;
    const snapshot = cloneSnapshotWithFreshIds(existingTemplate.layout, metadata, nextTemplateId);
    const connection = await getPool().getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(
        `
          INSERT INTO pdf_templates (
            id,
            school_id,
            name,
            description,
            paper_preset,
            orientation,
            generation_unit,
            is_active,
            cover_enabled,
            content_enabled,
            latest_version_no,
            layout_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          nextTemplateId,
          schoolId,
          metadata.name,
          metadata.description,
          metadata.paperPreset,
          metadata.orientation,
          metadata.generationUnit,
          1,
          1,
          1,
          1,
          JSON.stringify(snapshot),
        ],
      );
      await replaceSnapshotRows(connection, nextTemplateId, snapshot);
      await insertVersionRow(connection, nextTemplateId, 1, snapshot, "system");
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getTemplateById(nextTemplateId, { schoolId });
  }

  return Object.freeze({
    createTemplate,
    deleteTemplate,
    duplicateTemplate,
    getDashboardTemplateSummary,
    getTemplateById,
    listTemplates,
    updateTemplate,
  });
}

module.exports = {
  createPdfTemplateService,
};
