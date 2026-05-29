export function hasAccess(summary, permissionKey) {
  return Boolean(summary?.access?.permissions?.[permissionKey] ?? summary?.permissions?.[permissionKey]);
}

const schoolWritePermissionKeys = new Set([
  "deleteProjectData",
  "deleteTemplates",
  "generatePdfs",
  "manageCandidates",
  "manageTemplates",
  "previewTemplates",
]);

function getAccessPayload(summary) {
  return summary?.access || summary || {};
}

export function isSchoolWriteRestricted(summary, permissionKey) {
  const access = getAccessPayload(summary);
  const schoolAccess = access.schoolAccess || {};

  return Boolean(
    schoolWritePermissionKeys.has(permissionKey) &&
      String(schoolAccess.schoolId || "").trim() &&
      schoolAccess.canManage === false,
  );
}

export function canUseAccess(summary, permissionKey) {
  return hasAccess(summary, permissionKey) && !isSchoolWriteRestricted(summary, permissionKey);
}
