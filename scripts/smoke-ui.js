const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { delay, requestText, resolveBrowserPath } = require("./smoke-utils");

async function waitForServer(baseUrl, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await requestText(`${baseUrl}/api/system/summary`);

      if (response.statusCode === 200) {
        return;
      }

      lastError = new Error(`서버 응답 상태 ${response.statusCode}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  throw lastError || new Error("서버 시작을 확인하지 못했습니다.");
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${path.basename(command)} 실행 시간이 초과되었습니다.`));
    }, options.timeoutMs || 30000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(stderr.trim() || `${path.basename(command)} 종료 코드 ${code}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function assertRoute(baseUrl, pathname, expectedText) {
  const response = await requestText(`${baseUrl}${pathname}`);

  if (response.statusCode !== 200) {
    throw new Error(`${pathname} 응답 상태가 ${response.statusCode}입니다.`);
  }

  if (!response.body.includes(expectedText)) {
    throw new Error(`${pathname} 응답에서 "${expectedText}" 문구를 찾지 못했습니다.`);
  }
}

async function requestJson(url) {
  const response = await requestText(url);

  if (response.statusCode !== 200) {
    throw new Error(`${url} 응답 상태가 ${response.statusCode}입니다.`);
  }

  return JSON.parse(response.body);
}

async function assertBrowserRender(browserPath, baseUrl, pathname, expectedText) {
  const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "exam-check-ui-smoke-"));

  try {
    const result = await runProcess(
      browserPath,
      [
        "--headless",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${userDataDir}`,
        "--virtual-time-budget=8000",
        "--dump-dom",
        `${baseUrl}${pathname}`,
      ],
      {
        timeoutMs: 45000,
      },
    );

    if (!result.stdout.includes(expectedText)) {
      throw new Error(`${pathname} 브라우저 렌더링에서 "${expectedText}" 문구를 찾지 못했습니다.`);
    }
  } finally {
    await fs.promises.rm(userDataDir, { force: true, recursive: true }).catch(() => {});
  }
}

async function run() {
  const port = Number(process.env.UI_SMOKE_PORT) || 3992;
  const baseUrl = `http://127.0.0.1:${port}`;
  const browserPath = resolveBrowserPath();

  if (!browserPath) {
    throw new Error("Edge 또는 Chrome 실행 파일을 찾지 못했습니다. UI_SMOKE_BROWSER_PATH를 설정해주세요.");
  }

  const serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      EXAMLIST_AUTH_ENABLED: process.env.UI_SMOKE_AUTH_ENABLED || "false",
      PDF_QUEUE_DRIVER: process.env.PDF_QUEUE_DRIVER || "memory",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let serverOutput = "";

  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString("utf8");
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString("utf8");
  });

  try {
    await waitForServer(baseUrl);
    const schoolPayload = await requestJson(`${baseUrl}/api/schools?limit=1`);
    const schoolId = schoolPayload.items?.[0]?.id || "";
    const templatePayload = await requestJson(`${baseUrl}/api/pdf-templates?limit=1${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ""}`);
    const templateId = templatePayload.items?.[0]?.id || "";

    await assertRoute(baseUrl, "/schools", "수험생확인대장");
    await assertBrowserRender(browserPath, baseUrl, "/schools", "학교 선택");

    if (schoolId) {
      const encodedSchoolId = encodeURIComponent(schoolId);

      await assertRoute(baseUrl, `/schools/${encodedSchoolId}/templates`, "수험생확인대장");
      await assertBrowserRender(browserPath, baseUrl, `/schools/${encodedSchoolId}/templates`, "수험생확인대장 양식");

      if (templateId) {
        await assertRoute(baseUrl, `/schools/${encodedSchoolId}/templates/${encodeURIComponent(templateId)}/edit`, "수험생확인대장");
        await assertBrowserRender(browserPath, baseUrl, `/schools/${encodedSchoolId}/templates/${encodeURIComponent(templateId)}/edit`, "양식 편집");
      }
    }

    console.log(`UI smoke OK: ${baseUrl}`);
  } catch (error) {
    if (serverOutput.trim()) {
      console.error(serverOutput.trim());
    }

    throw error;
  } finally {
    serverProcess.kill();
  }
}

run().catch((error) => {
  console.error(error.message || "UI smoke 실패");
  process.exitCode = 1;
});
