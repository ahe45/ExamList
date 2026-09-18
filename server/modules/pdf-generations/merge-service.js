const { Worker } = require("node:worker_threads");
const path = require("node:path");

// A single merge worker bounds memory usage across simultaneous download requests.
let previousMerge = Promise.resolve();
function mergePdfFilesInWorker(filePaths, outputPath, options = {}) {
  const pending = previousMerge.then(() => new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "merge-worker.js"), {
      workerData: { filePaths, outputPath },
    });
    let message;
    worker.on("message", value => { if (value.progress) { Promise.resolve(options.onProgress?.(value.progress)).catch(() => {}); } else { message = value; } });
    worker.once("error", reject);
    worker.once("exit", code => {
      if (code !== 0 || !message) {
        reject(new Error(`PDF merge worker exited unexpectedly (${code})`));
      } else if (message.error) {
        reject(Object.assign(new Error(message.error.message), { code: message.error.code }));
      } else {
        resolve(message.result);
      }
    });
  }));
  previousMerge = pending.catch(() => {});
  return pending;
}
module.exports = { mergePdfFilesInWorker };
