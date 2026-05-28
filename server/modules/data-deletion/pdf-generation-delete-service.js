const {
  countRows,
  deleteRowsByIds,
  getAffectedRows,
} = require("./counts");
const { hasDataDeletionFilters } = require("./filters");
const { createPdfGenerationSelection } = require("./pdf-generation-deletion");
const {
  createSqlPlaceholders,
  createUniqueValueList,
  parseJsonColumn,
} = require("./utils");

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

async function collectPdfMergedAuditRows(queryFn) {
  const rows = await queryFn(
    `
      SELECT
        id,
        action,
        entity_id AS entityId,
        metadata_json AS metadataJson
      FROM pdf_audit_logs
      WHERE entity_type = 'pdf_generation_merged'
    `,
  );

  return Array.isArray(rows) ? rows : [];
}

function normalizeMetadataList(...values) {
  return createUniqueValueList(values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    return value ? [value] : [];
  }));
}

function getMergedAuditMetadataScope(metadata = {}) {
  return {
    generationIds: normalizeMetadataList(
      metadata.generationId,
      metadata.generationIds,
      metadata.sourceGenerationId,
      metadata.sourceGenerationIds,
    ),
    schoolIds: normalizeMetadataList(metadata.schoolId, metadata.schoolIds),
  };
}

function resolveMergedPdfFilePath(pathModule, rootDir, mergedId = "") {
  const normalizedMergedId = String(mergedId || "").trim();

  if (!normalizedMergedId || !normalizedMergedId.startsWith("pdf-merged-")) {
    return "";
  }

  return pathModule.join(rootDir, "storage", "pdf-generations", "merged", `${normalizedMergedId}.pdf`);
}

function selectPdfMergedAuditData({
  filters = {},
  mergedAuditRows = [],
  pathModule,
  rootDir,
  schoolId = "",
  selection,
} = {}) {
  const isFiltered = hasDataDeletionFilters(filters);
  const selectedGenerationIdSet = new Set(selection.generationIds);
  const hasSelectedPdfRows = selection.selectedGenerationRows.length > 0 || selection.selectedBatchRows.length > 0;
  const rowsByEntityId = new Map();

  (Array.isArray(mergedAuditRows) ? mergedAuditRows : []).forEach((row) => {
    const entityId = String(row.entityId || "").trim();

    if (!entityId) {
      return;
    }

    rowsByEntityId.set(entityId, [...(rowsByEntityId.get(entityId) || []), row]);
  });

  const selectedEntityIds = [];

  rowsByEntityId.forEach((rows, entityId) => {
    let hasScopedMetadata = false;
    let matchesScopedMetadata = false;

    rows.forEach((row) => {
      const metadata = parseJsonColumn(row.metadataJson, {});
      const { generationIds, schoolIds } = getMergedAuditMetadataScope(metadata);

      if (generationIds.length || schoolIds.length) {
        hasScopedMetadata = true;
      }

      if (generationIds.length && generationIds.every((generationId) => selectedGenerationIdSet.has(generationId))) {
        matchesScopedMetadata = true;
      }

      if (!isFiltered && schoolIds.includes(schoolId)) {
        matchesScopedMetadata = true;
      }
    });

    if (matchesScopedMetadata || (!hasScopedMetadata && !isFiltered && hasSelectedPdfRows)) {
      selectedEntityIds.push(entityId);
    }
  });

  const selectedEntityIdSet = new Set(createUniqueValueList(selectedEntityIds));
  const selectedAuditRows = mergedAuditRows.filter((row) => selectedEntityIdSet.has(String(row.entityId || "").trim()));

  return {
    auditIds: createUniqueValueList(selectedAuditRows.map((row) => row.id)),
    filePaths: createUniqueValueList([...selectedEntityIdSet].map((entityId) =>
      resolveMergedPdfFilePath(pathModule, rootDir, entityId),
    )),
    rows: selectedAuditRows,
  };
}

function createPdfGenerationDeleteService({ pathModule = require("path"), rootDir = process.cwd() } = {}) {
  async function getPdfGenerationDataCounts(queryFn, schoolId, filters = {}) {
    const generationRows = await collectPdfGenerationRows(queryFn, schoolId);
    const batchRows = await collectPdfGenerationBatchRows(queryFn, schoolId);
    const selection = createPdfGenerationSelection({ batchRows, filters, generationRows });
    const mergedAuditRows = await collectPdfMergedAuditRows(queryFn);
    const mergedAuditSelection = selectPdfMergedAuditData({
      filters,
      mergedAuditRows,
      pathModule,
      rootDir,
      schoolId,
      selection,
    });
    const pdfAuditLogs = selection.auditEntityIds.length
      ? await countRows(
        queryFn,
        `SELECT COUNT(*) AS total FROM pdf_audit_logs WHERE entity_id IN (${createSqlPlaceholders(selection.auditEntityIds)})`,
        selection.auditEntityIds,
      )
      : 0;
    const pdfFiles = selection.pdfFilePaths.length + mergedAuditSelection.filePaths.length;

    return {
      pdfAuditLogs: pdfAuditLogs + mergedAuditSelection.rows.length,
      pdfFiles,
      pdfGenerationBatches: selection.selectedBatchRows.length,
      pdfGenerationHistories: selection.selectedGenerationRows.length,
    };
  }

  async function deletePdfGenerationData(transactionQuery, schoolId, filters = {}) {
    const generationRows = await collectPdfGenerationRows(transactionQuery, schoolId);
    const batchRows = await collectPdfGenerationBatchRows(transactionQuery, schoolId);
    const selection = createPdfGenerationSelection({ batchRows, filters, generationRows });
    const mergedAuditRows = await collectPdfMergedAuditRows(transactionQuery);
    const mergedAuditSelection = selectPdfMergedAuditData({
      filters,
      mergedAuditRows,
      pathModule,
      rootDir,
      schoolId,
      selection,
    });
    let deletedAuditLogs = 0;

    if (selection.auditEntityIds.length) {
      const [auditCountRow] = await transactionQuery(
        `SELECT COUNT(*) AS total FROM pdf_audit_logs WHERE entity_id IN (${createSqlPlaceholders(selection.auditEntityIds)})`,
        selection.auditEntityIds,
      );

      deletedAuditLogs = Number(auditCountRow?.total) || 0;
      await deleteRowsByIds(transactionQuery, "DELETE FROM pdf_audit_logs WHERE entity_id IN", selection.auditEntityIds);
    }

    if (mergedAuditSelection.auditIds.length) {
      deletedAuditLogs += mergedAuditSelection.rows.length;
      await deleteRowsByIds(transactionQuery, "DELETE FROM pdf_audit_logs WHERE id IN", mergedAuditSelection.auditIds);
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
      pdfFilePaths: createUniqueValueList([...selection.pdfFilePaths, ...mergedAuditSelection.filePaths]),
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
