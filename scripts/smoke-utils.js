const fs = require("fs");
const http = require("http");

const defaultBrowserPaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveBrowserPath() {
  const configuredPath = String(process.env.UI_SMOKE_BROWSER_PATH || process.env.PDF_BROWSER_PATH || "").trim();

  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  return defaultBrowserPaths.find((browserPath) => fs.existsSync(browserPath)) || "";
}

function requestJson({ body = null, headers = {}, hostname = "127.0.0.1", method = "GET", path: requestPath, port }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const request = http.request(
      {
        headers: {
          ...(payload ? { "Content-Length": Buffer.byteLength(payload), "Content-Type": "application/json" } : {}),
          ...headers,
        },
        hostname,
        method,
        path: requestPath,
        port,
      },
      (response) => {
        let responseBody = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          let json = null;

          try {
            json = responseBody ? JSON.parse(responseBody) : null;
          } catch (_error) {
            json = null;
          }

          resolve({
            body: responseBody,
            headers: response.headers,
            json,
            statusCode: response.statusCode || 0,
          });
        });
      },
    );

    request.on("error", reject);
    request.setTimeout(5000, () => {
      request.destroy(new Error(`${requestPath} 요청 시간이 초과되었습니다.`));
    });

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          body,
          statusCode: response.statusCode || 0,
        });
      });
    });

    request.on("error", reject);
    request.setTimeout(5000, () => {
      request.destroy(new Error(`요청 시간이 초과되었습니다: ${url}`));
    });
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error("사용 가능한 포트를 확인하지 못했습니다."));
        }
      });
    });
  });
}

module.exports = {
  delay,
  getAvailablePort,
  requestJson,
  requestText,
  resolveBrowserPath,
};
