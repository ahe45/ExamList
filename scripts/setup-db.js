const { ensureDatabaseExists, getPool } = require("../db");
const { createAppContext } = require("../server/create-app-context");

async function ensureInitialSuperAdminAccount(appContext) {
  const accountList = await appContext.services.authService.listAccounts();

  if (accountList.total > 0) {
    console.log("Admin account setup skipped. Existing accounts were found.");
    return;
  }

  await appContext.services.authService.createAccount({
    password: "1234",
    role: "super_admin",
    userId: "admin",
    userName: "Admin",
  });

  console.log("Initial super administrator account is ready: admin / 1234");
}

async function run() {
  await ensureDatabaseExists();
  const appContext = createAppContext();

  try {
    await appContext.services.schemaBootstrapService.ensureSchema();
    await ensureInitialSuperAdminAccount(appContext);
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
