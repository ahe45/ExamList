const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createPdfGenerationService } = require("./service");

test("enqueuePdfGenerationBatch queues one generation job per selected target", async () => {
  const previousStorageDir = process.env.PDF_STORAGE_DIR;
  const previousQueueDriver = process.env.PDF_QUEUE_DRIVER;
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "examlist-test-"));
  const batchRows = new Map();
  const historyRows = new Map();
  const template = {
    description: "",
    generationUnit: "room",
    id: "template-1",
    layout: {
      pages: [
        {
          elements: [],
          type: "content",
        },
      ],
    },
    name: "고사실 템플릿",
    orientation: "portrait",
    paperPreset: "A4",
  };

  process.env.PDF_STORAGE_DIR = "pdf-storage";
  process.env.PDF_QUEUE_DRIVER = "memory";

  const service = createPdfGenerationService({
    candidateService: {},
    createHttpError: (statusCode, message, errorCode) => Object.assign(new Error(message), { errorCode, statusCode }),
    fs,
    path,
    pdfPreviewService: {
      async resolvePreviewTemplate() {
        return template;
      },
    },
    async query(sql, params = []) {
      if (sql.includes("INSERT INTO pdf_generation_batches")) {
        const row = {
          archiveFileName: params[13],
          archiveFilePath: params[14],
          archiveId: params[12],
          completedAt: params[17],
          createdAt: new Date("2026-04-21T00:00:00Z"),
          errorMessage: params[16],
          failedCount: params[10],
          generationUnit: params[4],
          id: params[0],
          progressPercent: params[11],
          queuedCount: params[7],
          requestJson: params[15],
          runningCount: params[8],
          schoolId: params[1],
          status: params[5],
          succeededCount: params[9],
          templateId: params[2],
          templateName: params[3],
          totalRequested: params[6],
          updatedAt: new Date("2026-04-21T00:00:00Z"),
        };

        batchRows.set(row.id, row);
        return [];
      }

      if (sql.includes("INSERT INTO pdf_generation_histories")) {
        const row = {
          attemptCount: params[15],
          batchId: params[14],
          candidateCount: params[8],
          completedAt: params[23],
          createdAt: new Date("2026-04-21T00:00:00Z"),
          errorMessage: params[18],
          expiresAt: params[20],
          fileName: params[4],
          fileSizeBytes: params[10],
          generationUnit: params[6],
          id: params[0],
          jobId: params[13],
          maxAttempts: params[16],
          pageCount: params[9],
          progressPercent: params[12],
          purgedAt: params[21],
          requestJson: params[19],
          schoolId: params[1],
          startedAt: params[22],
          status: params[11],
          targetName: params[7],
          templateId: params[2],
          templateName: params[3],
          updatedAt: new Date("2026-04-21T00:00:00Z"),
          warningJson: params[17],
        };

        historyRows.set(row.id, row);
        return [];
      }

      if (sql.includes("INSERT INTO pdf_audit_logs")) {
        return [];
      }

      if (sql.includes("FROM pdf_generation_batches") && sql.includes("WHERE id = ?")) {
        return [batchRows.get(params[0])].filter(Boolean);
      }

      if (sql.includes("FROM pdf_generation_histories") && sql.includes("WHERE batch_id = ?")) {
        return [...historyRows.values()].filter((row) => row.batchId === params[0]);
      }

      if (sql.includes("template_name AS templateName") && sql.includes("WHERE id = ?")) {
        return [historyRows.get(params[0])].filter(Boolean);
      }

      if (sql.includes("UPDATE pdf_generation_batches")) {
        const row = batchRows.get(params[15]);

        if (row) {
          row.status = params[0];
          row.totalRequested = params[1];
          row.queuedCount = params[2];
          row.runningCount = params[3];
          row.succeededCount = params[4];
          row.failedCount = params[5];
          row.progressPercent = params[6];
          row.updatedAt = new Date("2026-04-21T00:00:00Z");
        }

        return [];
      }

      if (sql.includes("job_id AS jobId") && sql.includes("request_json AS requestJson")) {
        return [];
      }

      return [];
    },
    root: tempRoot,
  });

  try {
    const payload = await service.enqueuePdfGenerationBatch({
      generationUnit: "room",
      targets: ["101호", "102호"],
      template,
      templateId: "template-1",
    });

    assert.equal(payload.status, "queued");
    assert.equal(payload.queuedCount, 2);
    assert.equal(payload.totalRequested, 2);
    assert.equal(payload.items.length, 2);
    assert.deepEqual(payload.items.map((item) => item.targetName), ["101호", "102호"]);
    assert.equal([...historyRows.values()].filter((row) => row.status === "queued").length, 2);
    assert.equal(batchRows.get(payload.batchId).queuedCount, 2);
    assert.equal(fs.existsSync(path.join(tempRoot, "pdf-storage")), false);
    assert.equal(fs.existsSync(path.join(tempRoot, "storage", "pdf-generations")), false);
  } finally {
    if (typeof previousStorageDir === "undefined") {
      delete process.env.PDF_STORAGE_DIR;
    } else {
      process.env.PDF_STORAGE_DIR = previousStorageDir;
    }

    if (typeof previousQueueDriver === "undefined") {
      delete process.env.PDF_QUEUE_DRIVER;
    } else {
      process.env.PDF_QUEUE_DRIVER = previousQueueDriver;
    }

    await fs.promises.rm(tempRoot, { force: true, recursive: true });
  }
});
