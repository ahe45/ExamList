const { readBinaryBody, readJsonBody } = require("./http/body");
const { buildContentDisposition, sendBinary, sendDownload, sendJson } = require("./http/response");
const { createDashboardService } = require("./modules/dashboard/service");
const { canManageSchool, getAuthUserId } = require("./modules/schools/access");

function createRouteDeps(appContext) {
  const { services } = appContext;
  const dashboardService = createDashboardService({
    authService: services.authService,
    candidateRecordService: services.candidateRecordService,
    permissionService: services.permissionService,
    pdfTemplateService: services.pdfTemplateService,
    schoolService: services.schoolService,
  });

  function getAuthState(request) {
    return services.authService.getSessionState(request);
  }

  function getRequestAccountId(request) {
    return getAuthUserId(getAuthState(request)) || (services.authService.isEnabled() ? "" : "system");
  }

  function canManageSchoolRecord(school, request) {
    const role = services.authService.getRequestRoleForPermission(request);

    return canManageSchool({
      authState: getAuthState(request),
      role,
      school,
    });
  }

  function withSchoolAccess(school, request) {
    if (!school) {
      return school;
    }

    return {
      ...school,
      canManage: canManageSchoolRecord(school, request),
    };
  }

  async function withSchoolListAccess(payload = {}, request) {
    return {
      ...payload,
      items: (Array.isArray(payload.items) ? payload.items : []).map((school) => withSchoolAccess(school, request)),
    };
  }

  async function assertSchoolWriteAccess(schoolId, request) {
    const school = await services.schoolService.getSchoolById(schoolId);

    if (canManageSchoolRecord(school, request)) {
      return school;
    }

    throw appContext.createHttpError(
      403,
      "이 학교를 생성한 계정 또는 슈퍼 관리자만 변경할 수 있습니다.",
      "SCHOOL_WRITE_FORBIDDEN",
    );
  }

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
    buildAccountTemplateBuffer: (...args) => services.authService.buildAccountTemplateBuffer(...args),
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
    getRequestAccountId,
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
    importAccounts: (...args) => services.authService.importAccounts(...args),
    listAccounts: (...args) => services.authService.listAccounts(...args),
    listPdfGenerationArtifacts: (...args) => services.pdfGenerationService.listPdfGenerationArtifacts(...args),
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
    saveCandidatePhotoArchiveSession: (...args) => services.candidateRecordService.saveCandidatePhotoArchiveSession(...args),
    sendBinary,
    sendDownload,
    sendJson,
    updateCandidate: (...args) => services.candidateRecordService.updateCandidate(...args),
    updateAccount: (...args) => services.authService.updateAccount(...args),
    updateSchool: (...args) => services.schoolService.updateSchool(...args),
    updateSchoolSettings: (...args) => services.schoolSettingsService.updateSchoolSettings(...args),
    updateTemplate: (...args) => services.pdfTemplateService.updateTemplate(...args),
    assertSchoolWriteAccess,
    withSchoolAccess,
    withSchoolListAccess,
  });
}

module.exports = {
  createRouteDeps,
};
