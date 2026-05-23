const { ensureDatabaseExists } = require("../db");

async function bootstrapApp(appContext) {
  try {
    await ensureDatabaseExists();
    await appContext.services.schemaBootstrapService.ensureSchema();
    await appContext.services.pdfGenerationService.startPdfGenerationQueue();
  } catch (error) {
    const translatedError = appContext.translateDatabaseError(error);
    console.error(`[bootstrap] ${translatedError.message}`);
  }
}

module.exports = {
  bootstrapApp,
};
