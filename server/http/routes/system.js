const { exactRoute } = require("../router");

function createSystemRoutes(deps) {
  return [
    exactRoute("GET", "/api/system/summary", async ({ request, response, searchParams }) => {
      deps.sendJson(response, 200, await deps.getDashboardSummary(request, {
        schoolId: searchParams.get("schoolId") || "",
      }));
    }),
  ];
}

module.exports = {
  createSystemRoutes,
};
