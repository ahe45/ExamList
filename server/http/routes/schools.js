const { exactRoute, regexRoute } = require("../router");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createSchoolRoutes(deps) {
  return [
    exactRoute("GET", "/api/schools", async ({ request, response, searchParams }) => {
      deps.assertPermission("viewTemplates", request);
      deps.sendJson(
        response,
        200,
        await deps.withSchoolListAccess(await deps.listSchools({
          keyword: searchParams.get("keyword") || "",
          limit: searchParams.get("limit") || "",
          page: searchParams.get("page") || "",
        }), request),
      );
    }),
    exactRoute("POST", "/api/schools", async ({ request, response }) => {
      deps.assertPermission("manageTemplates", request);
      deps.sendJson(
        response,
        201,
        await deps.createSchool(await deps.readJsonBody(request), {
          createdAccount: deps.getRequestAccountId(request),
          requireDeletionPassword: !deps.hasPermission("deleteSchoolsWithoutPassword", request),
        }),
      );
    }),
    regexRoute(
      "GET",
      /^\/api\/schools\/(?<schoolId>[^/]+)$/,
      async ({ request, response, params }) => {
        deps.assertPermission("viewTemplates", request);
        deps.sendJson(response, 200, deps.withSchoolAccess(await deps.getSchool(params.schoolId), request));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "PATCH",
      /^\/api\/schools\/(?<schoolId>[^/]+)$/,
      async ({ request, response, params }) => {
        deps.assertPermission("manageTemplates", request);
        await deps.assertSchoolWriteAccess(params.schoolId, request);
        deps.sendJson(response, 200, await deps.updateSchool(params.schoolId, await deps.readJsonBody(request)));
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/schools\/(?<schoolId>[^/]+)$/,
      async ({ request, response, params }) => {
        deps.assertPermission("manageTemplates", request);
        await deps.assertSchoolWriteAccess(params.schoolId, request);
        const body = await deps.readJsonBody(request);

        deps.sendJson(
          response,
          200,
          await deps.deleteSchool(params.schoolId, {
            canBypassDeletionPassword: deps.hasPermission("deleteSchoolsWithoutPassword", request),
            deletionPassword: body.deletionPassword || "",
          }),
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createSchoolRoutes,
};
