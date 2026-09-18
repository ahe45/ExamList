const { createHash } = require("node:crypto");
const { ensurePerformanceSchema } = require("./schema-performance");
const { ensureAdminAccountColumns } = require("./schema-accounts");
const { ensureCandidateRecordColumns } = require("./schema-candidates");
const { ensurePdfTemplateVersionColumns } = require("./schema-pdf-templates");
const {
  ensurePdfGenerationBatchColumns,
  ensurePdfGenerationHistoryColumns,
} = require("./schema-pdf-generations");
const {
  backfillSchoolScopedRows,
  ensurePdfTemplateSchoolColumns,
  ensureSchoolColumns,
  ensureSchoolSettingsColumns,
} = require("./schema-schools");
const {
  dropIndexIfExists,
  ensureColumn,
  ensureIndex,
  hasColumn,
} = require("./schema-utils");
const { withDatabaseConnection } = require("../database/connection");

function createSchemaBootstrapService({ fs, path, root, getPool }) {
  const defaultSchoolId = "school-default";
  const schemaDependencies = Object.freeze({
    defaultSchoolId,
    dropIndexIfExists,
    ensureColumn,
    ensureIndex,
    hasColumn,
  });

  async function ensureSchema() {
    const schemaPath = path.join(root, "db", "schema.sql");
    const schemaSql = await fs.promises.readFile(schemaPath, "utf8");

    await withDatabaseConnection(getPool, async (connection) => {
      // Serialize migrations across web/worker processes. Record only fully applied changes.
      const [[lock]] = await connection.query("SELECT GET_LOCK('examlist_schema_migration', 120) AS acquired");
      if (Number(lock.acquired) !== 1) throw new Error("DB 업데이트 잠금을 가져오지 못했습니다.");
      try {
      await connection.query("CREATE TABLE IF NOT EXISTS app_schema_migrations (id VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
      const schemaFiles = ["schema-accounts.js", "schema-candidates.js", "schema-pdf-generations.js", "schema-pdf-templates.js", "schema-schools.js", "schema-utils.js"];
      const sources = await Promise.all(schemaFiles.map(file => fs.promises.readFile(path.join(root, "server", "modules", "bootstrap", file), "utf8")));
      const legacyVersion = "legacy-" + createHash("sha256").update(schemaSql + sources.join("\n")).digest("hex");
      const [applied] = await connection.query("SELECT id FROM app_schema_migrations");
      const appliedIds = new Set(applied.map(row => row.id));
      if (!appliedIds.has(legacyVersion)) {
      await connection.query(schemaSql);
      await ensureSchoolColumns(connection, schemaDependencies);
      await ensureSchoolSettingsColumns(connection, schemaDependencies);
      await ensurePdfTemplateSchoolColumns(connection, schemaDependencies);
      await ensurePdfTemplateVersionColumns(connection, schemaDependencies);
      await ensurePdfGenerationHistoryColumns(connection, schemaDependencies);
      await ensurePdfGenerationBatchColumns(connection, schemaDependencies);
      await ensureCandidateRecordColumns(connection, schemaDependencies);
      await ensureAdminAccountColumns(connection, schemaDependencies);
      await backfillSchoolScopedRows(connection, schemaDependencies);
      await connection.query("INSERT IGNORE INTO app_schema_migrations (id) VALUES (?)", [legacyVersion]);
      }
      if (!appliedIds.has("performance-20260918-v1")) {
        await ensurePerformanceSchema(connection);
        await connection.query("INSERT IGNORE INTO app_schema_migrations (id) VALUES ('performance-20260918-v1')");
      }
      } finally {
        await connection.query("SELECT RELEASE_LOCK('examlist_schema_migration')");
      }
    });
  }

  return Object.freeze({
    ensureSchema,
  });
}

module.exports = {
  createSchemaBootstrapService,
};
