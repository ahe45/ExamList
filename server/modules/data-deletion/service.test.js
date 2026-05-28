const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  DATA_DELETION_CONFIRMATION_PHRASE,
  createDataDeletionService,
  normalizeDataDeletionScope,
} = require("./service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("normalizeDataDeletionScope supports aliases", () => {
  assert.equal(normalizeDataDeletionScope("candidate-photos"), "photos");
  assert.equal(normalizeDataDeletionScope("PDF-GENERATIONS"), "pdf-generations");
  assert.equal(normalizeDataDeletionScope("unknown"), "");
});

test("deleteProjectData deletes all project data for a school without deleting the school", async () => {
  const queries = [];
  const removedFiles = [];
  const rootDir = path.join("C:\\", "examlist");
  const service = createDataDeletionService({
    createHttpError,
    fs: {
      existsSync: (filePath) => [
        "C:\\pdf\\school-1.pdf",
        "C:\\pdf\\school-1.zip",
        path.join(rootDir, "storage", "pdf-generations", "merged", "pdf-merged-1.pdf"),
        path.join(rootDir, "storage", "candidate-photos", "A001.jpg"),
      ].includes(filePath),
      promises: {
        rm: async (filePath, options) => {
          removedFiles.push({ filePath, options });
        },
      },
    },
    getSchoolById: async (schoolId) => ({
      id: "school-1",
      name: schoolId === "SEOUL01" ? "서울대학교" : "학교",
    }),
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("FROM pdf_generation_histories WHERE school_id = ?")) {
        return [{ filePath: "C:\\pdf\\school-1.pdf", id: "generation-1" }];
      }

      if (compactSql.includes("FROM pdf_generation_batches WHERE school_id = ?")) {
        return [{ archiveFilePath: "C:\\pdf\\school-1.zip", archiveId: "archive-1", id: "batch-1" }];
      }

      if (compactSql.includes("FROM pdf_audit_logs WHERE entity_type = 'pdf_generation_merged'")) {
        return [
          { entityId: "pdf-merged-1", id: "audit-merged-created", metadataJson: "{}" },
          { entityId: "pdf-merged-1", id: "audit-merged-downloaded", metadataJson: "{}" },
        ];
      }

      if (compactSql.includes("COUNT(*) AS total FROM pdf_audit_logs")) {
        return [{ total: 3 }];
      }

      if (compactSql.includes("FROM candidate_records WHERE school_id = ?")) {
        return [{ examineeNo: "A001", id: "candidate-1", photoName: "A001.jpg" }];
      }

      if (compactSql.includes("FROM candidate_records") && compactSql.includes("school_id <> ?")) {
        return [];
      }

      if (compactSql.includes("FROM pdf_templates WHERE school_id = ?")) {
        return [{ id: "template-1" }];
      }

      return { affectedRows: 1 };
    },
    rootDir,
  });

  const result = await service.deleteProjectData("all", {
    confirmationPhrase: DATA_DELETION_CONFIRMATION_PHRASE,
    schoolId: "SEOUL01",
  });
  const executedSql = queries.map((query) => query.sql.replace(/\s+/g, " "));

  assert.equal(result.deleted, true);
  assert.equal(result.schoolId, "school-1");
  assert.equal(result.scope, "all");
  assert.equal(result.deletedCandidateRecords, 1);
  assert.equal(result.deletedCandidatePhotos, 1);
  assert.equal(result.deletedPdfGenerationHistories, 1);
  assert.equal(result.deletedPdfGenerationBatches, 1);
  assert.equal(result.deletedPdfAuditLogs, 5);
  assert.equal(result.deletedPdfTemplates, 1);
  assert.equal(result.deletedPdfFiles, 3);
  assert.equal(result.deletedCandidatePhotoFiles, 1);
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM pdf_generation_histories WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM pdf_audit_logs WHERE id IN")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM candidate_records WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM pdf_templates WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("UPDATE schools SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")));
  assert.equal(executedSql.some((sql) => sql.includes("DELETE FROM schools")), false);
  assert.deepEqual(
    removedFiles.map((item) => item.filePath),
    [
      "C:\\pdf\\school-1.pdf",
      "C:\\pdf\\school-1.zip",
      path.join(rootDir, "storage", "pdf-generations", "merged", "pdf-merged-1.pdf"),
      path.join(rootDir, "storage", "candidate-photos", "A001.jpg"),
      path.join(rootDir, "storage", "candidate-photos", "A001.jpeg"),
      path.join(rootDir, "storage", "candidate-photos", "A001.png"),
    ],
  );
});

test("deleteProjectData clears candidate photos without deleting candidate rows", async () => {
  const queries = [];
  const service = createDataDeletionService({
    createHttpError,
    fs: {
      existsSync: () => false,
      promises: {
        rm: async () => {},
      },
    },
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("FROM candidate_records WHERE school_id = ?")) {
        return [
          { examineeNo: "A001", id: "candidate-1", photoName: "A001.jpg" },
          { examineeNo: "A002", id: "candidate-2", photoName: "A002.png" },
        ];
      }

      if (compactSql.includes("FROM candidate_records") && compactSql.includes("school_id <> ?")) {
        return [{ examineeNo: "A002", photoName: "A002.png" }];
      }

      return { affectedRows: 2 };
    },
    rootDir: path.join("C:\\", "examlist"),
  });

  const result = await service.deleteProjectData("photos", { schoolId: "school-1" });
  const executedSql = queries.map((query) => query.sql.replace(/\s+/g, " "));

  assert.equal(result.deletedCandidatePhotos, 2);
  assert.equal(result.deletedCandidateRecords, 0);
  assert.ok(executedSql.some((sql) => sql.includes("UPDATE candidate_records SET photo_name = ''")));
  assert.equal(executedSql.some((sql) => sql.includes("DELETE FROM candidate_records")), false);
});

test("deleteProjectData deletes only candidate rows matching deletion unit filters", async () => {
  const queries = [];
  const service = createDataDeletionService({
    createHttpError,
    fs: {
      existsSync: () => false,
      promises: {
        rm: async () => {},
      },
    },
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      const compactSql = sql.replace(/\s+/g, " ");

      if (
        compactSql.includes("FROM candidate_records WHERE school_id = ?") &&
        compactSql.includes("admission = ?") &&
        compactSql.includes("campus = ?") &&
        compactSql.includes("track = ?")
      ) {
        return [
          { examineeNo: "A001", id: "candidate-1", photoName: "A001.jpg" },
          { examineeNo: "A002", id: "candidate-2", photoName: "" },
        ];
      }

      if (compactSql.includes("FROM candidate_records") && compactSql.includes("school_id <> ?")) {
        return [];
      }

      if (compactSql.includes("DELETE FROM candidate_records WHERE id IN")) {
        return { affectedRows: 2 };
      }

      return { affectedRows: 1 };
    },
    rootDir: path.join("C:\\", "examlist"),
  });

  const result = await service.deleteProjectData("candidates", {
    filters: {
      admission: "학생부종합",
      campus: "서울",
      track: "수시",
    },
    schoolId: "school-1",
  });
  const deleteQuery = queries.find((query) => query.sql.replace(/\s+/g, " ").includes("DELETE FROM candidate_records WHERE id IN"));

  assert.equal(result.deletedCandidateRecords, 2);
  assert.equal(result.deletedCandidatePhotos, 1);
  assert.deepEqual(result.filters, {
    admission: "학생부종합",
    campus: "서울",
    track: "수시",
  });
  assert.deepEqual(deleteQuery.params, ["candidate-1", "candidate-2"]);
});

test("deleteProjectData deletes filtered PDF histories and only fully matched batches", async () => {
  const queries = [];
  const removedFiles = [];
  const rootDir = path.join("C:\\", "examlist");
  const service = createDataDeletionService({
    createHttpError,
    fs: {
      existsSync: (filePath) => [
        "C:\\pdf\\selected.pdf",
        "C:\\pdf\\selected.zip",
        path.join(rootDir, "storage", "pdf-generations", "merged", "pdf-merged-selected.pdf"),
      ].includes(filePath),
      promises: {
        rm: async (filePath) => {
          removedFiles.push(filePath);
        },
      },
    },
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("FROM pdf_generation_histories WHERE school_id = ?")) {
        return [
          {
            batchId: "batch-1",
            filePath: "C:\\pdf\\selected.pdf",
            id: "generation-1",
            requestJson: JSON.stringify({
              resultScope: {
                admission: "학생부종합",
                campus: "서울",
                track: "수시",
              },
            }),
          },
          {
            batchId: "batch-2",
            filePath: "C:\\pdf\\other.pdf",
            id: "generation-2",
            requestJson: JSON.stringify({
              resultScope: {
                admission: "논술",
                campus: "서울",
                track: "수시",
              },
            }),
          },
        ];
      }

      if (compactSql.includes("FROM pdf_generation_batches WHERE school_id = ?")) {
        return [
          { archiveFilePath: "C:\\pdf\\selected.zip", archiveId: "archive-1", id: "batch-1" },
          { archiveFilePath: "C:\\pdf\\other.zip", archiveId: "archive-2", id: "batch-2" },
        ];
      }

      if (compactSql.includes("FROM pdf_audit_logs WHERE entity_type = 'pdf_generation_merged'")) {
        return [
          {
            entityId: "pdf-merged-selected",
            id: "audit-merged-created",
            metadataJson: JSON.stringify({ generationIds: ["generation-1"], schoolIds: ["school-1"] }),
          },
          { entityId: "pdf-merged-selected", id: "audit-merged-downloaded", metadataJson: "{}" },
          {
            entityId: "pdf-merged-other",
            id: "audit-merged-other",
            metadataJson: JSON.stringify({ generationIds: ["generation-2"], schoolIds: ["school-1"] }),
          },
        ];
      }

      if (compactSql.includes("COUNT(*) AS total FROM pdf_audit_logs")) {
        return [{ total: 2 }];
      }

      if (compactSql.includes("DELETE FROM pdf_generation_histories WHERE id IN")) {
        return { affectedRows: 1 };
      }

      if (compactSql.includes("DELETE FROM pdf_generation_batches WHERE id IN")) {
        return { affectedRows: 1 };
      }

      return { affectedRows: 1 };
    },
    rootDir,
  });

  const result = await service.deleteProjectData("pdf-generations", {
    filters: {
      admission: "학생부종합",
      campus: "서울",
      track: "수시",
    },
    schoolId: "school-1",
  });
  const historyDeleteQuery = queries.find((query) =>
    query.sql.replace(/\s+/g, " ").includes("DELETE FROM pdf_generation_histories WHERE id IN"),
  );
  const batchDeleteQuery = queries.find((query) =>
    query.sql.replace(/\s+/g, " ").includes("DELETE FROM pdf_generation_batches WHERE id IN"),
  );

  assert.equal(result.deletedPdfGenerationHistories, 1);
  assert.equal(result.deletedPdfGenerationBatches, 1);
  assert.equal(result.deletedPdfAuditLogs, 4);
  assert.deepEqual(historyDeleteQuery.params, ["generation-1"]);
  assert.deepEqual(batchDeleteQuery.params, ["batch-1"]);
  assert.deepEqual(removedFiles, [
    "C:\\pdf\\selected.pdf",
    "C:\\pdf\\selected.zip",
    path.join(rootDir, "storage", "pdf-generations", "merged", "pdf-merged-selected.pdf"),
  ]);
});

test("deleteProjectData deletes only selected templates for template scope", async () => {
  const queries = [];
  const service = createDataDeletionService({
    createHttpError,
    fs: {
      existsSync: () => false,
      promises: {
        rm: async () => {},
      },
    },
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("FROM pdf_templates WHERE school_id = ?")) {
        return [
          { id: "template-1", name: "삭제 대상" },
          { id: "template-2", name: "유지 대상" },
        ];
      }

      if (compactSql.includes("DELETE FROM pdf_templates WHERE id IN")) {
        return { affectedRows: 1 };
      }

      return { affectedRows: 1 };
    },
  });

  const result = await service.deleteProjectData("templates", {
    schoolId: "school-1",
    templateIds: ["template-1"],
  });
  const templateDeleteQuery = queries.find((query) =>
    query.sql.replace(/\s+/g, " ").includes("DELETE FROM pdf_templates WHERE id IN"),
  );
  const pageDeleteQuery = queries.find((query) =>
    query.sql.replace(/\s+/g, " ").includes("DELETE FROM pdf_template_pages WHERE template_id IN"),
  );

  assert.equal(result.deletedPdfTemplates, 1);
  assert.deepEqual(templateDeleteQuery.params, ["template-1"]);
  assert.deepEqual(pageDeleteQuery.params, ["template-1"]);
  assert.equal(result.filters && Object.keys(result.filters).length, 0);
});

test("getProjectDataDeletionSummary returns delete scope counts", async () => {
  const service = createDataDeletionService({
    createHttpError,
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql) => {
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("COUNT(*) AS total FROM candidate_records WHERE school_id = ? AND photo_name <> ''")) {
        return [{ total: 2 }];
      }

      if (compactSql.includes("COUNT(*) AS total FROM candidate_records WHERE school_id = ?")) {
        return [{ total: 5 }];
      }

      if (compactSql.includes("FROM pdf_generation_histories WHERE school_id = ?")) {
        return [
          { filePath: "C:\\pdf\\one.pdf", id: "generation-1" },
          { filePath: "C:\\pdf\\two.pdf", id: "generation-2" },
        ];
      }

      if (compactSql.includes("FROM pdf_generation_batches WHERE school_id = ?")) {
        return [{ archiveFilePath: "C:\\pdf\\archive.zip", archiveId: "archive-1", id: "batch-1" }];
      }

      if (compactSql.includes("FROM pdf_audit_logs WHERE entity_type = 'pdf_generation_merged'")) {
        return [
          {
            entityId: "pdf-merged-summary",
            id: "audit-merged-created",
            metadataJson: JSON.stringify({ generationIds: ["generation-1"], schoolIds: ["school-1"] }),
          },
          { entityId: "pdf-merged-summary", id: "audit-merged-downloaded", metadataJson: "{}" },
        ];
      }

      if (compactSql.includes("COUNT(*) AS total FROM pdf_audit_logs")) {
        return [{ total: 4 }];
      }

      if (compactSql.includes("FROM pdf_templates WHERE school_id = ?")) {
        return [{ id: "template-1" }, { id: "template-2" }];
      }

      if (compactSql.includes("FROM pdf_template_pages")) {
        return [{ total: 3 }];
      }

      if (compactSql.includes("FROM pdf_template_elements")) {
        return [{ total: 7 }];
      }

      if (compactSql.includes("FROM pdf_template_versions")) {
        return [{ total: 2 }];
      }

      return [{ total: 0 }];
    },
  });

  const summary = await service.getProjectDataDeletionSummary({ schoolId: "school-1" });
  const pdfScope = summary.scopes.find((scope) => scope.scope === "pdf-generations");
  const templateScope = summary.scopes.find((scope) => scope.scope === "templates");
  const allScope = summary.scopes.find((scope) => scope.scope === "all");

  assert.equal(summary.schoolName, "서울대학교");
  assert.equal(summary.counts.candidateRecords, 5);
  assert.equal(summary.counts.candidatePhotos, 2);
  assert.equal(summary.counts.pdfGenerationHistories, 2);
  assert.equal(summary.counts.pdfGenerationBatches, 1);
  assert.equal(summary.counts.pdfFiles, 4);
  assert.equal(summary.counts.pdfAuditLogs, 6);
  assert.equal(summary.counts.pdfTemplates, 2);
  assert.equal(templateScope.items.find((item) => item.key === "pdfTemplateElements").count, 7);
  assert.equal(pdfScope.totalCount, 13);
  assert.equal(allScope.totalCount, 34);
});

test("getProjectDataDeletionSummary returns template list and counts selected templates only", async () => {
  const service = createDataDeletionService({
    createHttpError,
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql, params = []) => {
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("COUNT(*) AS total FROM candidate_records")) {
        return [{ total: 0 }];
      }

      if (compactSql.includes("FROM pdf_generation_histories WHERE school_id = ?")) {
        return [];
      }

      if (compactSql.includes("FROM pdf_generation_batches WHERE school_id = ?")) {
        return [];
      }

      if (compactSql.includes("FROM pdf_templates WHERE school_id = ?")) {
        assert.deepEqual(params, ["school-1"]);
        return [
          {
            description: "첫 번째",
            generationUnit: "roomCode",
            id: "template-1",
            layoutJson: JSON.stringify({ pages: [{ id: "page-1", type: "cover" }] }),
            name: "수험표",
          },
          {
            description: "두 번째",
            generationUnit: "examDate",
            id: "template-2",
            layoutJson: JSON.stringify({ pages: [{ id: "page-2", type: "content" }] }),
            name: "명단",
          },
        ];
      }

      if (compactSql.includes("FROM pdf_template_pages")) {
        assert.deepEqual(params, ["template-2"]);
        return [{ total: 2 }];
      }

      if (compactSql.includes("FROM pdf_template_elements")) {
        assert.deepEqual(params, ["template-2"]);
        return [{ total: 5 }];
      }

      if (compactSql.includes("FROM pdf_template_versions")) {
        assert.deepEqual(params, ["template-2"]);
        return [{ total: 1 }];
      }

      return [{ total: 0 }];
    },
  });

  const summary = await service.getProjectDataDeletionSummary({
    schoolId: "school-1",
    templateIds: ["template-2"],
  });
  const templateScope = summary.scopes.find((scope) => scope.scope === "templates");

  assert.equal(summary.templates.items.length, 2);
  assert.deepEqual(summary.templates.items[0].layout, { pages: [{ id: "page-1", type: "cover" }] });
  assert.deepEqual(summary.templates.selectedIds, ["template-2"]);
  assert.equal(summary.counts.pdfTemplates, 1);
  assert.equal(summary.counts.pdfTemplatePages, 2);
  assert.equal(summary.counts.pdfTemplateElements, 5);
  assert.equal(summary.counts.pdfTemplateVersions, 1);
  assert.equal(templateScope.totalCount, 9);
});

test("getProjectDataDeletionSummary excludes template counts when deletion unit filters are active", async () => {
  const service = createDataDeletionService({
    createHttpError,
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async (sql) => {
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("COUNT(*) AS total FROM candidate_records")) {
        return [{ total: 3 }];
      }

      if (compactSql.includes("FROM pdf_generation_histories WHERE school_id = ?")) {
        return [];
      }

      if (compactSql.includes("FROM pdf_generation_batches WHERE school_id = ?")) {
        return [];
      }

      if (compactSql.includes("FROM pdf_templates WHERE school_id = ?")) {
        throw new Error("Template counts should not be loaded for filtered deletion.");
      }

      return [{ total: 0 }];
    },
  });

  const summary = await service.getProjectDataDeletionSummary({
    filters: {
      campus: "서울",
    },
    schoolId: "school-1",
  });
  const templateScope = summary.scopes.find((scope) => scope.scope === "templates");

  assert.equal(summary.filterMode, "filtered");
  assert.equal(summary.templatesExcludedByFilters, true);
  assert.equal(summary.counts.candidateRecords, 3);
  assert.equal(summary.counts.pdfTemplates, 0);
  assert.equal(templateScope.totalCount, 0);
});

test("deleteProjectData requires the confirmation phrase for all data", async () => {
  const service = createDataDeletionService({
    createHttpError,
    getSchoolById: async () => ({ id: "school-1", name: "서울대학교" }),
    query: async () => [],
  });

  await assert.rejects(
    () => service.deleteProjectData("all", { confirmationPhrase: "삭제", schoolId: "school-1" }),
    (error) => error.statusCode === 400 && error.errorCode === "DATA_DELETION_CONFIRMATION_REQUIRED",
  );
});
