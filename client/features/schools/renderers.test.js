import test from "node:test";
import assert from "node:assert/strict";

import { renderSchoolManagementView } from "./renderers.js";

function createSchoolsState(overrides = {}) {
  return {
    filters: { keyword: "" },
    items: [],
    loading: false,
    modal: {
      academicYear: "",
      code: "",
      deletionPassword: "",
      deletionPasswordConfirm: "",
      description: "",
      errorMessage: "",
      isActive: true,
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
