const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { sendDownload } = require("./response");

test("downloads stream exact bytes and return missing-file errors before headers", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "examlist-download-"));
  const payload = Buffer.alloc(2 * 1024 * 1024, 37);
  await fs.writeFile(path.join(directory, "large.pdf"), payload);
  const server = http.createServer(async (request, response) => {
    try {
      await sendDownload(response, path.join(directory, request.url === "/missing" ? "missing.pdf" : "large.pdf"), "test.pdf");
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-length"), String(payload.length));
    assert.match(response.headers.get("content-disposition"), /test.pdf/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload);
    assert.equal((await fetch(url + "/missing")).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.ok(directory.startsWith(path.join(os.tmpdir(), "examlist-download-")));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
