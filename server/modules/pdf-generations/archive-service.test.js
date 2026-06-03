const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PDFDocument } = require("pdf-lib");

const { createPdfGenerationArchiveService } = require("./archive-service");

function createHttpError(statusCode, message, errorCode) {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

async function writeBlankPdf(filePath) {
  const document = await PDFDocument.create();

  document.addPage([100, 100]);
  await fs.promises.writeFile(filePath, await document.save());
}

function createCompletedGenerationRow({ filePath, generationId, roomCode }) {
  return {
    fileName: `${roomCode}.pdf`,
    filePath,
    generationUnit: "roomCode",
    id: generationId,
    purgedAt: null,
    requestJson: JSON.stringify({
      filters: {
        roomCode,
      },
      generationUnit: "roomCode",
      targetName: roomCode,
      template: {
        generationUnit: "roomCode",
      },
    }),
    schoolCode: "TEST",
    schoolId: "school-1",
    status: "completed",
    targetName: roomCode,
  };
}

test("createPdfGenerationMergedFile reads PDFs in generation unit ascending order", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-merge-order-"));

  try {
    const filesDir = path.join(tempDir, "files");
    const readFileOrder = [];

    await fs.promises.mkdir(filesDir, { recursive: true });

    const filePaths = {
      R1: path.join(filesDir, "R1.pdf"),
      R2: path.join(filesDir, "R2.pdf"),
      R10: path.join(filesDir, "R10.pdf"),
    };

    await Promise.all(Object.values(filePaths).map(writeBlankPdf));

    const rows = [
      createCompletedGenerationRow({
        filePath: filePaths.R10,
        generationId: "generation-r10",
        roomCode: "R10",
      }),
      createCompletedGenerationRow({
        filePath: filePaths.R2,
        generationId: "generation-r2",
        roomCode: "R2",
      }),
      createCompletedGenerationRow({
        filePath: filePaths.R1,
        generationId: "generation-r1",
        roomCode: "R1",
      }),
    ];
    const trackedFs = {
      ...fs,
      promises: {
        ...fs.promises,
        readFile: async (filePath, ...args) => {
          readFileOrder.push(path.basename(filePath));

          return fs.promises.readFile(filePath, ...args);
        },
      },
    };
    const service = createPdfGenerationArchiveService({
      createHttpError,
      ensureStorageDirectories: async (storageRoot) => {
        await fs.promises.mkdir(path.join(storageRoot, "archives"), { recursive: true });
        await fs.promises.mkdir(path.join(storageRoot, "merged"), { recursive: true });
      },
      fs: trackedFs,
      legacyStorageRoot: tempDir,
      path,
      query: async () => rows,
      resolvePdfStorageRootForSchool: async () => tempDir,
      writeAuditLog: async () => {},
    });
    const result = await service.createPdfGenerationMergedFile({
      generationIds: ["generation-r10", "generation-r2", "generation-r1"],
    });

    assert.deepEqual(readFileOrder, ["R1.pdf", "R2.pdf", "R10.pdf"]);
    assert.ok(result.mergedPath.startsWith(path.join(tempDir, "merged")));
    assert.equal(await fs.promises.access(result.mergedPath).then(() => true), true);
  } finally {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
  }
});
