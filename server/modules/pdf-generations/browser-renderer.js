const { spawn } = require("child_process");
const fs = require("node:fs");
const { pathToFileURL } = require("url");
const { createPdfGenerationCanceledError } = require("./cancellation");

const { resolveSchoolPdfStorageRoot } = require("../storage-paths");

const defaultBrowserPaths = Object.freeze([
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
]);

function resolveStorageRoot(path, root, schoolStorageCode = "") {
  return resolveSchoolPdfStorageRoot(path, root, schoolStorageCode);
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

async function getCompletedPdfSignature(pdfFilePath) {
  let file;
  try {
    file = await fs.promises.open(pdfFilePath, "r");
    const stat = await file.stat();
    if (stat.size < 16) return "";
    const header = Buffer.alloc(5);
    const tail = Buffer.alloc(Math.min(stat.size, 1024));
    await file.read(header, 0, header.length, 0);
    await file.read(tail, 0, tail.length, stat.size - tail.length);
    if (header.toString() !== "%PDF-" || !/%%EOF\s*$/.test(tail.toString())) return "";
    return `${stat.size}:${stat.mtimeMs}`;
  } catch (error) {
    if (["ENOENT", "EBUSY", "EPERM", "EACCES"].includes(error.code)) return "";
    throw error;
  } finally {
    await file?.close();
  }
}

async function renderHtmlToPdf({
  browserExecutable,
  browserProfileDir,
  htmlFilePath,
  pdfFilePath,
  shouldCancel = null,
  timeoutMs = 45000,
  spawnBrowser = spawn,
  pollIntervalMs = 200,
}) {
  // A retry must never accept the previous attempt's output as a new result.
  await fs.promises.rm(pdfFilePath, { force: true });
  return new Promise((resolve, reject) => {
    const browserProcess = spawnBrowser(
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
    let timer = null;
    let pollTimer = null;
    let settled = false;
    let checking = false;
    let previousSignature = "";
    function finish(error) {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      if (error) {
        browserProcess.kill();
        reject(error);
      } else {
        resolve();
      }
    }
    timer = setTimeout(() => {
      finish(new Error("PDF 생성 시간이 초과되었습니다."));
    }, timeoutMs);

    pollTimer = setInterval(async () => {
      if (settled || checking) return;
      checking = true;
      try {
        if (await shouldCancel?.()) throw createPdfGenerationCanceledError();
        const signature = await getCompletedPdfSignature(pdfFilePath);
        // Edge on Windows may hand printing to a child and exit immediately.
        // Wait for a complete, stable PDF, even after a successful launcher exit.
        if (signature && signature === previousSignature) finish();
        previousSignature = signature;
      } catch (error) {
        finish(error);
      } finally {
        checking = false;
      }
    }, pollIntervalMs);

    browserProcess.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-8192);
    });
    browserProcess.on("error", (error) => {
      finish(error);
    });
    browserProcess.on("close", (code) => {
      if (code !== 0) {
        finish(new Error(stderr.trim() || "브라우저 PDF 생성이 실패했습니다."));
      }
    });
  });
}

module.exports = {
  defaultBrowserPaths,
  renderHtmlToPdf,
  resolveBrowserExecutable,
  resolveStorageRoot,
};
