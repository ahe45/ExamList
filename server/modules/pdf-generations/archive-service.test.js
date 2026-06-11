const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PDFDocument } = require("pdf-lib");

const { createPdfGenerationArchiveService } = require("./archive-service");

const ACADEMIC_YEAR_SUFFIX = "\uD559\uB144\uB3C4";
const ARCHIVE_ARTIFACT_LABEL = "\uAC1C\uBCC4";
const MERGED_ARTIFACT_LABEL = "\uBCD1\uD569";
const SCHOOL_SETTINGS_NAME = "\uD55C\uAD6D\uB300\uD559\uAD50";

function createHttpError(statusCode, message, errorCode) {
  return Object.assign(new Error(message), { errorCode, statusCode });
}

async function writeBlankPdf(filePath) {
  const document = await PDFDocument.create();

  document.addPage([100, 100]);
  await fs.promises.writeFile(filePath, await document.save());
}

function createCompletedGenerationRow({
  academicYear = "2027",
  filePath,
  generationId,
  roomCode,
  schoolName = "\uD14C\uC2A4\uD2B8\uB300\uD559\uAD50",
  schoolSettingsName = SCHOOL_SETTINGS_NAME,
}) {
  return {
    academicYear,
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
    schoolName,
    schoolSettingsName,
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
    let auditEntry = null;
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
      writeAuditLog: async (entry) => {
        auditEntry = entry;
      },
    });
    const result = await service.createPdfGenerationMergedFile({
      generationIds: ["generation-r10", "generation-r2", "generation-r1"],
    });

    assert.deepEqual(readFileOrder, ["R1.pdf", "R2.pdf", "R10.pdf"]);
    assert.match(
      result.mergedFileName,
      new RegExp(`^${SCHOOL_SETTINGS_NAME}_2027${ACADEMIC_YEAR_SUFFIX}_${MERGED_ARTIFACT_LABEL}_\\d{8}_\\d{6}\\.pdf$`),
    );
    assert.ok(result.mergedPath.startsWith(path.join(tempDir, "merged")));
    assert.equal(result.pageCount, 3);
    assert.equal(auditEntry?.metadata?.pageCount, 3);
    assert.equal(auditEntry?.metadata?.mergedFileName, result.mergedFileName);
    assert.equal(await fs.promises.access(result.mergedPath).then(() => true), true);
  } finally {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
  }
});

test("createPdfGenerationArchive uses school and academic year in the default zip file name", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-archive-name-"));

  try {
    const filesDir = path.join(tempDir, "files");
    const pdfPath = path.join(filesDir, "R1.pdf");

    await fs.promises.mkdir(filesDir, { recursive: true });
    await fs.promises.writeFile(pdfPath, "pdf");

    const rows = [
      createCompletedGenerationRow({
        filePath: pdfPath,
        generationId: "generation-r1",
        roomCode: "R1",
      }),
    ];
    let auditEntry = null;
    const service = createPdfGenerationArchiveService({
      createHttpError,
      ensureStorageDirectories: async (storageRoot) => {
        await fs.promises.mkdir(path.join(storageRoot, "archives"), { recursive: true });
        await fs.promises.mkdir(path.join(storageRoot, "merged"), { recursive: true });
      },
      fs,
      legacyStorageRoot: tempDir,
      path,
      query: async () => rows,
      resolvePdfStorageRootForSchool: async () => tempDir,
      writeAuditLog: async (entry) => {
        auditEntry = entry;
      },
    });
    const result = await service.createPdfGenerationArchive({
      generationIds: ["generation-r1"],
    });

    assert.match(
      result.archiveFileName,
      new RegExp(`^${SCHOOL_SETTINGS_NAME}_2027${ACADEMIC_YEAR_SUFFIX}_${ARCHIVE_ARTIFACT_LABEL}_\\d{8}_\\d{6}\\.zip$`),
    );
    assert.equal(auditEntry?.metadata?.archiveFileName, result.archiveFileName);
    assert.equal(await fs.promises.access(result.archivePath).then(() => true), true);
  } finally {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
  }
});

test("listPdfGenerationArtifacts returns downloadable merged and zip files for a school", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-artifacts-"));

  try {
    const archivePath = path.join(tempDir, "archives", "pdf-archive-1.zip");
    const queryCalls = [];

    await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });
    await fs.promises.writeFile(archivePath, "zip");

    const service = createPdfGenerationArchiveService({
      createHttpError,
      ensureStorageDirectories: async () => {},
      fs,
      legacyStorageRoot: tempDir,
      path,
      query: async (sql, params) => {
        queryCalls.push({ params, sql });

        return [
          {
            action: "pdf_generation_archive_created",
            createdAt: new Date("2026-05-20T01:02:03.000Z"),
            entityId: "pdf-archive-1",
            entityType: "pdf_generation_archive",
            id: "audit-archive-1",
            metadataJson: JSON.stringify({
              archiveFileName: "generated.zip",
              archiveFilePath: archivePath,
              generationCount: 2,
              pageCount: 0,
              schoolIds: ["school-1"],
            }),
            status: "completed",
          },
        ];
      },
      resolvePdfStorageRootForSchool: async () => tempDir,
      writeAuditLog: async () => {},
    });

    const result = await service.listPdfGenerationArtifacts({ limit: 10, schoolId: "school-1" });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].kind, "archive");
    assert.equal(result.items[0].fileName, "generated.zip");
    assert.equal(result.items[0].fileExists, true);
    assert.equal(result.items[0].generationCount, 2);
    assert.equal(result.items[0].pageCount, 0);
    assert.equal(result.items[0].downloadUrl, "/api/pdf-generations/archives/pdf-archive-1/download?name=generated.zip");
    assert.match(queryCalls[0].sql, /pdf_generation_archive_created/);
    assert.deepEqual(queryCalls[0].params, [
      '%"schoolId":"school-1"%',
      '%"schoolIds":[%"school-1"%]%',
      10,
    ]);
  } finally {
    await fs.promises.rm(tempDir, { force: true, recursive: true });
  }
});
