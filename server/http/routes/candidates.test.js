const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidateRoutes } = require("./candidates");

test("candidate filter options route passes self-filter exclusion to repository", async () => {
  let capturedOptions = null;
  let sentPayload = null;
  const routes = createCandidateRoutes({
    assertPermission: () => {},
    assertSchoolWriteAccess: async () => {},
    getCandidateFilterOptions: async (_filters, _fields, options) => {
      capturedOptions = options;
      return {};
    },
    sendJson: (_response, _statusCode, payload) => {
      sentPayload = payload;
    },
  });
  const route = routes.find((candidate) => candidate.path === "/api/candidates/filter-options");

  await route.handler({
    request: {},
    response: {},
    searchParams: new URLSearchParams({
      campus: "글로벌캠퍼스",
      excludeSelfFilters: "1",
      fields: "campus,track",
      schoolId: "school-1",
    }),
  });

  assert.deepEqual(capturedOptions, { excludeSelfFilters: true });
  assert.equal(sentPayload.filters.campus, "글로벌캠퍼스");
});
