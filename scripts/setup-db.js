const { ensureDatabaseExists, getPool } = require("../db");
const { createAppContext } = require("../server/create-app-context");

async function run() {
  await ensureDatabaseExists();
  const appContext = createAppContext();

  try {
    await appContext.services.schemaBootstrapService.ensureSchema();
    console.log("Database schema is ready.");
  } catch (error) {
    const translatedError = appContext.translateDatabaseError(error);
    console.error(translatedError.message);
    process.exitCode = 1;
  } finally {
    try {
      await getPool().end();
    } catch (_error) {
      // Ignore pool shutdown errors in setup scripts.
    }
  }
}

run();
