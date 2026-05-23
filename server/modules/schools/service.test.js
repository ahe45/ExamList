const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { createPasswordHash } = require("../auth/service");
const { createSchoolService } = require("./service");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("getSchoolById resolves a school by id or code", async () => {
  const queries = [];
  const service = createSchoolService({
    createHttpError,
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      return [
        {
          candidateCount: 0,
          code: "SEOUL01",
          description: "",
          id: "school-1",
          isActive: 1,
          name: "서울대학교",
          templateCount: 0,
          updatedAt: "2026-05-13T00:00:00.000Z",
        },
      ];
    },
  });

  const school = await service.getSchoolById("SEOUL01");

  assert.equal(school.id, "school-1");
  assert.equal(school.code, "SEOUL01");
  assert.deepEqual(queries[0].params, ["SEOUL01", "SEOUL01"]);
  assert.match(queries[0].sql, /s\.id = \? OR s\.code = \?/);
});

test("listSchools derives updatedAt from related school data", async () => {
  const queries = [];
  const service = createSchoolService({
    createHttpError,
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes("SELECT COUNT(*) AS total")) {
        return [{ total: 1 }];
      }

      return [
        {
          candidateCount: 3,
          code: "SEOUL01",
          description: "",
          id: "school-1",
          isActive: 1,
          name: "서울대학교",
          templateCount: 2,
          updatedAt: new Date("2026-05-15T01:02:03.000Z"),
        },
      ];
    },
  });

  const result = await service.listSchools({ keyword: "서울" });
  const listQuery = queries[1].sql;

  assert.equal(result.total, 1);
  assert.equal(result.items[0].updatedAt, "2026-05-15T01:02:03.000Z");
  assert.match(listQuery, /GREATEST\(/);
  assert.match(listQuery, /FROM pdf_templates/);
  assert.match(listQuery, /FROM pdf_template_pages/);
  assert.match(listQuery, /FROM pdf_template_elements/);
  assert.match(listQuery, /FROM pdf_template_versions/);
  assert.match(listQuery, /FROM candidate_records/);
  assert.match(listQuery, /FROM pdf_generation_histories/);
  assert.match(listQuery, /FROM pdf_generation_batches/);
  assert.match(listQuery, /FROM school_settings/);
  assert.match(listQuery, /ORDER BY s\.name ASC, s\.code ASC/);
});

test("deleteSchool deletes a school and its related data", async () => {
  const queries = [];
  const removedFiles = [];
  const rootDir = path.join("C:\\", "examlist");
  const service = createSchoolService({
    createHttpError,
    fs: {
      existsSync: (filePath) => [
        "C:\\pdf\\school-1.pdf",
        "C:\\pdf\\school-1.zip",
        path.join(rootDir, "storage", "candidate-photos", "A001.jpg"),
      ].includes(filePath),
      promises: {
        rm: async (filePath, options) => {
          removedFiles.push({ filePath, options });
        },
      },
    },
    query: async (sql, params = []) => {
      queries.push({ params, sql });
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("FROM schools s")) {
        return [
          {
            candidateCount: 3,
            code: "SEOUL01",
            description: "",
            id: "school-1",
            isActive: 1,
            name: "서울대학교",
            templateCount: 2,
            updatedAt: "2026-05-13T00:00:00.000Z",
          },
        ];
      }

      if (compactSql.includes("FROM pdf_templates WHERE school_id = ?")) {
        return [{ id: "template-1" }];
      }

      if (compactSql.includes("FROM candidate_records") && compactSql.includes("school_id <> ?")) {
        return [];
      }

      if (compactSql.includes("FROM candidate_records WHERE school_id = ?")) {
        return [{ examineeNo: "A001", id: "candidate-1", photoName: "A001.jpg" }];
      }

      if (compactSql.includes("FROM pdf_generation_histories WHERE school_id = ?")) {
        return [{ filePath: "C:\\pdf\\school-1.pdf", id: "generation-1" }];
      }

      if (compactSql.includes("FROM pdf_generation_batches WHERE school_id = ?")) {
        return [{ archiveFilePath: "C:\\pdf\\school-1.zip", archiveId: "archive-1", id: "batch-1" }];
      }

      if (compactSql.includes("FROM school_settings WHERE school_id = ?")) {
        return [{ id: "settings-1" }];
      }

      return { affectedRows: 1 };
    },
    rootDir,
  });

  const result = await service.deleteSchool("SEOUL01", { canBypassDeletionPassword: true });
  const executedSql = queries.map((query) => query.sql.replace(/\s+/g, " "));

  assert.equal(result.deleted, true);
  assert.equal(result.id, "school-1");
  assert.equal(result.name, "서울대학교");
  assert.deepEqual(result.relatedDeleted, {
    auditLogs: 3,
    candidatePhotoFiles: 1,
    candidatePhotoFilesMissing: 2,
    candidateRecords: 1,
    pdfFiles: 2,
    pdfFilesMissing: 0,
    pdfGenerationBatches: 1,
    pdfGenerationHistories: 1,
    pdfTemplates: 1,
    schoolSettings: 1,
  });
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM pdf_generation_histories WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM pdf_generation_batches WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM candidate_records WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM pdf_templates WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM school_settings WHERE school_id = ?")));
  assert.ok(executedSql.some((sql) => sql.includes("DELETE FROM schools WHERE id = ? AND deleted_at IS NULL")));
  assert.ok(!executedSql.some((sql) => sql.includes("UPDATE schools")));
  assert.deepEqual(
    removedFiles.map((item) => item.filePath),
    [
      "C:\\pdf\\school-1.pdf",
      "C:\\pdf\\school-1.zip",
      path.join(rootDir, "storage", "candidate-photos", "A001.jpg"),
      path.join(rootDir, "storage", "candidate-photos", "A001.jpeg"),
      path.join(rootDir, "storage", "candidate-photos", "A001.png"),
    ],
  );
});

test("deleteSchool requires a school identifier", async () => {
  const service = createSchoolService({
    createHttpError,
    query: async () => [],
  });

  await assert.rejects(
    () => service.deleteSchool(""),
    (error) => error.statusCode === 400 && error.errorCode === "SCHOOL_ID_REQUIRED",
  );
});

test("createSchool requires a deletion password when requested", async () => {
  const service = createSchoolService({
    createHttpError,
    query: async () => [],
  });

  await assert.rejects(
    () => service.createSchool({ code: "SEOUL01", name: "서울대학교" }, { requireDeletionPassword: true }),
    (error) => error.statusCode === 400 && error.errorCode === "SCHOOL_DELETION_PASSWORD_REQUIRED",
  );
});

test("createSchool rejects mismatched deletion password confirmation", async () => {
  const service = createSchoolService({
    createHttpError,
    query: async () => [],
  });

  await assert.rejects(
    () =>
      service.createSchool(
        {
          code: "SEOUL01",
          deletionPassword: "delete-me",
          deletionPasswordConfirm: "delete-other",
          name: "서울대학교",
        },
        { requireDeletionPassword: true },
      ),
    (error) => error.statusCode === 400 && error.errorCode === "SCHOOL_DELETION_PASSWORD_MISMATCH",
  );
});

test("deleteSchool validates the configured deletion password for managers", async () => {
  const deletionPasswordHash = createPasswordHash("delete-me", "salt");
  const service = createSchoolService({
    createHttpError,
    query: async (sql) => {
      const compactSql = sql.replace(/\s+/g, " ");

      if (compactSql.includes("FROM schools s")) {
        return [
          {
            candidateCount: 0,
            code: "SEOUL01",
            description: "",
            id: "school-1",
            isActive: 1,
            name: "서울대학교",
            templateCount: 0,
            updatedAt: "2026-05-13T00:00:00.000Z",
          },
        ];
      }

      if (compactSql.includes("SELECT deletion_password_hash")) {
        return [{ deletionPasswordHash: deletionPasswordHash }];
      }

      throw new Error("삭제 비밀번호 검증 후에만 삭제 쿼리가 실행되어야 합니다.");
    },
  });

  await assert.rejects(
    () => service.deleteSchool("SEOUL01", { deletionPassword: "wrong" }),
    (error) => error.statusCode === 403 && error.errorCode === "INVALID_SCHOOL_DELETION_PASSWORD",
  );
});
