const { exactRoute } = require("../router");

function createPdfPreviewRoutes(deps) {
  return [
    exactRoute("POST", "/api/pdf-preview", async ({ request, response }) => {
      deps.assertPermission("previewTemplates", request);
      const body = await deps.readJsonBody(request);

      await deps.assertSchoolWriteAccess(body?.schoolId || body?.template?.schoolId || "", request);
      deps.sendJson(response, 200, await deps.previewTemplate(body));
    }),
  ];
}

module.exports = {
  createPdfPreviewRoutes,
};
