const { mapWithConcurrency } = require("../../lib/concurrency");
const { createRequestSnapshotStore } = require("./request-snapshot-store");
const { normalizeGenerationListFilter, normalizeGenerationRequestFilters, parseJsonColumn } = require("./filters");
const { mapBatchRow, mapGenerationDetailRow, mapGenerationRow } = require("./mappers");
const { summarizePdfGenerationBatchStatus } = require("./batch-status");

const generationResultScopeCandidateColumns = Object.freeze({
  admission: "admission",
  building: "building",
  endTime: "end_time",
  examDate: "exam_date",
  group: "group_name",
  major: "major",
  period: "period",
  room: "room",
  series: "series",
  time: "time",
  track: "track",
  unit: "unit",
});
const generationFilterCandidateColumns = Object.freeze({
  ...generationResultScopeCandidateColumns,
  admissionCode: "admission_code",
  buildingCode: "building_code",
  date: "exam_date",
  groupName: "group_name",
  majorCode: "major_code",
  periodCode: "period_code",
  roomCode: "room_code",
  seriesCode: "series_code",
  unitCode: "unit_code",
});

function hasResultScopeSnapshot(requestSnapshot) {
  return Object.keys(normalizeGenerationRequestFilters(requestSnapshot?.resultScope)).length > 0;
}

function buildCandidateResultScopeSelectList() {
  return Object.entries(generationResultScopeCandidateColumns)
    .map(([key, columnName]) => {
      return `COUNT(DISTINCT NULLIF(${columnName}, '')) AS ${key}Distinct, MIN(NULLIF(${columnName}, '')) AS ${key}Value`;
    })
    .join(",\n          ");
}

function buildCandidateScopeWhereClause(row = {}, filters = {}) {
  const conditions = [];
  const params = {};
  const schoolId = String(row.schoolId || filters.schoolId || "").trim();

  if (schoolId) {
    conditions.push("school_id = :schoolId");
    params.schoolId = schoolId;
  }

  Object.entries(filters).forEach(([key, value]) => {
    const normalizedKey = String(key || "").trim();
    const columnName = generationFilterCandidateColumns[normalizedKey];
    const normalizedValue = String(value || "").trim();

    if (!columnName || !normalizedValue || normalizedKey === "schoolId") {
      return;
    }

    const paramName = `scopeFilter${Object.keys(params).length}`;

    conditions.push(`${columnName} = :${paramName}`);
    params[paramName] = normalizedValue;
  });

  return {
    params,
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

function buildResultScopeFromCandidateAggregate(row = {}) {
  return Object.fromEntries(
    Object.keys(generationResultScopeCandidateColumns).flatMap((key) => {
      const distinctCount = Number(row[`${key}Distinct`]) || 0;
      const value = String(row[`${key}Value`] || "").trim();

      return distinctCount === 1 && value ? [[key, value]] : [];
    }),
  );
}

function createPdfGenerationReadActions({
  createHttpError,
  getBatchGenerationRows,
  getBatchRow,
  query,
}) {
  async function inferMissingResultScope(row = {}, scopeCache = new Map()) {
    const requestSnapshot = parseJsonColumn(row.requestJson, null);

    if (
      !requestSnapshot ||
      typeof requestSnapshot !== "object" ||
      Array.isArray(requestSnapshot) ||
      hasResultScopeSnapshot(requestSnapshot) ||
      !(Number(row.candidateCount) > 0)
    ) {
      return row;
    }

    const filters = normalizeGenerationRequestFilters(requestSnapshot.filters);
    const { params, whereClause } = buildCandidateScopeWhereClause(row, filters);
    const cacheKey = JSON.stringify({ schoolId: row.schoolId, filters: Object.fromEntries(Object.entries(filters).sort()) });
    if (!scopeCache.has(cacheKey)) scopeCache.set(cacheKey, query(
      `
        SELECT
          ${buildCandidateResultScopeSelectList()}
        FROM candidate_records
        ${whereClause}
      `,
      params,
    ).then(rows => buildResultScopeFromCandidateAggregate(rows[0] || {})));
    const resultScope = await scopeCache.get(cacheKey);

    if (!Object.keys(resultScope).length) {
      return row;
    }

    return {
      ...row,
      requestJson: JSON.stringify({
        ...requestSnapshot,
        resultScope,
      }),
    };
  }

  async function inferMissingResultScopes(rows = []) {
    const scopeCache = new Map();
    return mapWithConcurrency(rows, 3, row => inferMissingResultScope(row, scopeCache));
  }

  async function listPdfGenerations(rawFilter = {}) {
    const filter = normalizeGenerationListFilter(rawFilter);
    const conditions = [];
    const params = {
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit,
    };

    if (filter.keyword) {
      conditions.push("(template_name LIKE :keyword OR file_name LIKE :keyword OR target_name LIKE :keyword)");
      params.keyword = `%${filter.keyword}%`;
    }

    if (filter.status) {
      conditions.push("status = :status");
      params.status = filter.status;
    } else {
      conditions.push("status = :status");
      params.status = "completed";
    }

    if (filter.generationUnit) {
      conditions.push("generation_unit = :generationUnit");
      params.generationUnit = filter.generationUnit;
    }

    if (filter.templateId) {
      conditions.push("template_id = :templateId");
      params.templateId = filter.templateId;
    }

    if (filter.schoolId) {
      conditions.push("school_id = :schoolId");
      params.schoolId = filter.schoolId;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRows = await query(
      `
        SELECT COUNT(*) AS total
        FROM pdf_generation_histories
        ${whereClause}
      `,
      params,
    );
    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          batch_id AS batchId,
          template_id AS templateId,
          template_name AS templateName,
          file_name AS fileName,
          generation_unit AS generationUnit,
          target_name AS targetName,
          candidate_count AS candidateCount,
          page_count AS pageCount,
          file_size_bytes AS fileSizeBytes,
          status,
          progress_percent AS progressPercent,
          job_id AS jobId,
          attempt_count AS attemptCount,
          max_attempts AS maxAttempts,
          warning_json AS warningJson,
          error_message AS errorMessage,
          CASE WHEN JSON_VALID(request_json) THEN JSON_OBJECT(
            'filters', JSON_EXTRACT(request_json, '$.filters'),
            'resultScope', JSON_EXTRACT(request_json, '$.resultScope'),
            'generationUnit', JSON_EXTRACT(request_json, '$.generationUnit'),
            'targetName', JSON_EXTRACT(request_json, '$.targetName')
          ) ELSE NULL END AS requestJson,
          expires_at AS expiresAt,
          purged_at AS purgedAt,
          started_at AS startedAt,
          completed_at AS completedAt,
          updated_at AS updatedAt,
          created_at AS createdAt
        FROM pdf_generation_histories
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
      `,
      params,
    );

    const inferredRows = await inferMissingResultScopes(rows);

    return {
      filters: filter,
      items: inferredRows.map(mapGenerationRow),
      limit: filter.limit,
      page: filter.page,
      total: Number(countRows[0]?.total) || 0,
    };
  }

  async function getPdfGenerationBatch(batchId, { includeItems = true } = {}) {
    const normalizedBatchId = String(batchId || "").trim();
    const batchRow = await getBatchRow(normalizedBatchId);

    if (!batchRow) {
      throw createHttpError(404, "PDF 배치 생성 작업을 찾을 수 없습니다.", "PDF_GENERATION_BATCH_NOT_FOUND");
    }

    if (!includeItems) {
      const rows = await getBatchGenerationRows(normalizedBatchId, { statusOnly: true });
      return { ...mapBatchRow(batchRow), ...summarizePdfGenerationBatchStatus(batchRow, rows) };
    }
    const generationRows = await getBatchGenerationRows(normalizedBatchId);

    const inferredGenerationRows = await inferMissingResultScopes(generationRows);

    return {
      ...mapBatchRow(batchRow),
      ...summarizePdfGenerationBatchStatus(batchRow, generationRows),
      items: inferredGenerationRows.map(mapGenerationRow),
    };
  }

  async function getPdfGenerationDetail(generationId) {
    const rows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          template_id AS templateId,
          template_name AS templateName,
          file_name AS fileName,
          generation_unit AS generationUnit,
          target_name AS targetName,
          candidate_count AS candidateCount,
          page_count AS pageCount,
          file_size_bytes AS fileSizeBytes,
          status,
          progress_percent AS progressPercent,
          job_id AS jobId,
          attempt_count AS attemptCount,
          max_attempts AS maxAttempts,
          warning_json AS warningJson,
          error_message AS errorMessage,
          request_json AS requestJson,
          expires_at AS expiresAt,
          purged_at AS purgedAt,
          started_at AS startedAt,
          completed_at AS completedAt,
          updated_at AS updatedAt,
          created_at AS createdAt
        FROM pdf_generation_histories
        WHERE id = ?
        LIMIT 1
      `,
      [generationId],
    );
    const [generationRow] = await createRequestSnapshotStore(query).hydrateRows(rows);

    if (!generationRow) {
      throw createHttpError(404, "PDF 생성 이력을 찾을 수 없습니다.", "PDF_GENERATION_DETAIL_NOT_FOUND");
    }

    return mapGenerationDetailRow(await inferMissingResultScope(generationRow));
  }

  return Object.freeze({
    getPdfGenerationBatch,
    getPdfGenerationDetail,
    listPdfGenerations,
  });
}

module.exports = {
  buildResultScopeFromCandidateAggregate,
  createPdfGenerationReadActions,
};
