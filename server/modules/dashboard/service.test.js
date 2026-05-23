const test = require("node:test");
const assert = require("node:assert/strict");

const { createDashboardService } = require("./service");

function createAccessSummary(viewCandidates = true) {
  return {
    currentRole: "user",
    permissions: {
      viewCandidates,
    },
  };
}

test("dashboard summary returns auth warning without loading data when login is required", async () => {
  let templateSummaryLoaded = false;
  let candidateSummaryLoaded = false;
  const service = createDashboardService({
    authService: {
      getSessionState: () => ({
        authenticated: false,
        enabled: true,
        role: "user",
        user: null,
      }),
    },
    candidateRecordService: {
      getDashboardCandidateSummary: async () => {
        candidateSummaryLoaded = true;
      },
    },
    permissionService: {
      getAccessSummary: () => createAccessSummary(true),
    },
    pdfTemplateService: {
      getDashboardTemplateSummary: async () => {
        templateSummaryLoaded = true;
      },
    },
  });

  const summary = await service.getDashboardSummary({ headers: {} });

  assert.equal(summary.totalTemplates, 0);
  assert.equal(summary.totalCandidates, 0);
  assert.equal(summary.auth.authenticated, false);
  assert.deepEqual(summary.warnings, ["로그인이 필요합니다."]);
  assert.equal(templateSummaryLoaded, false);
  assert.equal(candidateSummaryLoaded, false);
});

test("dashboard summary skips candidate statistics when permission is missing", async () => {
  let candidateSummaryLoaded = false;
  const service = createDashboardService({
    authService: {
      getSessionState: () => ({
        authenticated: true,
        enabled: true,
        role: "user",
        user: { username: "operator" },
      }),
    },
    candidateRecordService: {
      getDashboardCandidateSummary: async () => {
        candidateSummaryLoaded = true;
      },
    },
    permissionService: {
      getAccessSummary: () => createAccessSummary(false),
    },
    pdfTemplateService: {
      getDashboardTemplateSummary: async () => ({
        activeTemplates: 1,
        inactiveTemplates: 0,
        recentTemplates: [{ id: "template-1" }],
        totalTemplates: 1,
      }),
    },
  });

  const summary = await service.getDashboardSummary({ headers: {} }, { schoolId: "school-1" });

  assert.equal(summary.totalTemplates, 1);
  assert.equal(summary.totalCandidates, 0);
  assert.equal(candidateSummaryLoaded, false);
  assert.deepEqual(summary.warnings, ["현재 권한으로는 수험생 통계를 표시하지 않습니다."]);
});
