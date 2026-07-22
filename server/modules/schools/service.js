const { randomUUID } = require("crypto");
const nodeFs = require("fs");
const nodePath = require("path");
const { createPasswordHash, verifyPassword } = require("../auth/service");
const { resolveOrphanedCandidatePhotoFilePaths } = require("../data-deletion/candidate-photos");
const { deleteRowsByIds } = require("../data-deletion/counts");
const { deleteFiles } = require("../data-deletion/file-delete");
const { createPdfGenerationDeleteService } = require("../data-deletion/pdf-generation-delete-service");
const {
  appendValues,
  createSqlPlaceholders,
  createUniqueValueList,
} = require("../data-deletion/utils");
const {
  defaultSchoolId,
  mapSchoolRow,
  normalizeSchoolDeletionPassword,
  normalizeSchoolId,
  normalizeSchoolListFilter,
  normalizeCombinedSchoolCode,
  normalizeSchoolPayload,
} = require("./validators");

const relatedSchoolUpdatedAtExpression = `
  GREATEST(
    s.updated_at,
    COALESCE(template_stats.latestTemplateUpdatedAt, s.updated_at),
    COALESCE(candidate_stats.latestCandidateUpdatedAt, s.updated_at),
    COALESCE(generation_stats.latestGenerationUpdatedAt, s.updated_at),
    COALESCE(batch_stats.latestBatchUpdatedAt, s.updated_at),
    COALESCE(settings_stats.latestSettingsUpdatedAt, s.updated_at)
  )
`;

const relatedSchoolStatsJoins = `
  LEFT JOIN (
    SELECT
      t.school_id,
      COUNT(*) AS templateCount,
      MAX(
        GREATEST(
          t.updated_at,
          COALESCE(page_stats.latestPageUpdatedAt, t.updated_at),
          COALESCE(element_stats.latestElementUpdatedAt, t.updated_at),
          COALESCE(version_stats.latestVersionCreatedAt, t.updated_at)
        )
      ) AS latestTemplateUpdatedAt
    FROM pdf_templates t
    LEFT JOIN (
      SELECT
        template_id,
        MAX(updated_at) AS latestPageUpdatedAt
      FROM pdf_template_pages
      GROUP BY template_id
    ) page_stats
      ON page_stats.template_id = t.id
    LEFT JOIN (
      SELECT
        template_id,
        MAX(updated_at) AS latestElementUpdatedAt
      FROM pdf_template_elements
      GROUP BY template_id
    ) element_stats
      ON element_stats.template_id = t.id
    LEFT JOIN (
      SELECT
        template_id,
        MAX(created_at) AS latestVersionCreatedAt
      FROM pdf_template_versions
      GROUP BY template_id
    ) version_stats
      ON version_stats.template_id = t.id
    WHERE t.deleted_at IS NULL
    GROUP BY t.school_id
  ) template_stats
    ON template_stats.school_id = s.id
  LEFT JOIN (
    SELECT
      school_id,
      COUNT(*) AS candidateCount,
      MAX(updated_at) AS latestCandidateUpdatedAt
    FROM candidate_records
    GROUP BY school_id
  ) candidate_stats
    ON candidate_stats.school_id = s.id
  LEFT JOIN (
    SELECT
      school_id,
      MAX(updated_at) AS latestGenerationUpdatedAt
    FROM pdf_generation_histories
    GROUP BY school_id
  ) generation_stats
    ON generation_stats.school_id = s.id
  LEFT JOIN (
    SELECT
      school_id,
      MAX(updated_at) AS latestBatchUpdatedAt
    FROM pdf_generation_batches
    GROUP BY school_id
  ) batch_stats
    ON batch_stats.school_id = s.id
  LEFT JOIN (
    SELECT
      school_id,
      MAX(updated_at) AS latestSettingsUpdatedAt
    FROM school_settings
    GROUP BY school_id
  ) settings_stats
    ON settings_stats.school_id = s.id
`;

const schoolSettingsRowJoin = `
  LEFT JOIN school_settings ss
    ON ss.school_id = s.id
`;

function createSchoolService({
  createHttpError,
  fs: fileSystem = nodeFs,
  getPool = null,
  path: pathModule = nodePath,
  query,
  rootDir = process.cwd(),
}) {
  const { deletePdfGenerationData } = createPdfGenerationDeleteService({ pathModule, rootDir });

  async function runTransaction(callback) {
    if (typeof getPool !== "function") {
      return callback(query);
    }

    const connection = await getPool().getConnection();
    const transactionQuery = async (sql, params = []) => {
      const [rows] = await connection.query(sql, params);

      return rows;
    };

    try {
      await connection.beginTransaction();
      const result = await callback(transactionQuery);

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  }

  async function findRemainingCandidatePhotoReferences(transactionQuery, schoolId, candidateRows = []) {
    const examineeNos = createUniqueValueList(candidateRows.map((candidate) => candidate.examineeNo));
    const photoNames = createUniqueValueList(
      candidateRows
        .map((candidate) => pathModule.basename(String(candidate.photoName || "").trim()))
        .filter(Boolean),
    );
    const conditions = [];
    const params = [schoolId];

    if (examineeNos.length) {
      conditions.push(`examinee_no IN (${createSqlPlaceholders(examineeNos)})`);
      appendValues(params, examineeNos);
    }

    if (photoNames.length) {
      conditions.push(`photo_name IN (${createSqlPlaceholders(photoNames)})`);
      appendValues(params, photoNames);
    }

    if (!conditions.length) {
      return [];
    }

    return transactionQuery(
      `
        SELECT
          school_id AS schoolId,
          examinee_no AS examineeNo,
          photo_name AS photoName
        FROM candidate_records
        WHERE school_id <> ?
          AND (${conditions.join(" OR ")})
      `,
      params,
    );
  }

  async function getDefaultSchoolId() {
    return defaultSchoolId;
  }

  async function getSchoolById(schoolId) {
    const normalizedSchoolIdentifier = normalizeSchoolId(schoolId);
    const rows = await query(
      `
        SELECT
          s.id,
          s.code,
          s.name,
          COALESCE(ss.campus_name, '') AS campusName,
          COALESCE(ss.campus_code, '') AS campusCode,
          s.created_account AS createdAccount,
          ${relatedSchoolUpdatedAtExpression} AS updatedAt,
          COALESCE(template_stats.templateCount, 0) AS templateCount,
          COALESCE(candidate_stats.candidateCount, 0) AS candidateCount
        FROM schools s
        ${schoolSettingsRowJoin}
        ${relatedSchoolStatsJoins}
        WHERE (s.id = ? OR s.code = ?)
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [normalizedSchoolIdentifier, normalizedSchoolIdentifier],
    );

    if (!rows[0]) {
      throw createHttpError(404, "학교를 찾을 수 없습니다.", "SCHOOL_NOT_FOUND");
    }

    return mapSchoolRow(rows[0]);
  }

  async function getSchoolDeletionPasswordHash(schoolId) {
    const rows = await query(
      `
        SELECT deletion_password_hash AS deletionPasswordHash
        FROM schools
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [schoolId],
    );

    return String(rows[0]?.deletionPasswordHash || "").trim();
  }

  async function listSchools(rawFilter = {}) {
    const filter = normalizeSchoolListFilter(rawFilter);
    const conditions = ["s.deleted_at IS NULL"];
    const params = {
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit,
    };

    if (filter.keyword) {
      conditions.push("(s.name LIKE :keyword OR s.code LIKE :keyword OR ss.campus_name LIKE :keyword OR ss.campus_code LIKE :keyword)");
      params.keyword = `%${filter.keyword}%`;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countRows = await query(`SELECT COUNT(*) AS total FROM schools s ${schoolSettingsRowJoin} ${whereClause}`, params);
    const rows = await query(
      `
        SELECT
          s.id,
          s.code,
          s.name,
          COALESCE(ss.campus_name, '') AS campusName,
          COALESCE(ss.campus_code, '') AS campusCode,
          s.created_account AS createdAccount,
          ${relatedSchoolUpdatedAtExpression} AS updatedAt,
          COALESCE(template_stats.templateCount, 0) AS templateCount,
          COALESCE(candidate_stats.candidateCount, 0) AS candidateCount
        FROM schools s
        ${schoolSettingsRowJoin}
        ${relatedSchoolStatsJoins}
        ${whereClause}
        ORDER BY s.name ASC, s.code ASC
        LIMIT :limit OFFSET :offset
      `,
      params,
    );

    return {
      items: rows.map(mapSchoolRow),
      limit: filter.limit,
      page: filter.page,
      total: Number(countRows[0]?.total) || 0,
    };
  }

  async function createSchool(payload = {}, options = {}) {
    const school = normalizeSchoolPayload(payload, createHttpError);
    const schoolId = `school-${randomUUID()}`;
    const code = school.code || normalizeCombinedSchoolCode(
      `SCHOOL-${randomUUID().slice(0, 8).toUpperCase()}`,
      school.campusCode,
      createHttpError,
    );
    const createdAccount = String(options.createdAccount || "system").trim() || "system";
    const deletionPassword = normalizeSchoolDeletionPassword(payload.deletionPassword);
    const deletionPasswordConfirm = normalizeSchoolDeletionPassword(payload.deletionPasswordConfirm);
    const deletionPasswordHash = deletionPassword ? createPasswordHash(deletionPassword) : "";

    if (options.requireDeletionPassword && !deletionPassword) {
      throw createHttpError(400, "학교 삭제 비밀번호를 입력하세요.", "SCHOOL_DELETION_PASSWORD_REQUIRED");
    }

    if ((deletionPassword || deletionPasswordConfirm) && deletionPassword !== deletionPasswordConfirm) {
      throw createHttpError(400, "학교 삭제 비밀번호가 일치하지 않습니다.", "SCHOOL_DELETION_PASSWORD_MISMATCH");
    }

    await query(
      `
        INSERT INTO schools (
          id,
          code,
          name,
          deletion_password_hash,
          created_account
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [schoolId, code, school.name, deletionPasswordHash, createdAccount],
    );

    await query(
      `
        INSERT INTO school_settings (
          id,
          school_id,
          school_name
        ) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          school_name = VALUES(school_name),
          updated_at = CURRENT_TIMESTAMP
      `,
      [`school-settings-${randomUUID()}`, schoolId, school.name],
    );

    return getSchoolById(schoolId);
  }

  async function updateSchool(schoolId, payload = {}) {
    const normalizedSchoolIdentifier = normalizeSchoolId(schoolId, "");

    if (!normalizedSchoolIdentifier) {
      throw createHttpError(400, "학교 식별자가 필요합니다.", "SCHOOL_ID_REQUIRED");
    }

    const existingSchool = await getSchoolById(normalizedSchoolIdentifier);
    const normalizedSchoolId = existingSchool.id;

    const school = normalizeSchoolPayload(payload, createHttpError);
    const code = school.code || normalizeCombinedSchoolCode(
      `SCHOOL-${normalizedSchoolId.slice(-8).toUpperCase()}`,
      school.campusCode,
      createHttpError,
    );

    await query(
      `
        UPDATE schools
        SET
          code = ?,
          name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `,
      [code, school.name, normalizedSchoolId],
    );

    await query(
      `
        INSERT INTO school_settings (
          id,
          school_id,
          school_name
        ) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          school_name = VALUES(school_name),
          updated_at = CURRENT_TIMESTAMP
      `,
      [`school-settings-${randomUUID()}`, normalizedSchoolId, school.name],
    );

    return getSchoolById(normalizedSchoolId);
  }

  async function deleteSchool(schoolId, options = {}) {
    const normalizedSchoolIdentifier = normalizeSchoolId(schoolId, "");

    if (!normalizedSchoolIdentifier) {
      throw createHttpError(400, "학교 식별자가 필요합니다.", "SCHOOL_ID_REQUIRED");
    }

    const existingSchool = await getSchoolById(normalizedSchoolIdentifier);

    if (!options.canBypassDeletionPassword) {
      const deletionPasswordHash = await getSchoolDeletionPasswordHash(existingSchool.id);
      const deletionPassword = normalizeSchoolDeletionPassword(options.deletionPassword);

      if (!deletionPasswordHash) {
        throw createHttpError(
          403,
          "학교 삭제 비밀번호가 설정되지 않아 관리자 권한으로 삭제할 수 없습니다.",
          "SCHOOL_DELETION_PASSWORD_NOT_SET",
        );
      }

      if (!deletionPassword || !verifyPassword(deletionPassword, deletionPasswordHash)) {
        throw createHttpError(403, "학교 삭제 비밀번호가 올바르지 않습니다.", "INVALID_SCHOOL_DELETION_PASSWORD");
      }
    }

    const deletion = await runTransaction(async (transactionQuery) => {
      const templateRows = await transactionQuery(
        "SELECT id FROM pdf_templates WHERE school_id = ?",
        [existingSchool.id],
      );
      const candidateRows = await transactionQuery(
        `
          SELECT
            id,
            school_id AS schoolId,
            examinee_no AS examineeNo,
            photo_name AS photoName
          FROM candidate_records
          WHERE school_id = ?
        `,
        [existingSchool.id],
      );
      const settingRows = await transactionQuery(
        "SELECT id FROM school_settings WHERE school_id = ?",
        [existingSchool.id],
      );
      const pdfDeletion = await deletePdfGenerationData(transactionQuery, existingSchool.id);
      const remainingPhotoReferenceRows = await findRemainingCandidatePhotoReferences(
        transactionQuery,
        existingSchool.id,
        candidateRows,
      );
      const templateIds = templateRows.map((row) => row.id);

      await transactionQuery("DELETE FROM candidate_records WHERE school_id = ?", [existingSchool.id]);

      if (templateIds.length) {
        await deleteRowsByIds(
          transactionQuery,
          "DELETE FROM pdf_template_elements WHERE template_id IN",
          templateIds,
        );
        await deleteRowsByIds(
          transactionQuery,
          "DELETE FROM pdf_template_pages WHERE template_id IN",
          templateIds,
        );
        await deleteRowsByIds(
          transactionQuery,
          "DELETE FROM pdf_template_versions WHERE template_id IN",
          templateIds,
        );
      }

      await transactionQuery("DELETE FROM pdf_templates WHERE school_id = ?", [existingSchool.id]);
      await transactionQuery("DELETE FROM school_settings WHERE school_id = ?", [existingSchool.id]);
      await transactionQuery("DELETE FROM schools WHERE id = ? AND deleted_at IS NULL", [existingSchool.id]);

      return {
        candidatePhotoFilePaths: resolveOrphanedCandidatePhotoFilePaths({
          candidateRows,
          pathModule,
          remainingPhotoReferenceRows,
          rootDir,
          schoolId: existingSchool.id,
          schoolStorageCode: existingSchool.code,
        }),
        counts: {
          auditLogs: pdfDeletion.deletedPdfAuditLogs,
          candidateRecords: candidateRows.length,
          pdfGenerationBatches: pdfDeletion.deletedPdfGenerationBatches,
          pdfGenerationHistories: pdfDeletion.deletedPdfGenerationHistories,
          pdfTemplates: templateRows.length,
          schoolSettings: settingRows.length,
        },
        pdfFilePaths: pdfDeletion.pdfFilePaths,
      };
    });
    const pdfFileDeleteResult = await deleteFiles(fileSystem, deletion.pdfFilePaths);
    const candidatePhotoDeleteResult = await deleteFiles(fileSystem, deletion.candidatePhotoFilePaths);

    return {
      deleted: true,
      id: existingSchool.id,
      name: existingSchool.name,
      relatedDeleted: {
        ...deletion.counts,
        candidatePhotoFiles: candidatePhotoDeleteResult.deletedCount,
        candidatePhotoFilesMissing: candidatePhotoDeleteResult.missingCount,
        pdfFiles: pdfFileDeleteResult.deletedCount,
        pdfFilesMissing: pdfFileDeleteResult.missingCount,
      },
    };
  }

  return Object.freeze({
    createSchool,
    deleteSchool,
    getDefaultSchoolId,
    getSchoolById,
    listSchools,
    normalizeSchoolId,
    updateSchool,
  });
}

module.exports = {
  createSchoolService,
  defaultSchoolId,
  normalizeSchoolId,
  normalizeSchoolPayload,
};
