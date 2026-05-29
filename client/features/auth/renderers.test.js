import test from "node:test";
import assert from "node:assert/strict";

import { renderAuthStatus } from "./renderers.js";

test("topbar shows read-only school badge next to the current school", () => {
  const html = renderAuthStatus({
    access: {
      currentRole: "admin",
      roleLabel: "관리자",
      schoolAccess: {
        canManage: false,
        schoolId: "school-readonly",
      },
    },
    auth: {
      authenticated: true,
      enabled: true,
      role: "admin",
      user: {
        userId: "other-admin",
      },
    },
    currentView: "templateManagement",
    school: {
      code: "SEOUL",
      id: "school-readonly",
      name: "서울대학교",
    },
  });

  assert.match(html, /topbar-school-card/);
  assert.match(html, /topbar-school-readonly-badge/);
  assert.match(html, /현재 학교는 읽기 전용입니다\./);
  assert.ok(html.indexOf("topbar-school-readonly-badge") < html.indexOf("topbar-school-card"));
});
