
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { getAvailablePort, resolveBrowserPath } = require("../smoke-utils");
const { createCdpClient, waitForDevtools, waitForServer } = require("../smoke-browser-cdp");

async function withBrowserSmokeSession(callback) {
  const browserPath = resolveBrowserPath();

  if (!browserPath) {
    throw new Error("Edge 또는 Chrome 실행 파일을 찾지 못했습니다. UI_SMOKE_BROWSER_PATH를 설정해주세요.");
  }

  const port = Number(process.env.UI_SMOKE_PORT) || (await getAvailablePort());
  const debugPort = Number(process.env.UI_SMOKE_DEBUG_PORT) || (await getAvailablePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const loginId = String(process.env.UI_SMOKE_LOGIN_ID || "admin");
  const loginPassword = String(process.env.UI_SMOKE_LOGIN_PASSWORD || "1234");
  const loginRoleLabel = String(process.env.UI_SMOKE_LOGIN_ROLE_LABEL || "슈퍼 관리자");
  const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-browser-smoke-"));
  const serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, "..", ".."),
    env: {
      ...process.env,
      EXAMLIST_AUTH_ENABLED: "true",
      EXAMLIST_SESSION_SECRET: process.env.EXAMLIST_SESSION_SECRET || "browser-smoke-session-secret",
      PDF_QUEUE_DRIVER: process.env.PDF_QUEUE_DRIVER || "memory",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const browserProcess = spawn(
    browserPath,
    [
      "--headless",
      "--disable-extensions",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1440,1000",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let serverOutput = "";
  let client = null;

  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString("utf8");
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString("utf8");
  });

  try {
    await waitForServer(port);
    client = await createCdpClient(await waitForDevtools(debugPort));
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    return await callback({
      baseUrl,
      client,
      debugPort,
      loginId,
      loginPassword,
      loginRoleLabel,
      port,
    });
  } catch (error) {
    if (serverOutput.trim()) {
      console.error(serverOutput.trim());
    }

    throw error;
  } finally {
    client?.close();
    browserProcess.kill();
    serverProcess.kill();
    await fs.promises.rm(userDataDir, { force: true, recursive: true }).catch(() => {});
  }
}

module.exports = { withBrowserSmokeSession };
