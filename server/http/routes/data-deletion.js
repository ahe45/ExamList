const { exactRoute, regexRoute } = require("../router");
const { createPermissionGuard, decodeRouteParams, readGenerationTargetFilters } = require("../route-helpers");

function readTemplateIds(searchParams) {
  return searchParams
    .getAll("templateIds")
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function createDataDeletionRoutes(deps) {
  const withPermission = createPermissionGuard(deps);

  return [
    exactRoute(
      "GET",
      "/api/data-deletion/summary",
      withPermission("deleteProjectData", async ({ response, searchParams }) => {
        deps.sendJson(response, 200, await deps.getProjectDataDeletionSummary({
          filters: readGenerationTargetFilters(searchParams),
          schoolId: searchParams.get("schoolId") || searchParams.get("school_id") || "",
          ...(searchParams.has("templateIds") ? { templateIds: readTemplateIds(searchParams) } : {}),
        }));
      }),
    ),
    regexRoute(
      "DELETE",
      /^\/api\/data-deletion\/(?<scope>all|candidates|photos|candidate-photos|pdf-generations|templates)$/,
      withPermission("deleteProjectData", async ({ request, response, params }) => {
        deps.sendJson(response, 200, await deps.deleteProjectData(params.scope, await deps.readJsonBody(request)));
      }),
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createDataDeletionRoutes,
};
