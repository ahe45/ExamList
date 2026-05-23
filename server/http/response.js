const fs = require("fs");

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    ...getCorsHeaders(),
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function buildContentDisposition(dispositionType = "attachment", fileName = "download") {
  const normalizedDisposition = String(dispositionType || "").trim() || "attachment";
  const normalizedFileName = String(fileName || "download").trim() || "download";

  return `${normalizedDisposition}; filename="download"; filename*=UTF-8''${encodeURIComponent(normalizedFileName)}`;
}

function sendBinary(response, statusCode, headers = {}, fileBuffer) {
  const normalizedBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer || "");

  response.writeHead(statusCode, {
    ...getCorsHeaders(),
    "Cache-Control": "no-store",
    "Content-Length": normalizedBuffer.length,
    ...headers,
  });
  response.end(normalizedBuffer);
}

async function sendDownload(response, filePath, fileName, headers = {}) {
  const fileBuffer = await fs.promises.readFile(filePath);

  response.writeHead(200, {
    ...getCorsHeaders(),
    "Cache-Control": "no-store",
    "Content-Disposition": buildContentDisposition("attachment", String(fileName || "download.pdf")),
    "Content-Length": fileBuffer.length,
    "Content-Type": "application/pdf",
    ...headers,
  });
  response.end(fileBuffer);
}

module.exports = {
  buildContentDisposition,
  getCorsHeaders,
  sendBinary,
  sendDownload,
  sendJson,
};
