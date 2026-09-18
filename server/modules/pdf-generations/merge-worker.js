const fs = require("node:fs");
const { parentPort, workerData } = require("node:worker_threads");
const { PDFDocument } = require("pdf-lib");

async function mergePdfFiles(filePaths, outputPath, { fileSystem = fs, onProgress = null } = {}) {
  const document = await PDFDocument.create();
  let pageCount = 0;
  let processed = 0;
  try {
    for (const filePath of filePaths) {
      const bytes = await fileSystem.promises.readFile(filePath);
      // The worker can parse/save without yielding to the web server's event loop.
      const source = await PDFDocument.load(bytes, { parseSpeed: Infinity });
      const pages = await document.copyPages(source, source.getPageIndices());
      for (const page of pages) document.addPage(page);
      pageCount += pages.length;
      await onProgress?.({ processed: ++processed, total: filePaths.length + 1 });
    }
    await fileSystem.promises.writeFile(outputPath, await document.save({ objectsPerTick: Infinity }));
    return { pageCount };
  } catch (error) {
    await fileSystem.promises.rm(outputPath, { force: true }).catch(() => {});
    throw error;
  }
}

if (parentPort) {
  mergePdfFiles(workerData.filePaths, workerData.outputPath, { onProgress: progress => parentPort.postMessage({ progress }) }).then(
    result => parentPort.postMessage({ result }),
    error => parentPort.postMessage({ error: { message: error.message, code: error.code } }),
  );
}
module.exports = { mergePdfFiles };
