const { candidateFieldMap } = require("./field-map");
const { createCandidateImportService } = require("./import-service");
const {
  normalizeCandidateFilter,
  normalizeCandidateRecordInput,
  parseCandidateCsv,
  toCandidateWorkbookRow,
} = require("./normalization");
const { createCandidatePhotoService } = require("./photos");
const { createCandidateRepository } = require("./repository");
const { createCandidateWorkbookService } = require("./workbook");

function createCandidateRecordService({ createHttpError, getDefaultSchoolId = null, getPool, query, rootDir }) {
  const candidateWorkbookService = createCandidateWorkbookService({ createHttpError });
  const candidatePhotoService = createCandidatePhotoService({
    createHttpError,
    getPool,
    query,
    rootDir,
  });
  const {
    buildCandidateExportBuffer,
    buildCandidateTemplateBuffer,
    normalizeCandidateWorkbookInput,
    parseCandidateWorkbook,
  } = candidateWorkbookService;
  const {
    getCandidatePhoto,
    hydrateCandidatesWithPhotos,
    previewCandidatePhotoArchiveBuffer,
    saveCandidatePhoto,
    saveCandidatePhotoArchiveBuffer,
    saveCandidatePhotoArchiveSession,
  } = candidatePhotoService;
  const candidateRepository = createCandidateRepository({
    createHttpError,
    query,
    resolveSchoolId,
  });
  const candidateImportService = createCandidateImportService({
    createHttpError,
    insertCandidateWorkbookRow: candidateRepository.insertCandidateWorkbookRow,
    normalizeCandidateWorkbookInput,
    parseCandidateWorkbook,
    query,
    resolveSchoolId,
    toCandidateWorkbookRow,
    updateCandidateRowById: candidateRepository.updateCandidateRowById,
  });
  const { importCandidates, previewCandidateImport } = candidateImportService;
  const {
    findCandidateFilterOptions,
    findCandidateGroups,
    findCandidates,
    getDashboardCandidateSummary,
  } = candidateRepository;

  async function resolveSchoolId(schoolId = "") {
    const normalizedSchoolId = String(schoolId || "").trim();

    if (normalizedSchoolId) {
      return normalizedSchoolId;
    }

    return typeof getDefaultSchoolId === "function" ? getDefaultSchoolId() : "school-default";
  }

  async function updateCandidate(candidateId, payload = {}, options = {}) {
    const normalizedCandidateId = String(candidateId || "").trim();
    const schoolId = String(options.schoolId || payload.schoolId || "").trim();

    if (!normalizedCandidateId) {
      throw createHttpError(400, "수험생 식별자가 필요합니다.", "CANDIDATE_ID_REQUIRED");
    }

    const existingCandidate = await candidateRepository.getCandidateWorkbookRowById(normalizedCandidateId, { schoolId });

    if (!existingCandidate) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.", "CANDIDATE_NOT_FOUND");
    }

    const normalizedRow = normalizeCandidateWorkbookInput(
      {
        ...toCandidateWorkbookRow(existingCandidate),
        ...payload,
      },
      -1,
    );

    await candidateRepository.updateCandidateRowById(normalizedCandidateId, normalizedRow, { schoolId });

    return candidateRepository.getCandidateViewRowById(normalizedCandidateId, { schoolId });
  }

  return Object.freeze({
    buildCandidateExportBuffer,
    buildCandidateTemplateBuffer,
    findCandidateFilterOptions,
    findCandidateGroups,
    findCandidates,
    getCandidateFieldMap: () => candidateFieldMap,
    getCandidatePhoto,
    getDashboardCandidateSummary,
    hydrateCandidatesWithPhotos,
    importCandidates,
    previewCandidateImport,
    previewCandidatePhotoArchiveBuffer,
    saveCandidatePhoto,
    saveCandidatePhotoArchiveBuffer,
    saveCandidatePhotoArchiveSession,
    updateCandidate,
  });
}

module.exports = {
  createCandidateRecordService,
  normalizeCandidateRecordInput,
  normalizeCandidateFilter,
  parseCandidateCsv,
};
