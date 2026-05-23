function getEmptyDashboardSummary(accessSummary, warnings = []) {
  return {
    access: accessSummary,
    activeTemplates: 0,
    admissions: [],
    inactiveTemplates: 0,
    recentTemplates: [],
    totalCandidates: 0,
    totalRooms: 0,
    totalTemplates: 0,
    warnings,
  };
}

function createDashboardService({
  authService,
  candidateRecordService,
  permissionService,
  pdfTemplateService,
}) {
  function getAuthSessionPayload(request) {
    const authState = authService.getSessionState(request);
    const accessSummary = permissionService.getAccessSummary(authState.role);

    return {
      ...authState,
      access: accessSummary,
    };
  }

  async function getDashboardSummary(request, options = {}) {
    const authPayload = getAuthSessionPayload(request);
    const accessSummary = authPayload.access;
    const schoolId = String(options.schoolId || "").trim();

    if (authPayload.enabled && !authPayload.authenticated) {
      return {
        ...getEmptyDashboardSummary(accessSummary, ["로그인이 필요합니다."]),
        auth: {
          authenticated: authPayload.authenticated,
          enabled: authPayload.enabled,
          role: authPayload.role,
          user: authPayload.user,
        },
      };
    }

    const [templateResult, candidateResult] = await Promise.allSettled([
      pdfTemplateService.getDashboardTemplateSummary({ schoolId }),
      accessSummary.permissions.viewCandidates
        ? candidateRecordService.getDashboardCandidateSummary({ schoolId })
        : Promise.resolve({
            totalCandidates: 0,
            totalRooms: 0,
            admissions: [],
          }),
    ]);
    const warnings = [];
    const templateSummary =
      templateResult.status === "fulfilled"
        ? templateResult.value
        : {
            totalTemplates: 0,
            activeTemplates: 0,
            inactiveTemplates: 0,
            recentTemplates: [],
          };
    const candidateSummary =
      candidateResult.status === "fulfilled"
        ? candidateResult.value
        : {
            totalCandidates: 0,
            totalRooms: 0,
            admissions: [],
          };

    if (templateResult.status === "rejected") {
      warnings.push("템플릿 통계를 불러오지 못했습니다.");
    }

    if (candidateResult.status === "rejected") {
      warnings.push("프로젝트 수험생 데이터에 연결하지 못했습니다.");
    } else if (!accessSummary.permissions.viewCandidates) {
      warnings.push("현재 권한으로는 수험생 통계를 표시하지 않습니다.");
    }

    return {
      ...templateSummary,
      ...candidateSummary,
      access: accessSummary,
      auth: {
        authenticated: authPayload.authenticated,
        enabled: authPayload.enabled,
        role: authPayload.role,
        user: authPayload.user,
      },
      warnings,
    };
  }

  return Object.freeze({
    getAuthSessionPayload,
    getDashboardSummary,
  });
}

module.exports = {
  createDashboardService,
  getEmptyDashboardSummary,
};
