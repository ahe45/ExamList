const schoolWritePermissionKeys = Object.freeze([
  "deleteProjectData",
  "deleteTemplates",
  "generatePdfs",
  "manageCandidates",
  "manageTemplates",
  "previewTemplates",
]);

function getAuthUserId(authState = {}) {
  return String(authState?.user?.userId || authState?.user?.username || "").trim();
}

function canManageSchool({ authState = {}, role = "", school = {} } = {}) {
  const normalizedRole = String(role || authState?.role || "").trim();

  if (normalizedRole === "super_admin") {
    return true;
  }

  const userId = getAuthUserId(authState);
  const createdAccount = String(school?.createdAccount || school?.created_account || "").trim();

  return Boolean(userId && createdAccount && userId === createdAccount);
}

function applySchoolAccessToSummary(accessSummary = {}, schoolAccess = null) {
  if (!schoolAccess?.schoolId) {
    return accessSummary;
  }

  const permissions = {
    ...(accessSummary.permissions || {}),
  };
  const restrictedPermissions = schoolAccess.canManage
    ? []
    : schoolWritePermissionKeys.filter((permissionKey) => permissions[permissionKey]);

  return {
    ...accessSummary,
    permissions,
    schoolAccess: {
      canManage: Boolean(schoolAccess.canManage),
      createdAccount: String(schoolAccess.createdAccount || ""),
      restrictedPermissions,
      schoolId: String(schoolAccess.schoolId || ""),
    },
  };
}

module.exports = {
  applySchoolAccessToSummary,
  canManageSchool,
  getAuthUserId,
  schoolWritePermissionKeys,
};
