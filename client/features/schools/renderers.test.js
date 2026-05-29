import test from "node:test";
import assert from "node:assert/strict";

import { renderSchoolManagementView } from "./renderers.js";

function createSchoolsState(overrides = {}) {
  return {
    filters: { keyword: "" },
    deletingSchoolId: "",
    deletionProgress: {
      candidateCount: 0,
      message: "",
      schoolName: "",
      stageLabel: "",
      templateCount: 0,
    },
    isDeleting: false,
    items: [],
    loading: false,
    modal: {
      academicYear: "",
      code: "",
      deletionPassword: "",
      deletionPasswordConfirm: "",
      description: "",
      errorMessage: "",
      isOpen: false,
      isSaving: false,
      logoDataUrl: "",
      mode: "create",
      name: "",
      schoolId: "",
      settingsLoading: false,
    },
    total: 0,
    ...overrides,
  };
}

test("school management shows account management only to super administrators", () => {
  const superAdminHtml = renderSchoolManagementView({
    access: {
      permissions: {
        manageAccounts: true,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState(),
  });
  const adminHtml = renderSchoolManagementView({
    access: {
      permissions: {
        manageAccounts: false,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState(),
  });

  assert.match(superAdminHtml, /data-go-view="accountManagement"/);
  assert.match(superAdminHtml, /계정관리/);
  assert.doesNotMatch(adminHtml, /data-go-view="accountManagement"/);
  assert.match(adminHtml, /새 학교/);
});

test("school create modal renders deletion password fields under description", () => {
  const html = renderSchoolManagementView({
    access: {
      permissions: {
        deleteSchoolsWithoutPassword: false,
        manageAccounts: false,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState({
      modal: {
        ...createSchoolsState().modal,
        description: "설명",
        isOpen: true,
      },
    }),
  });

  assert.ok(html.indexOf("학교 설명") === -1);
  assert.ok(html.indexOf("삭제 비밀번호") > html.indexOf("설명"));
  assert.match(html, /data-school-modal-field="deletionPassword"/);
  assert.match(html, /data-school-modal-field="deletionPasswordConfirm"/);
  assert.match(html, /name="deletionPassword"[\s\S]*required/);
  assert.match(html, /name="deletionPasswordConfirm"[\s\S]*required/);
  assert.match(html, /school-modal-deletion-password-row/);
});

test("school management disables delete action for Korea University", () => {
  const html = renderSchoolManagementView({
    access: {
      permissions: {
        manageAccounts: false,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState({
      items: [
        {
          candidateCount: 0,
          code: "KOREA",
          id: "school-korea",
          name: "한국대학교",
          templateCount: 1,
          updatedAt: "2026-05-20T00:00:00.000Z",
        },
      ],
    }),
  });

  assert.match(html, /school-settings-button/);
  assert.match(html, /school-delete-button[\s\S]*disabled/);
  assert.match(html, /한국대학교는 삭제할 수 없습니다/);
});

test("school management disables row edit actions when school access is read-only", () => {
  const html = renderSchoolManagementView({
    access: {
      permissions: {
        manageAccounts: false,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState({
      items: [
        {
          canManage: false,
          candidateCount: 0,
          code: "SEOUL",
          id: "school-seoul",
          name: "서울대학교",
          templateCount: 1,
          updatedAt: "2026-05-20T00:00:00.000Z",
        },
      ],
    }),
  });

  assert.match(html, /school-settings-button[\s\S]*disabled/);
  assert.match(html, /school-delete-button[\s\S]*disabled/);
  assert.match(html, /서울대학교/);
});

test("school management renders creator id badge after updated time", () => {
  const html = renderSchoolManagementView({
    access: {
      permissions: {
        manageAccounts: false,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState({
      items: [
        {
          candidateCount: 0,
          code: "SEOUL",
          createdAccount: "owner-admin",
          id: "school-seoul",
          name: "서울대학교",
          templateCount: 1,
          updatedAt: "2026-05-20T00:00:00.000Z",
        },
      ],
    }),
  });

  assert.match(html, /최종수정일시 :/);
  assert.match(html, /school-created-account-badge">owner-admin/);
  assert.doesNotMatch(html, /생성자 ID :/);
  assert.ok(html.indexOf("최종수정일시 :") < html.indexOf("owner-admin"));
});

test("school management renders deletion progress overlay with known counts", () => {
  const html = renderSchoolManagementView({
    access: {
      permissions: {
        manageAccounts: false,
        manageTemplates: true,
      },
    },
    schools: createSchoolsState({
      deletingSchoolId: "school-seoul",
      deletionProgress: {
        candidateCount: 24,
        message: "학교 목록을 갱신하고 있습니다.",
        schoolName: "서울대학교",
        stageLabel: "목록 갱신",
        templateCount: 3,
      },
      isDeleting: true,
      items: [
        {
          candidateCount: 24,
          code: "SEOUL",
          id: "school-seoul",
          name: "서울대학교",
          templateCount: 3,
          updatedAt: "2026-05-20T00:00:00.000Z",
        },
      ],
    }),
  });

  assert.match(html, /busy-overlay school-delete-progress-overlay/);
  assert.match(html, /data-school-delete-progress-overlay/);
  assert.match(html, /서울대학교 삭제 중/);
  assert.match(html, /수험생/);
  assert.match(html, /24건/);
  assert.match(html, /양식/);
  assert.match(html, /3개/);
  assert.match(html, /school-delete-button is-loading/);
  assert.match(html, /progress-bar is-indeterminate/);
});
