const { createPdfGenerationFileActions } = require("./history-file-service");
const { createPdfGenerationReadActions } = require("./history-read-service");
const { createPdfGenerationRerunActions } = require("./history-rerun-service");

function createPdfGenerationHistoryService({
  candidateService,
  createHttpError,
  createPdfGeneration,
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
    candidateService,
    createHttpError,
    getBatchGenerationRows,
    getBatchRow,
    query,
  });
  const rerunActions = createPdfGenerationRerunActions({
    createHttpError,
    createPdfGeneration,
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
