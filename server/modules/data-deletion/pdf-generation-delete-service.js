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
const { resolveLegacyPdfStorageRoot } = require("../storage-paths");

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

async function collectPdfAuditRowsByMetadataValues(queryFn, values = []) {
  const uniqueValues = createUniqueValueList(values);

  if (!uniqueValues.length) {
    return [];
  }

  const rows = await queryFn(
    `
      SELECT
        id,
        action,
        entity_type AS entityType,
        entity_id AS entityId,
        metadata_json AS metadataJson
      FROM pdf_audit_logs
      WHERE ${uniqueValues.map(() => "metadata_json LIKE ?").join(" OR ")}
    `,
    uniqueValues.map((value) => `%${value}%`),
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

function getAuditMetadataScope(metadata = {}) {
  return {
    archiveIds: normalizeMetadataList(metadata.archiveId, metadata.archiveIds),
    batchIds: normalizeMetadataList(metadata.batchId, metadata.batchIds),
    generationIds: normalizeMetadataList(
      metadata.generationId,
      metadata.generationIds,
      metadata.rerunSourceGenerationId,
      metadata.rerunSourceGenerationIds,
      metadata.sourceGenerationId,
      metadata.sourceGenerationIds,
    ),
    schoolIds: normalizeMetadataList(metadata.schoolId, metadata.schoolIds),
  };
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

function selectPdfMetadataAuditData({
  filters = {},
  metadataAuditRows = [],
  schoolId = "",
  selection,
  skippedAuditIds = [],
  skippedEntityIds = [],
} = {}) {
  const isFiltered = hasDataDeletionFilters(filters);
  const selectedArchiveIdSet = new Set(selection.archiveIds);
  const selectedAuditIdSet = new Set(skippedAuditIds);
  const selectedBatchIdSet = new Set(selection.batchIds);
  const selectedEntityIdSet = new Set(skippedEntityIds);
  const selectedGenerationIdSet = new Set(selection.generationIds);
  const selectedRows = [];

  (Array.isArray(metadataAuditRows) ? metadataAuditRows : []).forEach((row) => {
    const rowId = String(row.id || "").trim();
    const entityId = String(row.entityId || "").trim();

    if (!rowId || selectedAuditIdSet.has(rowId) || selectedEntityIdSet.has(entityId)) {
      return;
    }

    const metadata = parseJsonColumn(row.metadataJson, {});
    const {
      archiveIds,
      batchIds,
      generationIds,
      schoolIds,
    } = getAuditMetadataScope(metadata);
    const matchesSchoolScope = !isFiltered && schoolIds.includes(schoolId);
    const matchesSelectedGeneration = generationIds.some((generationId) => selectedGenerationIdSet.has(generationId));
    const matchesSelectedBatch = batchIds.some((batchId) => selectedBatchIdSet.has(batchId));
    const matchesSelectedArchive = archiveIds.some((archiveId) => selectedArchiveIdSet.has(archiveId));

    if (matchesSchoolScope || matchesSelectedGeneration || matchesSelectedBatch || matchesSelectedArchive) {
      selectedRows.push(row);
    }
  });

  return {
    auditIds: createUniqueValueList(selectedRows.map((row) => row.id)),
    rows: selectedRows,
  };
}

function resolveMergedPdfFilePath(pathModule, rootDir, mergedId = "") {
  const normalizedMergedId = String(mergedId || "").trim();

  if (!normalizedMergedId || !normalizedMergedId.startsWith("pdf-merged-")) {
    return "";
  }

  return pathModule.join(resolveLegacyPdfStorageRoot(pathModule, rootDir), "merged", `${normalizedMergedId}.pdf`);
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
  const filePathsByEntityId = new Map();

  rowsByEntityId.forEach((rows, entityId) => {
    let hasScopedMetadata = false;
    let matchesScopedMetadata = false;

    rows.forEach((row) => {
      const metadata = parseJsonColumn(row.metadataJson, {});
      const metadataFilePath = String(metadata.mergedFilePath || metadata.filePath || "").trim();
      const { generationIds, schoolIds } = getMergedAuditMetadataScope(metadata);

      if (metadataFilePath && !filePathsByEntityId.has(entityId)) {
        filePathsByEntityId.set(entityId, metadataFilePath);
      }

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
      filePathsByEntityId.get(entityId) || resolveMergedPdfFilePath(pathModule, rootDir, entityId),
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
    const metadataAuditRows = await collectPdfAuditRowsByMetadataValues(queryFn, [
      schoolId,
      ...selection.generationIds,
      ...selection.batchIds,
      ...selection.archiveIds,
    ]);
    const metadataAuditSelection = selectPdfMetadataAuditData({
      filters,
      metadataAuditRows,
      schoolId,
      selection,
      skippedAuditIds: mergedAuditSelection.auditIds,
      skippedEntityIds: selection.auditEntityIds,
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
      pdfAuditLogs: pdfAuditLogs + mergedAuditSelection.rows.length + metadataAuditSelection.rows.length,
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
    const metadataAuditRows = await collectPdfAuditRowsByMetadataValues(transactionQuery, [
      schoolId,
      ...selection.generationIds,
      ...selection.batchIds,
      ...selection.archiveIds,
    ]);
    const metadataAuditSelection = selectPdfMetadataAuditData({
      filters,
      metadataAuditRows,
      schoolId,
      selection,
      skippedAuditIds: mergedAuditSelection.auditIds,
      skippedEntityIds: selection.auditEntityIds,
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

    if (metadataAuditSelection.auditIds.length) {
      deletedAuditLogs += metadataAuditSelection.rows.length;
      await deleteRowsByIds(transactionQuery, "DELETE FROM pdf_audit_logs WHERE id IN", metadataAuditSelection.auditIds);
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
