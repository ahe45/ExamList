const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { createPageRequestHandlers } = require("./page-handler");
const { sendJson } = require("./response");

test("versioned assets cache and compress, while HTML/API stay private and source revalidates", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "examlist-assets-test-"));
  const outdir = path.join(root, ".client-assets");
  fs.mkdirSync(outdir);
  fs.mkdirSync(path.join(root, "client"));
  const content = "window.testValue = 'asset';\n".repeat(150);
  const filename = "test-1234567890abcdef.js";
  fs.writeFileSync(path.join(outdir, filename), content);
  fs.writeFileSync(path.join(root, "client", "test.js"), content);
  fs.writeFileSync(path.join(root, ".env"), "not public");
  fs.writeFileSync(path.join(root, "package.json"), "not public");
  const handlers = createPageRequestHandlers({ fs, path, root, getViewFromPathname: route => route === "/schools", clientAssets: { outdir, pages: { app: "<html>app</html>", login: "<html>login</html>" } } });
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/api/test") return sendJson(response, 200, { private: true });
    if (!await handlers.handlePageRequest(request, response, pathname)) await handlers.serveStaticFile(response, pathname, request);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    assert.ok(path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("examlist-assets-test-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = `${base}/assets/${filename}`;
  const compressed = await fetch(url, { headers: { "Accept-Encoding": "br" } });
  assert.equal(compressed.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(compressed.headers.get("content-encoding"), "br");
  assert.equal(await compressed.text(), content);
  const etag = compressed.headers.get("etag");
  const unchanged = await fetch(url, { headers: { "If-None-Match": etag } });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");
  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const uncompressed = await fetch(url, { headers: { "Accept-Encoding": "br;q=0,gzip;q=0" } });
  assert.equal(uncompressed.headers.get("content-encoding"), null);
  assert.equal(await uncompressed.text(), content);
  for (const route of ["/schools", "/login", "/api/test"]) {
    const response = await fetch(base + route);
    assert.equal(response.headers.get("cache-control"), "no-store");
    await response.text();
  }
  const source = await fetch(base + "/client/test.js");
  assert.equal(source.headers.get("cache-control"), "no-cache");
  const sourceTag = source.headers.get("etag");
  await source.text();
  fs.appendFileSync(path.join(root, "client", "test.js"), "// updated");
  const updated = await fetch(base + "/client/test.js", { headers: { "If-None-Match": sourceTag } });
  assert.equal(updated.status, 200);
  assert.notEqual(updated.headers.get("etag"), sourceTag);
  await updated.text();
  for (const route of ["/.env", "/package.json", "/assets/missing.js", "/client/%2e%2e%2fpackage.json"]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    await response.text();
  }
});
