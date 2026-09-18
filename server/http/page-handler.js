const { createStaticRepresentation, sendStaticRepresentation } = require("./static-response");
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
  clientAssets = null,
  mimeTypes = defaultMimeTypes,
}) {
  const assetCache = new Map();
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

  async function serveStaticFile(response, pathname, request = { headers: {}, method: "GET" }) {
    const decoded = decodeURIComponent(pathname);
    const isAsset = Boolean(clientAssets && /^\/assets\/[a-zA-Z0-9_-]+\.(js|css|png|svg|jpg|woff2)$/.test(decoded));
    const extension = path.extname(decoded).toLowerCase();
    const isSource = /^\/(client|shared|styles)\//.test(decoded) && Boolean(mimeTypes[extension]);
    const isRootFile = ["/styles.css", "/index.html", "/login.html"].includes(decoded);
    const { filePath } = isAsset ? { filePath: path.join(clientAssets.outdir, path.basename(decoded)) } : resolveStaticFilePath(pathname);
    const relative = path.relative(root, filePath);
    if ((!isAsset && !isSource && !isRootFile) || relative.startsWith("..") || path.isAbsolute(relative) || decoded.includes("\\") || decoded.split("/").includes("..")) {
      response.writeHead(404, { "Cache-Control": "no-store" });
      response.end("404 Not Found");
      return;
    }
    try {
      let representation = isAsset ? assetCache.get(decoded) : null;
      if (!representation) {
        const data = await fs.promises.readFile(filePath);
        representation = createStaticRepresentation(data, mimeTypes[extension] || "application/octet-stream");
        if (isAsset) assetCache.set(decoded, representation);
      }
      await sendStaticRepresentation(request, response, representation, isAsset ? "public, max-age=31536000, immutable" : extension === ".html" ? "no-store" : "no-cache");
    } catch (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
      response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
    }
  }

  async function serveHtmlFile(request, response, pathname) {
    const { filePath } = resolveStaticFilePath(pathname);

    try {
      const markup = clientAssets?.pages[pathname === "/login.html" ? "login" : "app"] || await fs.promises.readFile(filePath, "utf8");
      await sendStaticRepresentation(request, response, createStaticRepresentation(Buffer.from(markup), mimeTypes[".html"]), "no-store");
    } catch (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Internal Server Error");
    }
  }

  async function handlePageRequest(request, response, pathname) {
    if (pathname === "/") {
      sendRedirect(response, "/login");
      return true;
    }

    if (pathname === "/login" || pathname === "/login/") {
      await serveHtmlFile(request, response, "/login.html");
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

    await serveHtmlFile(request, response, "/index.html");
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
