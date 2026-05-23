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
const defaultHttpPort = 80;
const configuredPort = Number(process.env.PORT);
const port =
  Number.isInteger(configuredPort) && configuredPort >= 1 && configuredPort <= 65535
    ? configuredPort
    : defaultHttpPort;
const root = __dirname;
const apiRoutes = createApiRoutes(createRouteDeps(appContext));

function formatServerUrl(hostname) {
  return port === defaultHttpPort ? `http://${hostname}` : `http://${hostname}:${port}`;
}

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
  const server = http.createServer(handleRequest);

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`ExamList server could not start because port ${port} is already in use.`);
      console.error("Stop the service using that port, or set PORT in .env to another available port.");
      process.exit(1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`ExamList server listening on ${formatServerUrl("localhost")}`);
  });
});
