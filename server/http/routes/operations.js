const { regexRoute } = require("../router");
function createOperationRoutes(deps) {
  return [regexRoute("GET", /^\/api\/operations\/(?<jobId>[a-f0-9-]{36})$/, async ({ request, response, params }) => {
    deps.sendJson(response, 200, await deps.getOperation(params.jobId, request));
  }, { getParams: match => match.groups })];
}
module.exports = { createOperationRoutes };
