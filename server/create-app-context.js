const fs = require("fs");
const path = require("path");

const { getPool, loadEnvironment, query } = require("../db");
const { createAuthService } = require("./modules/auth/service");
const { createSchemaBootstrapService } = require("./modules/bootstrap/schema");
const { createCandidateRecordService } = require("./modules/candidates/service");
const { createDataDeletionService } = require("./modules/data-deletion/service");
const { createDatabaseErrorTranslator } = require("./modules/database/error-translation");
const { createPermissionService } = require("./modules/permissions/service");
const { createPdfDataTagService } = require("./modules/pdf-data-tags/service");
const { createPdfGenerationService } = require("./modules/pdf-generations/service");
const { createTemplateListThumbnailRenderer } = require("./modules/pdf-preview/list-thumbnail");
const { createPdfPreviewService } = require("./modules/pdf-preview/service");
const { createPdfTemplateService } = require("./modules/pdf-templates/service");
const { createSchoolSettingsService } = require("./modules/school-settings/service");
const { createSchoolService } = require("./modules/schools/service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = Number(statusCode) || 500;
  error.errorCode = errorCode;
  return error;
}

function createAppContext() {
  loadEnvironment();

  const root = path.join(__dirname, "..");
  const schemaBootstrapService = createSchemaBootstrapService({
    fs,
    path,
    root,
    getPool,
  });
  const translateDatabaseError = createDatabaseErrorTranslator({ createHttpError });
  const permissionService = createPermissionService({ createHttpError });
  const authService = createAuthService({ createHttpError, query });
  const schoolService = createSchoolService({
    createHttpError,
    fs,
    getPool,
    path,
    query,
    rootDir: root,
  });
  const schoolSettingsService = createSchoolSettingsService({
    createHttpError,
    getDefaultSchoolId: () => schoolService.getDefaultSchoolId(),
    getSchoolById: (schoolId) => schoolService.getSchoolById(schoolId),
    query,
  });
  const candidateRecordService = createCandidateRecordService({
    createHttpError,
    getDefaultSchoolId: () => schoolService.getDefaultSchoolId(),
    getPool,
    query,
    rootDir: root,
  });
  const pdfDataTagService = createPdfDataTagService({
    getCandidateFieldMap: () => candidateRecordService.getCandidateFieldMap(),
    getSchoolSettings: (...args) => schoolSettingsService.getSchoolSettings(...args),
  });
  const pdfTemplateService = createPdfTemplateService({
    createHttpError,
    getDefaultSchoolId: () => schoolService.getDefaultSchoolId(),
    getPool,
    query,
    renderListThumbnail: createTemplateListThumbnailRenderer({
      schoolSettingsService,
    }),
  });
  const pdfPreviewService = createPdfPreviewService({
    candidateService: candidateRecordService,
    createHttpError,
    pdfTemplateService,
    schoolSettingsService,
  });
  const pdfGenerationService = createPdfGenerationService({
    candidateService: candidateRecordService,
    createHttpError,
    fs,
    path,
    pdfPreviewService,
    query,
    root,
  });
  const dataDeletionService = createDataDeletionService({
    createHttpError,
    fs,
    getPool,
    getSchoolById: (schoolId) => schoolService.getSchoolById(schoolId),
    path,
    query,
    rootDir: root,
  });

  return Object.freeze({
    createHttpError,
    root,
    services: Object.freeze({
      authService,
      candidateRecordService,
      dataDeletionService,
      permissionService,
      pdfDataTagService,
      pdfGenerationService,
      pdfPreviewService,
      pdfTemplateService,
      schoolService,
      schoolSettingsService,
      schemaBootstrapService,
    }),
    translateDatabaseError,
  });
}

module.exports = {
  createAppContext,
  createHttpError,
};
