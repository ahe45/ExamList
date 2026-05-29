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
  const resolveTemplateSchoolId = async (templateId, schoolId = "") => {
    const normalizedSchoolId = String(schoolId || "").trim();

    if (normalizedSchoolId) {
      return normalizedSchoolId;
    }

    const template = await deps.getTemplate(templateId, { schoolId: "" });

    return template.schoolId || "";
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
      const body = await deps.readJsonBody(request);

      await deps.assertSchoolWriteAccess(body?.schoolId || "", request);
      deps.sendJson(response, 201, await deps.createTemplate(body));
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
        const body = await deps.readJsonBody(request);
        await deps.assertSchoolWriteAccess(await resolveTemplateSchoolId(params.templateId, body?.schoolId || ""), request);
        deps.sendJson(response, 200, await deps.updateTemplate(params.templateId, body));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/pdf-templates\/(?<templateId>[^/]+)$/,
      withPermission("deleteTemplates", async ({ request, response, params, searchParams }) => {
        const schoolId = await resolveTemplateSchoolId(params.templateId, searchParams.get("schoolId") || "");

        await deps.assertSchoolWriteAccess(schoolId, request);
        deps.sendJson(response, 200, await deps.deleteTemplate(params.templateId, {
          schoolId,
        }));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "POST",
      /^\/api\/pdf-templates\/(?<templateId>[^/]+)\/duplicate$/,
      withPermission("manageTemplates", async ({ request, response, params }) => {
        const body = await deps.readJsonBody(request);
        const duplicateOptions = normalizeTemplateDuplicateOptions(body);
        const targetSchoolId = duplicateOptions.targetSchoolId || duplicateOptions.schoolId || "";

        await deps.assertSchoolWriteAccess(
          targetSchoolId || (await resolveTemplateSchoolId(params.templateId, duplicateOptions.lookupSchoolId || "")),
          request,
        );
        deps.sendJson(response, 201, await deps.duplicateTemplate(params.templateId, duplicateOptions));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createPdfTemplateRoutes,
};
