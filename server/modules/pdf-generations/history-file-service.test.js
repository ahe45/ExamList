const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfGenerationFileActions } = require("./history-file-service");

function createHttpError(statusCode, message, errorCode) {
  return Object.assign(new Error(message), {
    errorCode,
    statusCode,
  });
}

test("deletePdfGenerations removes completed history rows and their files", async () => {
  let ensureCalls = 0;
  const removedFiles = [];
  const queryCalls = [];
  const auditLogs = [];
  const fileRows = [
    {
      filePath: "C:\\storage\\first.pdf",
      fileSizeBytes: 1024,
      id: "first",
      schoolId: "school-1",
      status: "completed",
    },
    {
      filePath: "C:\\storage\\second.pdf",
      fileSizeBytes: 2048,
      id: "second",
      schoolId: "school-1",
      status: "completed",
    },
  ];
  const actions = createPdfGenerationFileActions({
    createHttpError,
    ensureStorageDirectories: async () => {
      ensureCalls += 1;
    },
    fs: {
      existsSync: (filePath) => filePath === "C:\\storage\\first.pdf",
      promises: {
        rm: async (filePath, options) => {
          removedFiles.push({ filePath, options });
        },
      },
    },
    query: async (sql, params) => {
      queryCalls.push({ params, sql });

      if (sql.includes("SELECT") && sql.includes("FROM pdf_generation_histories")) {
        return fileRows;
      }

      return { affectedRows: params.length };
    },
    writeAuditLog: async (payload) => {
      auditLogs.push(payload);
    },
  });

  const result = await actions.deletePdfGenerations({
    generationIds: ["first", "second", "first", "failed"],
  });
  const deleteCall = queryCalls.find((call) => call.sql.includes("DELETE FROM pdf_generation_histories"));

  assert.deepEqual(queryCalls[0].params, ["first", "second", "failed"]);
  assert.deepEqual(deleteCall.params, ["first", "second"]);
  assert.deepEqual(
    removedFiles.map((item) => item.filePath),
    ["C:\\storage\\first.pdf", "C:\\storage\\second.pdf"],
  );
  assert.equal(result.requestedCount, 3);
  assert.equal(result.deletedCount, 2);
  assert.equal(result.fileDeletedCount, 1);
  assert.equal(result.fileMissingCount, 1);
  assert.equal(result.totalFileSizeBytes, 3072);
  assert.equal(ensureCalls, 0);
  assert.equal(auditLogs[0].action, "pdf_generation_deleted");
  assert.equal(auditLogs[0].metadata.deletedCount, 2);
  assert.deepEqual(auditLogs[0].metadata.generationIds, ["first", "second"]);
  assert.deepEqual(auditLogs[0].metadata.schoolIds, ["school-1"]);
});

test("listPdfAuditLogs scopes audit rows by school id", async () => {
  const queryCalls = [];
  const actions = createPdfGenerationFileActions({
    createHttpError,
    ensureStorageDirectories: async () => {},
    fs: {
      existsSync: () => false,
      promises: {
        rm: async () => {},
      },
    },
    query: async (sql, params) => {
      queryCalls.push({ params, sql });

      if (sql.includes("FROM pdf_audit_logs")) {
        return [
          {
            action: "pdf_generation_completed",
            createdAt: new Date("2026-05-20T01:02:03.000Z"),
            entityId: "generation-1",
            entityType: "pdf_generation",
            id: "audit-1",
            metadataJson: JSON.stringify({ schoolId: "school-1", templateId: "template-1" }),
            status: "completed",
          },
        ];
      }

      return [];
    },
    writeAuditLog: async () => {},
  });

  const result = await actions.listPdfAuditLogs({ limit: 5, schoolId: "school-1" });
  const [auditQuery] = queryCalls;

  assert.equal(result.items.length, 1);
  assert.match(auditQuery.sql, /WHERE \(/);
  assert.match(auditQuery.sql, /FROM pdf_generation_histories audit_history/);
  assert.match(auditQuery.sql, /FROM pdf_generation_batches audit_batch/);
  assert.deepEqual(auditQuery.params, [
    '%"schoolId":"school-1"%',
    '%"schoolIds":[%"school-1"%]%',
    "school-1",
    "school-1",
    "school-1",
    '%"schoolId":"school-1"%',
    '%"schoolIds":[%"school-1"%]%',
    5,
  ]);
});

test("cleanupExpiredPdfGenerations purges files without creating storage directories", async () => {
  let ensureCalls = 0;
  const removedFiles = [];
  const actions = createPdfGenerationFileActions({
    createHttpError,
    ensureStorageDirectories: async () => {
      ensureCalls += 1;
    },
    fs: {
      existsSync: () => false,
      promises: {
        rm: async (filePath, options) => {
          removedFiles.push({ filePath, options });
        },
      },
    },
    query: async (sql) => {
      if (sql.includes("SELECT") && sql.includes("FROM pdf_generation_histories")) {
        return [
          {
            filePath: "C:\\storage\\expired.pdf",
            id: "expired",
          },
        ];
      }

      return [];
    },
    writeAuditLog: async () => {},
  });

  const result = await actions.cleanupExpiredPdfGenerations({ retentionDays: 30 });

  assert.equal(result.purgedCount, 1);
  assert.deepEqual(removedFiles.map((item) => item.filePath), ["C:\\storage\\expired.pdf"]);
  assert.equal(ensureCalls, 0);
});

test("deletePdfGenerations requires at least one target id", async () => {
  let ensureCalls = 0;
  const actions = createPdfGenerationFileActions({
    createHttpError,
    ensureStorageDirectories: async () => {
      ensureCalls += 1;
    },
    fs: {
      existsSync: () => false,
      promises: {
        rm: async () => {},
      },
    },
    query: async () => [],
    writeAuditLog: async () => {},
  });

  await assert.rejects(
    () => actions.deletePdfGenerations({ generationIds: [] }),
    {
      errorCode: "PDF_GENERATION_DELETE_TARGET_REQUIRED",
      statusCode: 400,
    },
  );
  assert.equal(ensureCalls, 0);
});

test("listPdfAuditLogs resolves template ids to readable template titles", async () => {
  const queryCalls = [];
  const actions = createPdfGenerationFileActions({
    createHttpError,
    ensureStorageDirectories: async () => {},
    fs: {
      existsSync: () => false,
      promises: {
        rm: async () => {},
      },
    },
    query: async (sql, params) => {
      queryCalls.push({ params, sql });

      if (sql.includes("FROM pdf_audit_logs")) {
        return [
          {
            action: "pdf_generation_completed",
            createdAt: new Date("2026-05-20T01:02:03.000Z"),
            entityId: "generation-1",
            entityType: "pdf_generation",
            id: "audit-1",
            metadataJson: JSON.stringify({ generationUnit: "room", templateId: "template-1" }),
            status: "completed",
          },
          {
            action: "pdf_generation_batch_completed",
            createdAt: new Date("2026-05-20T01:03:03.000Z"),
            entityId: "batch-1",
            entityType: "pdf_generation_batch",
            id: "audit-2",
            metadataJson: JSON.stringify({ succeededCount: 3 }),
            status: "completed",
          },
          {
            action: "pdf_generation_preview_created",
            createdAt: new Date("2026-05-20T01:04:03.000Z"),
            entityId: "preview-1",
            entityType: "pdf_generation_preview",
            id: "audit-3",
            metadataJson: JSON.stringify({ templateId: "template-3" }),
            status: "completed",
          },
        ];
      }

      if (sql.includes("FROM pdf_generation_histories")) {
        assert.deepEqual(params, ["generation-1", "batch-1", "preview-1"]);
        return [
          {
            id: "generation-1",
            templateId: "template-1",
            templateName: "고사실 수험표",
          },
        ];
      }

      if (sql.includes("FROM pdf_generation_batches")) {
        assert.deepEqual(params, ["batch-1"]);
        return [
          {
            id: "batch-1",
            templateId: "template-2",
            templateName: "일괄 생성 양식",
          },
        ];
      }

      if (sql.includes("FROM pdf_templates")) {
        assert.deepEqual(params, ["template-3"]);
        return [
          {
            id: "template-3",
            name: "미리보기 양식",
          },
        ];
      }

      return [];
    },
    writeAuditLog: async () => {},
  });

  const result = await actions.listPdfAuditLogs({ limit: 100 });

  assert.equal(result.items[0].metadata.templateTitle, "고사실 수험표");
  assert.equal(result.items[1].metadata.templateTitle, "일괄 생성 양식");
  assert.equal(result.items[2].metadata.templateTitle, "미리보기 양식");
  assert.equal(queryCalls[0].params[0], 100);
});
