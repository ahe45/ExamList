const defaultMimeTypes = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
});

function sendRedirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {
    Location: location,
    "Cache-Control": "no-store",
  });
  response.end();
}

function createPageRequestHandlers({
  fs,
  getViewFromPathname,
  path,
  root,
  mimeTypes = defaultMimeTypes,
}) {
  function resolveStaticFilePath(pathname) {
    const requestPath = pathname === "/" ? "/index.html" : pathname;
    const safePath = path
      .normalize(decodeURIComponent(requestPath))
      .replace(/^(\.\.[/\\])+/, "")
      .replace(/^[/\\]+/, "");

    return {
      filePath: path.join(root, safePath),
    };
  }

  function serveStaticFile(response, pathname) {
    const { filePath } = resolveStaticFilePath(pathname);

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": mimeTypes[extension] || "application/octet-stream",
      });
      response.end(data);
    });
  }

  async function serveHtmlFile(response, pathname) {
    const { filePath } = resolveStaticFilePath(pathname);

    try {
      const markup = await fs.promises.readFile(filePath, "utf8");
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": mimeTypes[".html"] || "text/html; charset=utf-8",
      });
      response.end(markup);
    } catch (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
    }
  }

  async function handlePageRequest(_request, response, pathname) {
    if (pathname === "/") {
      sendRedirect(response, "/login");
      return true;
    }

    if (pathname === "/login" || pathname === "/login/") {
      await serveHtmlFile(response, "/login.html");
      return true;
    }

    if (pathname === "/dashboard") {
      sendRedirect(response, "/login", 301);
      return true;
    }

    const requestedView = getViewFromPathname(pathname);

    if (!requestedView) {
      return false;
    }

    await serveHtmlFile(response, "/index.html");
    return true;
  }

  return {
    handlePageRequest,
    serveStaticFile,
  };
}

module.exports = {
  createPageRequestHandlers,
  defaultMimeTypes,
};
