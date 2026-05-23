const fs = require("fs");
const http = require("http");
const path = require("path");

const { getViewFromPathname } = require("./shared/app-config");
const { bootstrapApp } = require("./server/bootstrap");
const { createAppContext } = require("./server/create-app-context");
const { createRouteDeps } = require("./server/create-route-deps");
const { createApiRoutes } = require("./server/http/api-routes");
const { createPageRequestHandlers } = require("./server/http/page-handler");
const { createRequestHandler } = require("./server/http/request-handler");

const appContext = createAppContext();
const port = Number(process.env.PORT) || 3002;
const root = __dirname;
const apiRoutes = createApiRoutes(createRouteDeps(appContext));

const pageHandlers = createPageRequestHandlers({
  fs,
  getViewFromPathname,
  path,
  root,
});
const handleRequest = createRequestHandler({
  apiRoutes,
  pageHandlers,
  path,
  port,
  translateError: appContext.translateDatabaseError,
});

bootstrapApp(appContext).finally(() => {
  http.createServer(handleRequest).listen(port, () => {
    console.log(`ExamList server listening on http://localhost:${port}`);
  });
});
