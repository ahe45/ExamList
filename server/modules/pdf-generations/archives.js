const { ZipFile } = require("yazl");

const { sanitizeFileName } = require("./file-name");

function normalizeArchiveGenerationIds(generationIds) {
  return [...new Set((Array.isArray(generationIds) ? generationIds : []).map((generationId) => String(generationId || "").trim()).filter(Boolean))];
}

function normalizeArchiveFileName(fileName, fallbackName = "pdf-generations") {
  const sanitizedName = sanitizeFileName(fileName || fallbackName) || fallbackName;

  return sanitizedName.toLowerCase().endsWith(".zip") ? sanitizedName : `${sanitizedName}.zip`;
}

function createArchiveEntryNameFactory() {
  const usedNames = new Set();

  return (fileName, fallbackBaseName = "generated.pdf") => {
    const sourceName = String(fileName || fallbackBaseName).trim() || fallbackBaseName;
    const extensionIndex = sourceName.lastIndexOf(".");
    const baseName = extensionIndex > 0 ? sourceName.slice(0, extensionIndex) : sourceName;
    const extension = extensionIndex > 0 ? sourceName.slice(extensionIndex) : "";
    let candidateName = sourceName;
    let suffix = 1;

    while (usedNames.has(candidateName.toLowerCase())) {
      candidateName = `${baseName}_${suffix}${extension}`;
      suffix += 1;
    }

    usedNames.add(candidateName.toLowerCase());
    return candidateName;
  };
}

async function writeZipArchive({ entries, filePath, fs, onProgress }) {
  await new Promise((resolve, reject) => {
    const zipFile = new ZipFile();
    const outputStream = fs.createWriteStream(filePath);
    let processed = 0;
    let progressWrite = Promise.resolve();
    zipFile.on("error", reject);

    outputStream.on("close", () => progressWrite.then(resolve, reject));
    outputStream.on("error", reject);
    zipFile.outputStream.on("error", reject);

    entries.forEach((entry) => {
      if (!onProgress) { zipFile.addFile(entry.filePath, entry.entryName); return; }
      zipFile.addReadStreamLazy(entry.entryName, callback => {
        const input = fs.createReadStream(entry.filePath);
        input.once("end", () => {
          const progress = { processed: ++processed, total: entries.length };
          progressWrite = progressWrite.then(() => onProgress(progress));
          progressWrite.catch(() => {});
        });
        callback(null, input);
      });
    });
    zipFile.end();
    zipFile.outputStream.pipe(outputStream);
  });
}

module.exports = {
  createArchiveEntryNameFactory,
  normalizeArchiveFileName,
  normalizeArchiveGenerationIds,
  writeZipArchive,
};
