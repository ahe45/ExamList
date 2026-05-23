const test = require("node:test");
const assert = require("node:assert/strict");

const { createPermissionService, normalizeRole } = require("./service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("normalizeRole supports new roles and legacy aliases", () => {
  assert.equal(normalizeRole("admin"), "admin");
  assert.equal(normalizeRole("SUPER_ADMIN"), "super_admin");
  assert.equal(normalizeRole("TEMPLATE_MANAGER"), "admin");
  assert.equal(normalizeRole("PDF_GENERATOR"), "user");
  assert.equal(normalizeRole("unknown-role"), "super_admin");
});

test("permission service returns role summary and blocks missing permissions", () => {
  const previousRole = process.env.EXAMLIST_ROLE;
  process.env.EXAMLIST_ROLE = "user";

  try {
    const permissionService = createPermissionService({ createHttpError });
    const accessSummary = permissionService.getAccessSummary();

    assert.equal(accessSummary.currentRole, "user");
    assert.equal(accessSummary.permissions.deleteProjectData, false);
    assert.equal(accessSummary.permissions.manageAccounts, false);
    assert.equal(accessSummary.permissions.manageTemplates, false);
    assert.equal(accessSummary.permissions.generatePdfs, true);
    assert.equal(accessSummary.permissions.downloadPdfs, true);
    assert.throws(
      () => permissionService.assertPermission("manageTemplates"),
      /템플릿 생성\/수정 권한이 없습니다/,
    );
  } finally {
    if (typeof previousRole === "undefined") {
      delete process.env.EXAMLIST_ROLE;
    } else {
      process.env.EXAMLIST_ROLE = previousRole;
    }
  }
});

test("permission service applies simplified role matrix", () => {
  const permissionService = createPermissionService({ createHttpError });
  const superAdmin = permissionService.getAccessSummary("super_admin").permissions;
  const admin = permissionService.getAccessSummary("admin").permissions;
  const user = permissionService.getAccessSummary("user").permissions;

  assert.equal(Object.values(superAdmin).every(Boolean), true);
  assert.equal(admin.manageTemplates, true);
  assert.equal(admin.manageCandidates, true);
  assert.equal(admin.generatePdfs, true);
  assert.equal(admin.downloadPdfs, true);
  assert.equal(admin.deleteProjectData, true);
  assert.equal(admin.deleteTemplates, true);
  assert.equal(admin.manageAccounts, false);
  assert.equal(admin.deleteSchoolsWithoutPassword, false);
  assert.equal(user.manageTemplates, false);
  assert.equal(user.manageCandidates, false);
  assert.equal(user.generatePdfs, true);
  assert.equal(user.downloadPdfs, true);
});
