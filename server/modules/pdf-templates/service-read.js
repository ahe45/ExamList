const { normalizeTemplateLayout } = require("./layout");
const { mapTemplateListRow, parseJsonColumn } = require("./mappers");
const { normalizeListFilter } = require("./validation");

function normalizeTemplateMetadataFromRow(templateRow) {
  return {
    description: String(templateRow.description || ""),
    generationUnit: String(templateRow.generationUnit || "roomCode"),
    name: String(templateRow.name || ""),
    orientation: String(templateRow.orientation || "portrait"),
    paperPreset: String(templateRow.paperPreset || "A4"),
  };
}

function mapTemplateVersionRow(row) {
  return {
    id: String(row.id),
    versionNo: Number(row.versionNo) || 1,
    createdBy: String(row.createdBy || ""),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
  };
}

function createPdfTemplateReadActions({ createHttpError, query, renderListThumbnail = null }) {
  async function mapTemplateListRowForList(row) {
    const shouldUseAsyncThumbnail = typeof renderListThumbnail === "function";
    const item = mapTemplateListRow(row, { renderThumbnail: !shouldUseAsyncThumbnail });

    if (!shouldUseAsyncThumbnail || !item.layout) {
      return item;
    }

    try {
      const thumbnail = await renderListThumbnail(item);

      if (!thumbnail) {
        return item;
      }

      return {
        ...item,
        thumbnailHtml: thumbnail.html,
        thumbnailPage: {
          heightPt: thumbnail.heightPt,
          sourcePageId: thumbnail.sourcePageId,
          sourcePageNumber: thumbnail.sourcePageNumber,
          widthPt: thumbnail.widthPt,
        },
      };
    } catch (_error) {
      return mapTemplateListRow(row);
    }
  }

  async function getTemplateById(templateId, options = {}) {
    const normalizedSchoolId = String(options.schoolId || "").trim();
    const conditions = ["id = ?", "deleted_at IS NULL"];
    const params = [templateId];

    if (normalizedSchoolId) {
      conditions.push("school_id = ?");
      params.push(normalizedSchoolId);
    }

    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          name,
          description,
          paper_preset AS paperPreset,
          orientation,
          generation_unit AS generationUnit,
          latest_version_no AS latestVersionNo,
          layout_json AS layoutJson,
          updated_at AS updatedAt,
          created_at AS createdAt
        FROM pdf_templates
        WHERE ${conditions.join(" AND ")}
        LIMIT 1
      `,
      params,
    );
    const templateRow = rows[0];

    if (!templateRow) {
      throw createHttpError(404, "템플릿을 찾을 수 없습니다.", "TEMPLATE_NOT_FOUND");
    }

    const versionRows = await query(
      `
        SELECT
          id,
          version_no AS versionNo,
          created_by AS createdBy,
          created_at AS createdAt
        FROM pdf_template_versions
        WHERE template_id = ?
        ORDER BY version_no DESC
      `,
      [templateId],
    );
    const normalizedMetadata = normalizeTemplateMetadataFromRow(templateRow);
    const rawLayout = parseJsonColumn(templateRow.layoutJson, null);

    return {
      ...mapTemplateListRow(templateRow),
      createdAt: templateRow.createdAt instanceof Date ? templateRow.createdAt.toISOString() : String(templateRow.createdAt || ""),
      layout: rawLayout ? normalizeTemplateLayout(rawLayout, normalizedMetadata, templateId) : null,
      versions: versionRows.map(mapTemplateVersionRow),
    };
  }

  async function listTemplates(rawFilter = {}) {
    const filter = normalizeListFilter(rawFilter);
    const conditions = ["deleted_at IS NULL"];
    const params = {
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit,
    };
    const schoolId = String(rawFilter.schoolId || "").trim();

    if (schoolId) {
      conditions.push("school_id = :schoolId");
      params.schoolId = schoolId;
    }

    if (filter.keyword) {
      conditions.push("(name LIKE :keyword OR description LIKE :keyword)");
      params.keyword = `%${filter.keyword}%`;
    }

    if (filter.paperPreset) {
      conditions.push("paper_preset = :paperPreset");
      params.paperPreset = filter.paperPreset;
    }

    if (filter.orientation) {
      conditions.push("orientation = :orientation");
      params.orientation = filter.orientation;
    }

    if (filter.generationUnit) {
      conditions.push("generation_unit = :generationUnit");
      params.generationUnit = filter.generationUnit;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countRows = await query(`SELECT COUNT(*) AS total FROM pdf_templates ${whereClause}`, params);
    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          name,
          description,
          paper_preset AS paperPreset,
          orientation,
          generation_unit AS generationUnit,
          latest_version_no AS latestVersionNo,
          layout_json AS layoutJson,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM pdf_templates
        ${whereClause}
        ORDER BY created_at ASC, name ASC, id ASC
        LIMIT :limit OFFSET :offset
      `,
      params,
    );

    return {
      items: await Promise.all(rows.map(mapTemplateListRowForList)),
      total: Number(countRows[0]?.total) || 0,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async function getDashboardTemplateSummary(rawFilter = {}) {
    const schoolId = String(rawFilter.schoolId || "").trim();
    const whereConditions = ["deleted_at IS NULL"];
    const params = {};

    if (schoolId) {
      whereConditions.push("school_id = :schoolId");
      params.schoolId = schoolId;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;
    const countRows = await query(
      `
        SELECT
          COUNT(*) AS totalTemplates
        FROM pdf_templates
        ${whereClause}
      `,
      params,
    );
    const recentRows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          name,
          description,
          paper_preset AS paperPreset,
          orientation,
          generation_unit AS generationUnit,
          latest_version_no AS latestVersionNo,
          updated_at AS updatedAt
        FROM pdf_templates
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT 5
      `,
      params,
    );
    const summaryRow = countRows[0] || {};

    return {
      totalTemplates: Number(summaryRow.totalTemplates) || 0,
      recentTemplates: recentRows.map(mapTemplateListRow),
    };
  }

  return Object.freeze({
    getDashboardTemplateSummary,
    getTemplateById,
    listTemplates,
  });
}

module.exports = {
  createPdfTemplateReadActions,
  mapTemplateVersionRow,
  normalizeTemplateMetadataFromRow,
};
