const {
  countRowsByIds,
  deleteRowsByIds,
  getAffectedRows,
} = require("./counts");
const { normalizeTemplateIds } = require("./filters");
const { mapTemplateDeletionItem } = require("./summary");

async function collectTemplateRows(queryFn, schoolId) {
  return queryFn(
    `
      SELECT
        id,
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
      WHERE school_id = ?
        AND deleted_at IS NULL
      ORDER BY created_at ASC, name ASC, id ASC
    `,
    [schoolId],
  );
}

function createTemplateDeletionService() {
  async function getTemplateDataCounts(queryFn, schoolId, options = {}) {
    const templateRows = await collectTemplateRows(queryFn, schoolId);
    const requestedTemplateIds = normalizeTemplateIds(options.templateIds);
    const requestedTemplateIdSet = new Set(requestedTemplateIds);
    const selectedTemplateRows = options.explicitSelection
      ? templateRows.filter((row) => requestedTemplateIdSet.has(String(row.id || "")))
      : templateRows;
    const templateIds = selectedTemplateRows.map((row) => row.id);
    const [pdfTemplatePages, pdfTemplateElements, pdfTemplateVersions] = await Promise.all([
      countRowsByIds(queryFn, "pdf_template_pages", "template_id", templateIds),
      countRowsByIds(queryFn, "pdf_template_elements", "template_id", templateIds),
      countRowsByIds(queryFn, "pdf_template_versions", "template_id", templateIds),
    ]);

    return {
      pdfTemplateElements,
      pdfTemplatePages,
      pdfTemplateVersions,
      pdfTemplates: selectedTemplateRows.length,
      selectedTemplateIds: normalizeTemplateIds(templateIds),
      templateItems: templateRows.map(mapTemplateDeletionItem),
    };
  }

  async function deleteTemplateData(transactionQuery, schoolId, options = {}) {
    const templateRows = await collectTemplateRows(transactionQuery, schoolId);
    const requestedTemplateIds = normalizeTemplateIds(options.templateIds);
    const requestedTemplateIdSet = new Set(requestedTemplateIds);
    const selectedTemplateRows = options.explicitSelection
      ? templateRows.filter((row) => requestedTemplateIdSet.has(String(row.id || "")))
      : templateRows;
    const templateIds = normalizeTemplateIds(selectedTemplateRows.map((row) => row.id));

    if (templateIds.length) {
      await deleteRowsByIds(
        transactionQuery,
        "DELETE FROM pdf_template_elements WHERE template_id IN",
        templateIds,
      );
      await deleteRowsByIds(
        transactionQuery,
        "DELETE FROM pdf_template_pages WHERE template_id IN",
        templateIds,
      );
      await deleteRowsByIds(
        transactionQuery,
        "DELETE FROM pdf_template_versions WHERE template_id IN",
        templateIds,
      );
    }

    const deleteResult = options.explicitSelection
      ? await deleteRowsByIds(transactionQuery, "DELETE FROM pdf_templates WHERE id IN", templateIds)
      : await transactionQuery("DELETE FROM pdf_templates WHERE school_id = ?", [schoolId]);

    return {
      deletedPdfTemplates: getAffectedRows(deleteResult, selectedTemplateRows.length),
    };
  }

  return Object.freeze({
    deleteTemplateData,
    getTemplateDataCounts,
  });
}

module.exports = {
  collectTemplateRows,
  createTemplateDeletionService,
};
