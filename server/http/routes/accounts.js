const { exactRoute, regexRoute } = require("../router");

function decodeRouteParams(groups = {}) {
  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, decodeURIComponent(String(value || ""))]),
  );
}

function createAccountRoutes(deps) {
  return [
    exactRoute("GET", "/api/accounts", async ({ request, response }) => {
      deps.assertPermission("manageAccounts", request);
      deps.sendJson(response, 200, await deps.listAccounts());
    }),
    exactRoute("POST", "/api/accounts", async ({ request, response }) => {
      deps.assertPermission("manageAccounts", request);
      deps.sendJson(response, 201, await deps.createAccount(await deps.readJsonBody(request)));
    }),
    regexRoute(
      "PATCH",
      /^\/api\/accounts\/(?<accountId>[^/]+)$/,
      async ({ request, response, params }) => {
        deps.assertPermission("manageAccounts", request);
        deps.sendJson(
          response,
          200,
          await deps.updateAccount(params.accountId, await deps.readJsonBody(request), {
            currentUserId: deps.getAuthSession(request)?.user?.userId || "",
          }),
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
    regexRoute(
      "DELETE",
      /^\/api\/accounts\/(?<accountId>[^/]+)$/,
      async ({ request, response, params }) => {
        deps.assertPermission("manageAccounts", request);
        deps.sendJson(
          response,
          200,
          await deps.deleteAccount(params.accountId, {
            currentUserId: deps.getAuthSession(request)?.user?.userId || "",
          }),
        );
      },
      { getParams: (match) => decodeRouteParams(match.groups) },
    ),
  ];
}

module.exports = {
  createAccountRoutes,
};
