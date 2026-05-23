const { exactRoute, regexRoute } = require("../router");
const { normalizeTemplateDuplicateOptions } = require("../../modules/pdf-templates/duplicate-options");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createPdfTemplateRoutes(deps) {
  const withPermission = (permissionKey, handler) => async (context) => {
    deps.assertPermission(permissionKey, context.request);
    return handler(context);
  };

  return [
    exactRoute("GET", "/api/pdf-templates", withPermission("viewTemplates", async ({ response, searchParams }) => {
      deps.sendJson(
        response,
        200,
        await deps.listTemplates({
          generationUnit: searchParams.get("generationUnit") || "",
          keyword: searchParams.get("keyword") || "",
          limit: searchParams.get("limit") || "",
          orientation: searchParams.get("orientation") || "",
          page: searchParams.get("page") || "",
          paperPreset: searchParams.get("paperPreset") || "",
          schoolId: searchParams.get("schoolId") || "",
        }),
      );
    })),
    exactRoute("POST", "/api/pdf-templates", withPermission("manageTemplates", async ({ request, response }) => {
      deps.sendJson(response, 201, await deps.createTemplate(await deps.readJsonBody(request)));
    })),
    regexRoute(
      "GET",
      /^\/api\/pdf-templates\/(?<templateId>[^/]+)$/,
      withPermission("viewTemplates", async ({ response, params, searchParams }) => {
        deps.sendJson(response, 200, await deps.getTemplate(params.templateId, {
          schoolId: searchParams.get("schoolId") || "",
        }));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "PATCH",
      /^\/api\/pdf-templates\/(?<templateId>[^/]+)$/,
      withPermission("manageTemplates", async ({ request, response, params }) => {
        deps.sendJson(response, 200, await deps.updateTemplate(params.templateId, await deps.readJsonBody(request)));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/pdf-templates\/(?<templateId>[^/]+)$/,
      withPermission("deleteTemplates", async ({ response, params, searchParams }) => {
        deps.sendJson(response, 200, await deps.deleteTemplate(params.templateId, {
          schoolId: searchParams.get("schoolId") || "",
        }));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/pdf-templates\/(?<templateId>[^/]+)\/duplicate$/,
      withPermission("manageTemplates", async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        deps.sendJson(response, 201, await deps.duplicateTemplate(params.templateId, normalizeTemplateDuplicateOptions(body)));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createPdfTemplateRoutes,
};
