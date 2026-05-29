const { exactRoute } = require("../router");

function createSchoolSettingsRoutes(deps) {
  return [
    exactRoute("GET", "/api/school-settings", async ({ request, response, searchParams }) => {
      deps.assertPermission("viewTemplates", request);
      deps.sendJson(response, 200, await deps.getSchoolSettings(searchParams.get("schoolId") || ""));
    }),
    exactRoute("PATCH", "/api/school-settings", async ({ request, response }) => {
      deps.assertPermission("manageTemplates", request);
      const body = await deps.readJsonBody(request);
      await deps.assertSchoolWriteAccess(body?.schoolId || "", request);
      deps.sendJson(response, 200, await deps.updateSchoolSettings(body, body?.schoolId || ""));
    }),
  ];
}

module.exports = {
  createSchoolSettingsRoutes,
};
