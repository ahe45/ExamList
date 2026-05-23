const nodeFs = require("fs");
const nodePath = require("path");

const { createCandidateDeletionService } = require("./candidate-deletion");
const { deleteFiles } = require("./file-delete");
const {
  dataDeletionScopeDefinitions,
  hasDataDeletionFilters,
  hasExplicitTemplateIdSelection,
  normalizeDataDeletionFilters,
  normalizeDataDeletionScope,
  normalizeTemplateIds,
} = require("./filters");
const { createPdfGenerationDeleteService } = require("./pdf-generation-delete-service");
const {
  buildDataDeletionScopeSummaries,
  createEmptyDeletionCounts,
} = require("./summary");
const { createTemplateDeletionService } = require("./template-deletion");

const DATA_DELETION_CONFIRMATION_PHRASE = "전체 데이터 삭제";

function createDataDeletionService({
  createHttpError,
  fs: fileSystem = nodeFs,
  getPool = null,
  getSchoolById,
  path: pathModule = nodePath,
  query,
  rootDir = process.cwd(),
}) {
  const {
    deleteCandidatePhotos,
    deleteCandidateRecords,
    getCandidateDataCounts,
  } = createCandidateDeletionService({ pathModule, rootDir });
  const {
    deletePdfGenerationData,
    getPdfGenerationDataCounts,
  } = createPdfGenerationDeleteService();
  const {
    deleteTemplateData,
    getTemplateDataCounts,
  } = createTemplateDeletionService();

  async function runTransaction(callback) {
    if (typeof getPool !== "function") {
      return callback(query);
    }

    const connection = await getPool().getConnection();
    const transactionQuery = async (sql, params = []) => {
      const [rows] = await connection.query(sql, params);

      return rows;
    };

    try {
      await connection.beginTransaction();
      const result = await callback(transactionQuery);

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  }

  async function resolveSchool(schoolId = "") {
    const normalizedSchoolIdentifier = String(schoolId || "").trim();

    if (!normalizedSchoolIdentifier) {
      throw createHttpError(400, "학교 식별자가 필요합니다.", "SCHOOL_ID_REQUIRED");
    }

    if (typeof getSchoolById !== "function") {
      throw new TypeError("A school lookup function is required.");
    }

    return getSchoolById(normalizedSchoolIdentifier);
  }

  async function deleteProjectData(scope, request = {}) {
    const normalizedScope = normalizeDataDeletionScope(scope || request.scope);
    const filters = normalizedScope === "templates"
      ? {}
      : normalizeDataDeletionFilters(request.filters || request.targetFilters || {});
    const isFilteredDeletion = hasDataDeletionFilters(filters);
    const explicitTemplateSelection = normalizedScope === "templates" && hasExplicitTemplateIdSelection(request);
    const templateIds = normalizeTemplateIds(request.templateIds);

    if (!normalizedScope) {
      throw createHttpError(400, "삭제 범위가 올바르지 않습니다.", "DATA_DELETION_SCOPE_INVALID");
    }

    if (
      normalizedScope === "all" &&
      String(request.confirmationPhrase || "").trim() !== DATA_DELETION_CONFIRMATION_PHRASE
    ) {
      throw createHttpError(400, "전체 데이터 삭제 확인 문구가 일치하지 않습니다.", "DATA_DELETION_CONFIRMATION_REQUIRED");
    }

    const school = await resolveSchool(request.schoolId || request.schoolCode || "");
    const deletion = await runTransaction(async (transactionQuery) => {
      const counts = createEmptyDeletionCounts();
      const candidatePhotoFilePaths = [];
      const pdfFilePaths = [];

      if (normalizedScope === "all" || normalizedScope === "pdf-generations") {
        const pdfDeletion = await deletePdfGenerationData(transactionQuery, school.id, filters);

        counts.pdfAuditLogs += pdfDeletion.deletedPdfAuditLogs;
        counts.pdfGenerationBatches += pdfDeletion.deletedPdfGenerationBatches;
        counts.pdfGenerationHistories += pdfDeletion.deletedPdfGenerationHistories;
        pdfFilePaths.push(...pdfDeletion.pdfFilePaths);
      }

      if (normalizedScope === "all" || normalizedScope === "candidates") {
        const candidateDeletion = await deleteCandidateRecords(transactionQuery, school.id, filters);

        counts.candidatePhotos += candidateDeletion.deletedCandidatePhotos;
        counts.candidateRecords += candidateDeletion.deletedCandidateRecords;
        candidatePhotoFilePaths.push(...candidateDeletion.candidatePhotoFilePaths);
      } else if (normalizedScope === "photos") {
        const photoDeletion = await deleteCandidatePhotos(transactionQuery, school.id, filters);

        counts.candidatePhotos += photoDeletion.deletedCandidatePhotos;
        candidatePhotoFilePaths.push(...photoDeletion.candidatePhotoFilePaths);
      }

      if (!isFilteredDeletion && (normalizedScope === "all" || normalizedScope === "templates")) {
        const templateDeletion = await deleteTemplateData(transactionQuery, school.id, {
          explicitSelection: explicitTemplateSelection,
          templateIds,
        });

        counts.pdfTemplates += templateDeletion.deletedPdfTemplates;
      }

      await transactionQuery(
        "UPDATE schools SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
        [school.id],
      );

      return {
        candidatePhotoFilePaths,
        counts,
        pdfFilePaths,
      };
    });
    const pdfFileDeleteResult = await deleteFiles(fileSystem, deletion.pdfFilePaths);
    const candidatePhotoDeleteResult = await deleteFiles(fileSystem, deletion.candidatePhotoFilePaths);

    return {
      deleted: true,
      deletedCandidatePhotoFiles: candidatePhotoDeleteResult.deletedCount,
      deletedCandidatePhotos: deletion.counts.candidatePhotos,
      deletedCandidateRecords: deletion.counts.candidateRecords,
      deletedPdfAuditLogs: deletion.counts.pdfAuditLogs,
      deletedPdfFiles: pdfFileDeleteResult.deletedCount,
      deletedPdfGenerationBatches: deletion.counts.pdfGenerationBatches,
      deletedPdfGenerationHistories: deletion.counts.pdfGenerationHistories,
      deletedPdfTemplates: deletion.counts.pdfTemplates,
      missingCandidatePhotoFiles: candidatePhotoDeleteResult.missingCount,
      missingPdfFiles: pdfFileDeleteResult.missingCount,
      schoolId: school.id,
      schoolName: school.name,
      scope: normalizedScope,
      scopeLabel: dataDeletionScopeDefinitions[normalizedScope].label,
      filters,
    };
  }

  async function getProjectDataDeletionSummary(request = {}) {
    const school = await resolveSchool(request.schoolId || request.schoolCode || "");
    const filters = normalizeDataDeletionFilters(request.filters || request.targetFilters || {});
    const isFilteredDeletion = hasDataDeletionFilters(filters);
    const explicitTemplateSelection = hasExplicitTemplateIdSelection(request);
    const templateData = !isFilteredDeletion || explicitTemplateSelection
      ? await getTemplateDataCounts(query, school.id, {
          explicitSelection: explicitTemplateSelection,
          templateIds: request.templateIds,
        })
      : {};
    const {
      selectedTemplateIds = [],
      templateItems = [],
      ...templateCounts
    } = templateData;
    const counts = {
      ...createEmptyDeletionCounts(),
      ...(await getCandidateDataCounts(query, school.id, filters)),
      ...(await getPdfGenerationDataCounts(query, school.id, filters)),
      ...templateCounts,
    };

    return {
      counts,
      filterMode: isFilteredDeletion ? "filtered" : "school",
      filters,
      schoolId: school.id,
      schoolName: school.name,
      scopes: buildDataDeletionScopeSummaries(counts),
      templates: {
        items: templateItems,
        selectedIds: selectedTemplateIds,
      },
      templatesExcludedByFilters: isFilteredDeletion,
    };
  }

  return Object.freeze({
    deleteProjectData,
    getProjectDataDeletionSummary,
  });
}

module.exports = {
  DATA_DELETION_CONFIRMATION_PHRASE,
  buildDataDeletionScopeSummaries,
  createDataDeletionService,
  dataDeletionScopeDefinitions,
  normalizeDataDeletionFilters,
  normalizeDataDeletionScope,
};
