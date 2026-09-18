const { createHash } = require("node:crypto");
const { promisify } = require("node:util");
const { brotliCompress, gzip } = require("node:zlib");
const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

function acceptedEncoding(header = "") {
  const encodings = String(header).split(",").map(part => {
    const [name, ...parameters] = part.trim().split(";");
    const quality = parameters.find(value => value.trim().startsWith("q="));
    return { name: name.toLowerCase(), quality: quality ? Number(quality.trim().slice(2)) : 1 };
  });
  return ["br", "gzip"].map(name => ({ name, quality: encodings.find(entry => entry.name === name)?.quality ?? encodings.find(entry => entry.name === "*")?.quality ?? 0 }))
    .filter(entry => entry.quality > 0).sort((a, b) => b.quality - a.quality)[0]?.name || "";
}

function createStaticRepresentation(data, contentType) {
  return { data, contentType, etag: `W/"${createHash("sha256").update(data).digest("hex")}"`, compressed: new Map() };
}

async function sendStaticRepresentation(request, response, representation, cacheControl) {
  const { data, contentType, etag, compressed } = representation;
  const headers = { "Content-Type": contentType, "Cache-Control": cacheControl, ETag: etag, Vary: "Accept-Encoding", "X-Content-Type-Options": "nosniff" };
  const tags = String(request.headers?.["if-none-match"] || "").split(",").map(tag => tag.trim().replace(/^W\//, ""));
  if (cacheControl !== "no-store" && (tags.includes("*") || tags.includes(etag.replace(/^W\//, "")))) {
    response.writeHead(304, headers);
    response.end();
    return;
  }
  const encoding = data.length > 1024 && /javascript|css|html|json|svg/.test(contentType) ? acceptedEncoding(request.headers?.["accept-encoding"]) : "";
  let body = data;
  if (encoding) {
    if (!compressed.has(encoding)) compressed.set(encoding, encoding === "br" ? compressBrotli(data) : compressGzip(data));
    body = await compressed.get(encoding);
    headers["Content-Encoding"] = encoding;
  }
  headers["Content-Length"] = body.length;
  response.writeHead(200, headers);
  response.end(request.method === "HEAD" ? undefined : body);
}

module.exports = { createStaticRepresentation, sendStaticRepresentation };
