const { exactRoute } = require("../router");

function createPdfPreviewRoutes(deps) {
  return [
    exactRoute("POST", "/api/pdf-preview", async ({ request, response }) => {
      deps.assertPermission("previewTemplates", request);
      deps.sendJson(response, 200, await deps.previewTemplate(await deps.readJsonBody(request)));
    }),
  ];
}

module.exports = {
  createPdfPreviewRoutes,
};
