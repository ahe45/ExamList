const { exactRoute } = require("../router");

function createAuthRoutes(deps) {
  return [
    exactRoute("GET", "/api/auth/session", async ({ request, response }) => {
      deps.sendJson(response, 200, deps.getAuthSession(request));
    }),
    exactRoute("POST", "/api/auth/login", async ({ request, response }) => {
      const loginResult = await deps.login(await deps.readJsonBody(request));

      deps.sendJson(response, 200, loginResult.body, {
        "Set-Cookie": loginResult.cookie,
      });
    }),
    exactRoute("POST", "/api/auth/logout", async ({ request, response }) => {
      const logoutResult = deps.logout(request);

      deps.sendJson(response, 200, logoutResult.body, {
        "Set-Cookie": logoutResult.cookie,
      });
    }),
  ];
}

module.exports = {
  createAuthRoutes,
};
