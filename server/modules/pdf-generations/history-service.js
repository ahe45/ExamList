const { createPdfGenerationFileActions } = require("./history-file-service");
const { createPdfGenerationReadActions } = require("./history-read-service");
const { createPdfGenerationRerunActions } = require("./history-rerun-service");

function createPdfGenerationHistoryService({
  createHttpError,
  createPdfGeneration,
  createPdfGenerationArchive,
  fs,
  getBatchGenerationRows,
  getBatchRow,
  query,
  writeAuditLog,
}) {
  const fileActions = createPdfGenerationFileActions({
    createHttpError,
    fs,
    query,
    writeAuditLog,
  });
  const readActions = createPdfGenerationReadActions({
    createHttpError,
    getBatchGenerationRows,
    getBatchRow,
    query,
  });
  const rerunActions = createPdfGenerationRerunActions({
    createHttpError,
    createPdfGeneration,
    createPdfGenerationArchive,
    query,
  });

  return Object.freeze({
    ...fileActions,
    ...readActions,
    ...rerunActions,
  });
}

module.exports = {
  createPdfGenerationHistoryService,
};
