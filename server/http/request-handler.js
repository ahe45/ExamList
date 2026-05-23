const { getCorsHeaders, sendJson } = require("./response");
const { dispatchRoute } = require("./router");

function createRequestHandler({
  apiRoutes,
  pageHandlers,
  path,
  port,
  translateError,
}) {
  return async function handleRequest(request, response) {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);

    if (request.method === "OPTIONS") {
      response.writeHead(204, getCorsHeaders());
      response.end();
      return;
    }

    try {
      const apiMatched = await dispatchRoute(apiRoutes, {
        request,
        requestUrl,
        response,
      });

      if (apiMatched) {
        return;
      }

      const pageMatched = await pageHandlers.handlePageRequest(request, response, requestUrl.pathname);

      if (pageMatched) {
        return;
      }

      if (path.extname(requestUrl.pathname)) {
        pageHandlers.serveStaticFile(response, requestUrl.pathname);
        return;
      }

      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404 Not Found");
    } catch (error) {
      const translatedError = translateError(error);
      const statusCode = Number(translatedError.statusCode) || 500;
      const payload = {
        message: translatedError.message || "서버 오류가 발생했습니다.",
        errorCode: translatedError.errorCode || "INTERNAL_SERVER_ERROR",
      };

      if (requestUrl.pathname.startsWith("/api/")) {
        sendJson(response, statusCode, payload);
        return;
      }

      response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(payload.message);
    }
  };
}

module.exports = {
  createRequestHandler,
};
