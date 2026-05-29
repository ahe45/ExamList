const nodePath = require("path");

const { resolveOrphanedCandidatePhotoFilePaths } = require("./candidate-photos");
const {
  countRows,
  deleteRowsByIds,
  getAffectedRows,
} = require("./counts");
const {
  createCandidateFilterWhereClause,
  hasDataDeletionFilters,
} = require("./filters");
const {
  createSqlPlaceholders,
  createUniqueValueList,
} = require("./utils");

function createCandidateDeletionService({
  pathModule = nodePath,
  rootDir = process.cwd(),
} = {}) {
  async function findRemainingCandidatePhotoReferences(transactionQuery, schoolId, candidateRows = [], options = {}) {
    const examineeNos = createUniqueValueList(candidateRows.map((candidate) => candidate.examineeNo));
    const photoNames = createUniqueValueList(
      candidateRows
        .map((candidate) => pathModule.basename(String(candidate.photoName || "").trim()))
        .filter(Boolean),
    );
    const excludedCandidateIds = createUniqueValueList(options.excludedCandidateIds || []);
    const conditions = [];
    const params = [];

    if (examineeNos.length) {
      conditions.push(`examinee_no IN (${createSqlPlaceholders(examineeNos)})`);
      params.push(...examineeNos);
    }

    if (photoNames.length) {
      conditions.push(`photo_name IN (${createSqlPlaceholders(photoNames)})`);
      params.push(...photoNames);
    }

    if (!conditions.length) {
      return [];
    }

    const ownershipCondition = excludedCandidateIds.length
      ? `(school_id <> ? OR (school_id = ? AND id NOT IN (${createSqlPlaceholders(excludedCandidateIds)})))`
      : "school_id <> ?";
    const ownershipParams = excludedCandidateIds.length
      ? [schoolId, schoolId, ...excludedCandidateIds]
      : [schoolId];

    return transactionQuery(
      `
        SELECT
          school_id AS schoolId,
          examinee_no AS examineeNo,
          photo_name AS photoName
        FROM candidate_records
        WHERE ${ownershipCondition}
          AND (${conditions.join(" OR ")})
      `,
      [...ownershipParams, ...params],
    );
  }

  async function collectCandidateRows(transactionQuery, schoolId, photosOnly = false, filters = {}) {
    const { params, whereClause } = createCandidateFilterWhereClause(schoolId, filters);

    return transactionQuery(
      `
        SELECT
          id,
          school_id AS schoolId,
          examinee_no AS examineeNo,
          photo_name AS photoName
        FROM candidate_records
        ${whereClause}
          ${photosOnly ? "AND photo_name <> ''" : ""}
      `,
      params,
    );
  }

  async function getCandidateDataCounts(queryFn, schoolId, filters = {}) {
    const { params, whereClause } = createCandidateFilterWhereClause(schoolId, filters);
    const [candidateRecords, candidatePhotos] = await Promise.all([
      countRows(queryFn, `SELECT COUNT(*) AS total FROM candidate_records ${whereClause}`, params),
      countRows(
        queryFn,
        `SELECT COUNT(*) AS total FROM candidate_records ${whereClause} AND photo_name <> ''`,
        params,
      ),
    ]);

    return {
      candidatePhotos,
      candidateRecords,
    };
  }

  async function deleteCandidateRecords(transactionQuery, schoolId, filters = {}, options = {}) {
    const candidateRows = await collectCandidateRows(transactionQuery, schoolId, false, filters);
    const candidateIds = createUniqueValueList(candidateRows.map((candidate) => candidate.id));
    const remainingPhotoReferenceRows = await findRemainingCandidatePhotoReferences(
      transactionQuery,
      schoolId,
      candidateRows,
      { excludedCandidateIds: candidateIds },
    );
    const deleteResult = hasDataDeletionFilters(filters)
      ? await deleteRowsByIds(transactionQuery, "DELETE FROM candidate_records WHERE id IN", candidateIds)
      : await transactionQuery("DELETE FROM candidate_records WHERE school_id = ?", [schoolId]);

    return {
      candidatePhotoFilePaths: resolveOrphanedCandidatePhotoFilePaths({
        candidateRows,
        pathModule,
        remainingPhotoReferenceRows,
        rootDir,
        schoolId,
        schoolStorageCode: options.schoolStorageCode,
      }),
      deletedCandidatePhotos: candidateRows.filter((candidate) => String(candidate.photoName || "").trim()).length,
      deletedCandidateRecords: getAffectedRows(deleteResult, candidateRows.length),
    };
  }

  async function deleteCandidatePhotos(transactionQuery, schoolId, filters = {}, options = {}) {
    const candidateRows = await collectCandidateRows(transactionQuery, schoolId, true, filters);
    const candidateIds = createUniqueValueList(candidateRows.map((candidate) => candidate.id));
    const remainingPhotoReferenceRows = await findRemainingCandidatePhotoReferences(
      transactionQuery,
      schoolId,
      candidateRows,
      { excludedCandidateIds: candidateIds },
    );
    const updateResult = hasDataDeletionFilters(filters)
      ? await deleteRowsByIds(
        transactionQuery,
        `
          UPDATE candidate_records
          SET
            photo_name = '',
            photo_mime = '',
            updated_at = CURRENT_TIMESTAMP
          WHERE id IN
        `,
        candidateIds,
      )
      : await transactionQuery(
        `
          UPDATE candidate_records
          SET
            photo_name = '',
            photo_mime = '',
            updated_at = CURRENT_TIMESTAMP
          WHERE school_id = ?
            AND photo_name <> ''
        `,
        [schoolId],
      );

    return {
      candidatePhotoFilePaths: resolveOrphanedCandidatePhotoFilePaths({
        candidateRows,
        pathModule,
        remainingPhotoReferenceRows,
        rootDir,
        schoolId,
        schoolStorageCode: options.schoolStorageCode,
      }),
      deletedCandidatePhotos: getAffectedRows(updateResult, candidateRows.length),
    };
  }

  return Object.freeze({
    deleteCandidatePhotos,
    deleteCandidateRecords,
    getCandidateDataCounts,
  });
}

module.exports = {
  createCandidateDeletionService,
};
