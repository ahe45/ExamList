const { ensureAdminAccountColumns } = require("./schema-accounts");
const { ensureCandidateRecordColumns } = require("./schema-candidates");
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
      await connection.query(schemaSql);
      await ensureSchoolColumns(connection, schemaDependencies);
      await ensureSchoolSettingsColumns(connection, schemaDependencies);
      await ensurePdfTemplateSchoolColumns(connection, schemaDependencies);
      await ensurePdfGenerationHistoryColumns(connection, schemaDependencies);
      await ensurePdfGenerationBatchColumns(connection, schemaDependencies);
      await ensureCandidateRecordColumns(connection, schemaDependencies);
      await ensureAdminAccountColumns(connection, schemaDependencies);
      await backfillSchoolScopedRows(connection, schemaDependencies);
    });
  }

  return Object.freeze({
    ensureSchema,
  });
}

module.exports = {
  createSchemaBootstrapService,
};
