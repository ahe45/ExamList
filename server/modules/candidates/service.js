const { candidateFieldMap } = require("./field-map");
const { createCandidateImportService } = require("./import-service");
const { assertUniqueCandidateLocationCodes, lockCandidateSchool } = require("./location-code-policy");
const { withDatabaseTransaction } = require("../database/connection");
const {
  normalizeCandidateFilter,
  normalizeCandidateRecordInput,
  parseCandidateCsv,
  toCandidateWorkbookRow,
} = require("./normalization");
const { createCandidatePhotoService } = require("./photos");
const { createCandidateRepository } = require("./repository");
const { createCandidateWorkbookService } = require("./workbook");

function createCandidateRecordService({ createHttpError, getDefaultSchoolId = null, getPool, getSchoolById = null, query, rootDir }) {
  const candidateWorkbookService = createCandidateWorkbookService({ createHttpError });
  const candidatePhotoService = createCandidatePhotoService({
    createHttpError,
    getSchoolById,
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
    previewCandidatePhotoArchiveStream,
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
    rootDir,
    createHttpError,
    getPool,
    normalizeCandidateWorkbookInput,
    parseCandidateWorkbook,
    query,
    resolveSchoolId,
    toCandidateWorkbookRow,
    upsertCandidateWorkbookRows: candidateRepository.upsertCandidateWorkbookRows,
  });
  const { importCandidates, previewCandidateImport } = candidateImportService;
  const {
    findCandidateFilterOptions,
    findCandidateGridOptions,
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
    const requestedSchoolId = String(options.schoolId || payload.schoolId || "").trim();

    if (!normalizedCandidateId) {
      throw createHttpError(400, "수험생 식별자가 필요합니다.", "CANDIDATE_ID_REQUIRED");
    }

    const schoolId = requestedSchoolId || (await candidateRepository.getCandidateWorkbookRowById(normalizedCandidateId))?.schoolId;
    if (!schoolId) {
      throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.", "CANDIDATE_NOT_FOUND");
    }

    await withDatabaseTransaction(getPool, async (connection) => {
      await lockCandidateSchool(connection, schoolId);
      const writeOptions = { connection, schoolId };
      const existingCandidate = await candidateRepository.getCandidateWorkbookRowById(normalizedCandidateId, writeOptions);

      if (!existingCandidate) {
        throw createHttpError(404, "수험생 정보를 찾을 수 없습니다.", "CANDIDATE_NOT_FOUND");
      }

      const normalizedRow = normalizeCandidateWorkbookInput({ ...toCandidateWorkbookRow(existingCandidate), ...payload }, -1);
      await candidateRepository.updateCandidateRowById(normalizedCandidateId, normalizedRow, writeOptions);
      await assertUniqueCandidateLocationCodes(connection, schoolId, [normalizedRow], createHttpError);
    });

    return candidateRepository.getCandidateViewRowById(normalizedCandidateId, { schoolId });
  }

  async function exportCandidateRows(filters = {}) {
    const first = await findCandidates({ ...filters, page: 1, limit: 5000 });
    const rows = [...first.items];
    for (let page = 2; page <= Math.ceil(first.total / first.limit); page++) {
      rows.push(...(await findCandidates({ ...filters, page, limit: 5000 })).items);
    }
    return buildCandidateExportBuffer(rows);
  }

  return Object.freeze({
    exportCandidateRows,
    findCandidateGridOptions,
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
    previewCandidatePhotoArchiveStream,
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
