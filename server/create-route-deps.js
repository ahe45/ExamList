const { readBinaryBody, readJsonBody } = require("./http/body");
const { buildContentDisposition, sendBinary, sendDownload, sendJson } = require("./http/response");
const { createDashboardService } = require("./modules/dashboard/service");

function createRouteDeps(appContext) {
  const { services } = appContext;
  const dashboardService = createDashboardService({
    authService: services.authService,
    candidateRecordService: services.candidateRecordService,
    permissionService: services.permissionService,
    pdfTemplateService: services.pdfTemplateService,
  });

  function assertPermission(permissionKey, request) {
    return services.permissionService.assertPermission(
      permissionKey,
      services.authService.getRequestRoleForPermission(request),
    );
  }

  function hasPermission(permissionKey, request) {
    return services.permissionService.hasPermission(
      permissionKey,
      services.authService.getRequestRoleForPermission(request),
    );
  }

  function login(payload) {
    return services.authService.login(payload).then((loginResult) => {
      const accessSummary = services.permissionService.getAccessSummary(loginResult.role);

      return {
        body: {
          access: accessSummary,
          authenticated: true,
          enabled: services.authService.isEnabled(),
          expiresAt: loginResult.expiresAt,
          role: loginResult.role,
          user: loginResult.user,
        },
        cookie: loginResult.cookie,
      };
    });
  }

  function logout(request) {
    const logoutResult = services.authService.logout(request);
    const authState = services.authService.getSessionState({ headers: {} });
    const accessSummary = services.permissionService.getAccessSummary(authState.role);

    return {
      body: {
        ...authState,
        access: accessSummary,
      },
      cookie: logoutResult.cookie,
    };
  }

  return Object.freeze({
    assertPermission,
    buildCandidateExportBuffer: (...args) => services.candidateRecordService.buildCandidateExportBuffer(...args),
    buildCandidateTemplateBuffer: (...args) => services.candidateRecordService.buildCandidateTemplateBuffer(...args),
    buildContentDisposition,
    cancelPdfGenerationBatch: (...args) => services.pdfGenerationService.cancelPdfGenerationBatch(...args),
    cleanupExpiredPdfGenerations: (...args) => services.pdfGenerationService.cleanupExpiredPdfGenerations(...args),
    createAccount: (...args) => services.authService.createAccount(...args),
    createHttpError: appContext.createHttpError,
    createPdfGeneration: (...args) => services.pdfGenerationService.createPdfGeneration(...args),
    createPdfGenerationArchive: (...args) => services.pdfGenerationService.createPdfGenerationArchive(...args),
    createPdfGenerationBatch: (...args) => services.pdfGenerationService.createPdfGenerationBatch(...args),
    createPdfGenerationPreview: (...args) => services.pdfGenerationService.createPdfGenerationPreview(...args),
    createPdfGenerationMergedFile: (...args) => services.pdfGenerationService.createPdfGenerationMergedFile(...args),
    createSchool: (...args) => services.schoolService.createSchool(...args),
    createTemplate: (...args) => services.pdfTemplateService.createTemplate(...args),
    deleteAccount: (...args) => services.authService.deleteAccount(...args),
    deletePdfGenerations: (...args) => services.pdfGenerationService.deletePdfGenerations(...args),
    deleteProjectData: (...args) => services.dataDeletionService.deleteProjectData(...args),
    deleteSchool: (...args) => services.schoolService.deleteSchool(...args),
    deleteTemplate: (...args) => services.pdfTemplateService.deleteTemplate(...args),
    duplicateTemplate: (...args) => services.pdfTemplateService.duplicateTemplate(...args),
    enqueuePdfGeneration: (...args) => services.pdfGenerationService.enqueuePdfGeneration(...args),
    enqueuePdfGenerationBatch: (...args) => services.pdfGenerationService.enqueuePdfGenerationBatch(...args),
    getAccessSummary: (request) => dashboardService.getAuthSessionPayload(request).access,
    getAuthSession: (request) => dashboardService.getAuthSessionPayload(request),
    getCandidateFieldMap: () => services.candidateRecordService.getCandidateFieldMap(),
    getCandidateFilterOptions: (...args) => services.candidateRecordService.findCandidateFilterOptions(...args),
    getCandidatePhoto: (...args) => services.candidateRecordService.getCandidatePhoto(...args),
    getCandidates: (...args) => services.candidateRecordService.findCandidates(...args),
    getDashboardSummary: (...args) => dashboardService.getDashboardSummary(...args),
    getPdfDataTags: (...args) => services.pdfDataTagService.getCatalog(...args),
    getPdfGenerationArchiveFile: (...args) => services.pdfGenerationService.getPdfGenerationArchiveFile(...args),
    getPdfGenerationBatch: (...args) => services.pdfGenerationService.getPdfGenerationBatch(...args),
    getPdfGenerationDetail: (...args) => services.pdfGenerationService.getPdfGenerationDetail(...args),
    getPdfGenerationFile: (...args) => services.pdfGenerationService.getPdfGenerationFile(...args),
    getPdfGenerationPreviewFile: (...args) => services.pdfGenerationService.getPdfGenerationPreviewFile(...args),
    getPdfGenerationMergedFile: (...args) => services.pdfGenerationService.getPdfGenerationMergedFile(...args),
    getProjectDataDeletionSummary: (...args) => services.dataDeletionService.getProjectDataDeletionSummary(...args),
    getSchool: (...args) => services.schoolService.getSchoolById(...args),
    getSchoolSettings: (...args) => services.schoolSettingsService.getSchoolSettings(...args),
    getTemplate: (...args) => services.pdfTemplateService.getTemplateById(...args),
    hasPermission,
    importCandidates: (...args) => services.candidateRecordService.importCandidates(...args),
    listAccounts: (...args) => services.authService.listAccounts(...args),
    listPdfAuditLogs: (...args) => services.pdfGenerationService.listPdfAuditLogs(...args),
    listPdfGenerationTargets: (...args) => services.pdfGenerationService.listPdfGenerationTargets(...args),
    listPdfGenerations: (...args) => services.pdfGenerationService.listPdfGenerations(...args),
    listSchools: (...args) => services.schoolService.listSchools(...args),
    listTemplates: (...args) => services.pdfTemplateService.listTemplates(...args),
    login,
    logout,
    previewCandidateImport: (...args) => services.candidateRecordService.previewCandidateImport(...args),
    previewCandidatePhotoArchiveBuffer: (...args) =>
      services.candidateRecordService.previewCandidatePhotoArchiveBuffer(...args),
    previewTemplate: (...args) => services.pdfPreviewService.previewTemplate(...args),
    readBinaryBody,
    readJsonBody,
    rerunPdfGeneration: (...args) => services.pdfGenerationService.rerunPdfGeneration(...args),
    rerunPdfGenerationBatch: (...args) => services.pdfGenerationService.rerunPdfGenerationBatch(...args),
    retryPdfGeneration: (...args) => services.pdfGenerationService.retryPdfGeneration(...args),
    saveCandidatePhoto: (...args) => services.candidateRecordService.saveCandidatePhoto(...args),
    saveCandidatePhotoArchiveBuffer: (...args) => services.candidateRecordService.saveCandidatePhotoArchiveBuffer(...args),
    sendBinary,
    sendDownload,
    sendJson,
    updateCandidate: (...args) => services.candidateRecordService.updateCandidate(...args),
    updateAccount: (...args) => services.authService.updateAccount(...args),
    updateSchool: (...args) => services.schoolService.updateSchool(...args),
    updateSchoolSettings: (...args) => services.schoolSettingsService.updateSchoolSettings(...args),
    updateTemplate: (...args) => services.pdfTemplateService.updateTemplate(...args),
  });
}

module.exports = {
  createRouteDeps,
};
