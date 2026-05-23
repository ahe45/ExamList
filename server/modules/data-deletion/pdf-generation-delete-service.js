const {
  countRows,
  deleteRowsByIds,
  getAffectedRows,
} = require("./counts");
const { hasDataDeletionFilters } = require("./filters");
const { createPdfGenerationSelection } = require("./pdf-generation-deletion");
const { createSqlPlaceholders } = require("./utils");

async function collectPdfGenerationRows(queryFn, schoolId) {
  return queryFn(
    `
      SELECT
        id,
        batch_id AS batchId,
        generation_unit AS generationUnit,
        request_json AS requestJson,
        target_name AS targetName,
        file_path AS filePath
      FROM pdf_generation_histories
      WHERE school_id = ?
    `,
    [schoolId],
  );
}

async function collectPdfGenerationBatchRows(queryFn, schoolId) {
  return queryFn(
    `
      SELECT
        id,
        archive_id AS archiveId,
        archive_file_path AS archiveFilePath,
        request_json AS requestJson
      FROM pdf_generation_batches
      WHERE school_id = ?
    `,
    [schoolId],
  );
}

function createPdfGenerationDeleteService() {
  async function getPdfGenerationDataCounts(queryFn, schoolId, filters = {}) {
    const generationRows = await collectPdfGenerationRows(queryFn, schoolId);
    const batchRows = await collectPdfGenerationBatchRows(queryFn, schoolId);
    const selection = createPdfGenerationSelection({ batchRows, filters, generationRows });
    const pdfAuditLogs = selection.auditEntityIds.length
      ? await countRows(
        queryFn,
        `SELECT COUNT(*) AS total FROM pdf_audit_logs WHERE entity_id IN (${createSqlPlaceholders(selection.auditEntityIds)})`,
        selection.auditEntityIds,
      )
      : 0;
    const pdfFiles = selection.pdfFilePaths.length;

    return {
      pdfAuditLogs,
      pdfFiles,
      pdfGenerationBatches: selection.selectedBatchRows.length,
      pdfGenerationHistories: selection.selectedGenerationRows.length,
    };
  }

  async function deletePdfGenerationData(transactionQuery, schoolId, filters = {}) {
    const generationRows = await collectPdfGenerationRows(transactionQuery, schoolId);
    const batchRows = await collectPdfGenerationBatchRows(transactionQuery, schoolId);
    const selection = createPdfGenerationSelection({ batchRows, filters, generationRows });
    let deletedAuditLogs = 0;

    if (selection.auditEntityIds.length) {
      const [auditCountRow] = await transactionQuery(
        `SELECT COUNT(*) AS total FROM pdf_audit_logs WHERE entity_id IN (${createSqlPlaceholders(selection.auditEntityIds)})`,
        selection.auditEntityIds,
      );

      deletedAuditLogs = Number(auditCountRow?.total) || 0;
      await deleteRowsByIds(transactionQuery, "DELETE FROM pdf_audit_logs WHERE entity_id IN", selection.auditEntityIds);
    }

    const historiesResult = hasDataDeletionFilters(filters)
      ? await deleteRowsByIds(
        transactionQuery,
        "DELETE FROM pdf_generation_histories WHERE id IN",
        selection.generationIds,
      )
      : await transactionQuery("DELETE FROM pdf_generation_histories WHERE school_id = ?", [schoolId]);
    const batchesResult = hasDataDeletionFilters(filters)
      ? await deleteRowsByIds(
        transactionQuery,
        "DELETE FROM pdf_generation_batches WHERE id IN",
        selection.batchIds,
      )
      : await transactionQuery("DELETE FROM pdf_generation_batches WHERE school_id = ?", [schoolId]);

    return {
      deletedPdfAuditLogs: deletedAuditLogs,
      deletedPdfGenerationBatches: getAffectedRows(batchesResult, selection.selectedBatchRows.length),
      deletedPdfGenerationHistories: getAffectedRows(historiesResult, selection.selectedGenerationRows.length),
      pdfFilePaths: selection.pdfFilePaths,
    };
  }

  return Object.freeze({
    deletePdfGenerationData,
    getPdfGenerationDataCounts,
  });
}

module.exports = {
  createPdfGenerationDeleteService,
};
