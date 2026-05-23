const permissionDefinitions = Object.freeze({
  deleteProjectData: Object.freeze({ label: "데이터 삭제" }),
  deleteSchoolsWithoutPassword: Object.freeze({ label: "학교 삭제 비밀번호 생략" }),
  deleteTemplates: Object.freeze({ label: "템플릿 삭제" }),
  downloadPdfs: Object.freeze({ label: "PDF 다운로드" }),
  generatePdfs: Object.freeze({ label: "PDF 생성" }),
  manageAccounts: Object.freeze({ label: "계정 관리" }),
  manageCandidates: Object.freeze({ label: "수험생 데이터 관리" }),
  manageTemplates: Object.freeze({ label: "템플릿 생성/수정" }),
  previewTemplates: Object.freeze({ label: "미리보기" }),
  viewCandidates: Object.freeze({ label: "수험생 데이터 조회" }),
  viewDashboard: Object.freeze({ label: "대시보드 조회" }),
  viewGenerations: Object.freeze({ label: "PDF 생성 이력 조회" }),
  viewTemplates: Object.freeze({ label: "템플릿 조회" }),
});

const roleDefinitions = Object.freeze({
  super_admin: Object.freeze({
    label: "슈퍼 관리자",
    permissions: Object.freeze({
      deleteProjectData: true,
      deleteSchoolsWithoutPassword: true,
      deleteTemplates: true,
      downloadPdfs: true,
      generatePdfs: true,
      manageAccounts: true,
      manageCandidates: true,
      manageTemplates: true,
      previewTemplates: true,
      viewCandidates: true,
      viewDashboard: true,
      viewGenerations: true,
      viewTemplates: true,
    }),
  }),
  admin: Object.freeze({
    label: "관리자",
    permissions: Object.freeze({
      deleteProjectData: true,
      deleteSchoolsWithoutPassword: false,
      deleteTemplates: true,
      downloadPdfs: true,
      generatePdfs: true,
      manageAccounts: false,
      manageCandidates: true,
      manageTemplates: true,
      previewTemplates: true,
      viewCandidates: true,
      viewDashboard: true,
      viewGenerations: true,
      viewTemplates: true,
    }),
  }),
  user: Object.freeze({
    label: "사용자",
    permissions: Object.freeze({
      deleteProjectData: false,
      deleteSchoolsWithoutPassword: false,
      deleteTemplates: false,
      downloadPdfs: true,
      generatePdfs: true,
      manageAccounts: false,
      manageCandidates: false,
      manageTemplates: false,
      previewTemplates: false,
      viewCandidates: false,
      viewDashboard: true,
      viewGenerations: true,
      viewTemplates: true,
    }),
  }),
  guest: Object.freeze({
    label: "로그인 필요",
    permissions: Object.freeze({
      deleteProjectData: false,
      deleteSchoolsWithoutPassword: false,
      deleteTemplates: false,
      downloadPdfs: false,
      generatePdfs: false,
      manageAccounts: false,
      manageCandidates: false,
      manageTemplates: false,
      previewTemplates: false,
      viewCandidates: false,
      viewDashboard: false,
      viewGenerations: false,
      viewTemplates: false,
    }),
  }),
});

const legacyRoleMap = Object.freeze({
  ADMISSION_ADMIN: "admin",
  GUEST: "guest",
  PDF_GENERATOR: "user",
  SUPER_ADMIN: "super_admin",
  TEMPLATE_MANAGER: "admin",
  VIEWER: "user",
});

function normalizeRole(rawRole = "", fallbackRole = "super_admin") {
  const rawValue = String(rawRole || "").trim();
  const mappedRole = legacyRoleMap[rawValue.toUpperCase()] || rawValue.toLowerCase();
  const normalizedFallback = roleDefinitions[fallbackRole] ? fallbackRole : "super_admin";

  return roleDefinitions[mappedRole] ? mappedRole : normalizedFallback;
}

function createPermissionService({ createHttpError }) {
  function getCurrentRole() {
    return normalizeRole(process.env.EXAMLIST_ROLE || process.env.EXAMLIST_DEFAULT_ROLE || "super_admin");
  }

  function getPermissionMap(role = getCurrentRole()) {
    return roleDefinitions[normalizeRole(role)].permissions;
  }

  function hasPermission(permissionKey, role = getCurrentRole()) {
    return Boolean(getPermissionMap(role)[permissionKey]);
  }

  function assertPermission(permissionKey, role = getCurrentRole()) {
    if (hasPermission(permissionKey, role)) {
      return true;
    }

    const permissionLabel = permissionDefinitions[permissionKey]?.label || permissionKey;
    throw createHttpError(403, `${permissionLabel} 권한이 없습니다.`, "FORBIDDEN");
  }

  function getAccessSummary(role = getCurrentRole()) {
    const normalizedRole = normalizeRole(role);
    const roleDefinition = roleDefinitions[normalizedRole];
    const permissions = getPermissionMap(normalizedRole);

    return {
      currentRole: normalizedRole,
      roleLabel: roleDefinition.label,
      permissions: permissions,
    };
  }

  return Object.freeze({
    assertPermission,
    getAccessSummary,
    getCurrentRole,
    getPermissionMap,
    hasPermission,
  });
}

module.exports = {
  createPermissionService,
  normalizeRole,
  permissionDefinitions,
  roleDefinitions,
};
