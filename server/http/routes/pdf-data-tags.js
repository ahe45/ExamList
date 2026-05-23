const { exactRoute } = require("../router");

function createPdfDataTagRoutes(deps) {
  return [
    exactRoute("GET", "/api/pdf-data-tags", async ({ request, requestUrl, response }) => {
      deps.assertPermission("viewTemplates", request);
      deps.sendJson(response, 200, await deps.getPdfDataTags({
        schoolId: requestUrl.searchParams.get("schoolId") || "",
      }));
    }),
  ];
}

module.exports = {
  createPdfDataTagRoutes,
};
