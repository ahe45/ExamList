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
      campusName: "서울캠퍼스",
      code: "SEOUL",
      id: "school-readonly",
      name: "서울대학교",
    },
  });

  assert.match(html, /topbar-school-card/);
  assert.match(html, /id="currentSchoolCampusName">서울캠퍼스/);
  assert.doesNotMatch(html, /id="currentSchoolCode"/);
  assert.match(html, /topbar-school-readonly-badge/);
  assert.match(html, /현재 학교는 읽기 전용입니다\./);
  assert.ok(html.indexOf("topbar-school-readonly-badge") < html.indexOf("topbar-school-card"));
});

test("topbar uses campus fallback instead of school code when campus is not configured", () => {
  const html = renderAuthStatus({
    access: {
      currentRole: "admin",
      roleLabel: "관리자",
      schoolAccess: {
        canManage: true,
        schoolId: "school-no-campus",
      },
    },
    auth: {
      authenticated: true,
      enabled: true,
      role: "admin",
      user: {
        userId: "admin",
      },
    },
    currentView: "templateManagement",
    school: {
      campusName: "",
      code: "NC01",
      id: "school-no-campus",
      name: "캠퍼스없는대학교",
    },
  });

  assert.match(html, /id="currentSchoolCampusName">캠퍼스 미설정/);
  assert.doesNotMatch(html, /id="currentSchoolCode"/);
  assert.doesNotMatch(html, />NC01</);
});
