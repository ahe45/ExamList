const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

const defaultBrowserPaths = Object.freeze([
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
]);

function resolveStorageRoot(path, root) {
  const configuredPath = String(process.env.PDF_STORAGE_DIR || "").trim();

  if (!configuredPath) {
    return path.join(root, "storage", "pdf-generations");
  }

  return path.isAbsolute(configuredPath) ? configuredPath : path.join(root, configuredPath);
}

async function resolveBrowserExecutable(fs, createHttpError) {
  const configuredPath = String(process.env.PDF_BROWSER_PATH || "").trim();

  if (configuredPath) {
    const configuredExists = await fs.promises
      .access(configuredPath, fs.constants.X_OK)
      .then(() => true)
      .catch(() => false);

    if (configuredExists) {
      return configuredPath;
    }

    throw createHttpError(500, "PDF 브라우저 경로를 확인할 수 없습니다.", "PDF_BROWSER_NOT_FOUND");
  }

  for (const browserPath of defaultBrowserPaths) {
    const exists = await fs.promises
      .access(browserPath, fs.constants.X_OK)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      return browserPath;
    }
  }

  throw createHttpError(
    500,
    "PDF를 생성할 브라우저를 찾지 못했습니다. PDF_BROWSER_PATH를 설정해주세요.",
    "PDF_BROWSER_NOT_FOUND",
  );
}

function renderHtmlToPdf({
  browserExecutable,
  browserProfileDir,
  htmlFilePath,
  pdfFilePath,
  shouldCancel = null,
  timeoutMs = 45000,
}) {
  return new Promise((resolve, reject) => {
    const browserProcess = spawn(
      browserExecutable,
      [
        "--headless",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${browserProfileDir}`,
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=5000",
        `--print-to-pdf=${pdfFilePath}`,
        "--print-to-pdf-no-header",
        pathToFileURL(htmlFilePath).href,
      ],
      {
        stdio: ["ignore", "ignore", "pipe"],
        windowsHide: true,
      },
    );
    let stderr = "";
    let timedOut = false;
    let timer = null;
    let cancelTimer = null;
    let settled = false;
    let checkingCancellation = false;
    function rejectOnce(error) {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (cancelTimer) {
        clearInterval(cancelTimer);
      }
      reject(error);
    }
    timer = setTimeout(() => {
      timedOut = true;
      browserProcess.kill();
    }, timeoutMs);

    if (typeof shouldCancel === "function") {
      cancelTimer = setInterval(async () => {
        if (settled || checkingCancellation) {
          return;
        }

        checkingCancellation = true;
        try {
          const canceled = await shouldCancel();

          if (canceled) {
            browserProcess.kill();
            rejectOnce(new Error("PDF 생성이 중단되었습니다."));
          }
        } catch (error) {
          browserProcess.kill();
          rejectOnce(error);
        } finally {
          checkingCancellation = false;
        }
      }, 500);
    }

    browserProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    browserProcess.on("error", (error) => {
      rejectOnce(error);
    });
    browserProcess.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (cancelTimer) {
        clearInterval(cancelTimer);
      }

      if (timedOut) {
        reject(new Error("PDF 생성 시간이 초과되었습니다."));
        return;
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || "브라우저 PDF 생성이 실패했습니다."));
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  defaultBrowserPaths,
  renderHtmlToPdf,
  resolveBrowserExecutable,
  resolveStorageRoot,
};
