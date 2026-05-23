const { ensureDatabaseExists, getPool } = require("../db");
const { createAppContext } = require("../server/create-app-context");

async function startPdfWorker() {
  process.env.PDF_QUEUE_PROCESS_IN_WEB = "true";

  const appContext = createAppContext();

  await ensureDatabaseExists();
  await appContext.services.schemaBootstrapService.ensureSchema();
  const recoveryPayload = await appContext.services.pdfGenerationService.startPdfGenerationQueue();

  console.log(
    `ExamList PDF worker started. queue=${recoveryPayload.queueDriver} recovered=${recoveryPayload.queuedCount}`,
  );

  const keepAlive = setInterval(() => {}, 60 * 60 * 1000);

  async function shutdown() {
    clearInterval(keepAlive);
    await getPool().end().catch(() => {});
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startPdfWorker().catch((error) => {
  console.error(`[pdf-worker] ${error.message}`);
  process.exit(1);
});
