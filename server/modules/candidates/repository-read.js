const { candidateFieldMap } = require("./field-map");
const { mapCandidateViewRow, normalizeCandidateFilter } = require("./normalization");

const candidateSortColumnMap = Object.freeze({
  admission: "admission",
  admissionCode: "admission_code",
  birth: "birth_date",
  birthDate: "birth_date",
  building: "building",
  buildingCode: "building_code",
  date: "exam_date",
  designatedSort: "designated_sort",
  examDate: "exam_date",
  examNo: "examinee_no",
  examineeNo: "examinee_no",
  group: "group_name",
  major: "major",
  majorCode: "major_code",
  name: "name",
  opt1: "opt1",
  opt2: "opt2",
  opt3: "opt3",
  opt4: "opt4",
  opt5: "opt5",
  opt6: "opt6",
  opt7: "opt7",
  opt8: "opt8",
  opt9: "opt9",
  opt10: "opt10",
  period: "period",
  periodCode: "period_code",
  room: "room",
  roomCode: "room_code",
  series: "series",
  seriesCode: "series_code",
  temporaryNo: "temporary_no",
  time: "time",
  endTime: "end_time",
  track: "track",
  unit: "unit",
  unitCode: "unit_code",
});
const numericSortColumns = new Set(["designated_sort", "examinee_no", "temporary_no"]);
const candidateGroupByColumns = Object.freeze({
  admission: "admission",
  admissionCode: "admission_code",
  building: "building",
  buildingCode: "building_code",
  date: "exam_date",
  exam: "track",
  examDate: "exam_date",
  group: "group_name",
  major: "major",
  majorCode: "major_code",
  opt1: "opt1",
  opt2: "opt2",
  opt3: "opt3",
  opt4: "opt4",
  opt5: "opt5",
  opt6: "opt6",
  opt7: "opt7",
  opt8: "opt8",
  opt9: "opt9",
  opt10: "opt10",
  period: "period",
  periodCode: "period_code",
  room: "room",
  roomCode: "room_code",
  series: "series",
  seriesCode: "series_code",
  time: "time",
  endTime: "end_time",
  track: "track",
  unit: "unit",
  unitCode: "unit_code",
});

function buildCandidateWhereClause(filter) {
  const conditions = [];
  const params = {};

  if (filter.schoolId) {
    conditions.push("school_id = :schoolId");
    params.schoolId = filter.schoolId;
  }

  if (filter.keyword) {
    conditions.push(
      "(examinee_no LIKE :keyword OR temporary_no LIKE :keyword OR name LIKE :keyword OR designated_sort LIKE :keyword OR admission_year LIKE :keyword OR admission LIKE :keyword OR admission_code LIKE :keyword OR room LIKE :keyword)",
    );
    params.keyword = `%${filter.keyword}%`;
  }

  if (filter.admission) {
    conditions.push("admission = :admission");
    params.admission = filter.admission;
  }

  if (filter.admissionCode) {
    conditions.push("admission_code = :admissionCode");
    params.admissionCode = filter.admissionCode;
  }

  if (filter.building) {
    conditions.push("building = :building");
    params.building = filter.building;
  }

  if (filter.buildingCode) {
    conditions.push("building_code = :buildingCode");
    params.buildingCode = filter.buildingCode;
  }

  if (filter.room) {
    conditions.push("room = :room");
    params.room = filter.room;
  }

  if (filter.roomCode) {
    conditions.push("room_code = :roomCode");
    params.roomCode = filter.roomCode;
  }

  if (filter.group) {
    conditions.push("group_name = :groupName");
    params.groupName = filter.group;
  }

  if (filter.track) {
    conditions.push("track = :track");
    params.track = filter.track;
  }

  if (filter.series) {
    conditions.push("series = :series");
    params.series = filter.series;
  }

  if (filter.seriesCode) {
    conditions.push("series_code = :seriesCode");
    params.seriesCode = filter.seriesCode;
  }

  if (filter.unit) {
    conditions.push("unit = :unit");
    params.unit = filter.unit;
  }

  if (filter.unitCode) {
    conditions.push("unit_code = :unitCode");
    params.unitCode = filter.unitCode;
  }

  if (filter.major) {
    conditions.push("major = :major");
    params.major = filter.major;
  }

  if (filter.majorCode) {
    conditions.push("major_code = :majorCode");
    params.majorCode = filter.majorCode;
  }

  ["opt1", "opt2", "opt3", "opt4", "opt5", "opt6", "opt7", "opt8", "opt9", "opt10"].forEach((key) => {
    if (filter[key]) {
      conditions.push(`${key} = :${key}`);
      params[key] = filter[key];
    }
  });

  if (filter.examDate) {
    conditions.push("exam_date = :examDate");
    params.examDate = filter.examDate;
  }

  if (filter.time) {
    conditions.push("time = :time");
    params.time = filter.time;
  }

  if (filter.endTime) {
    conditions.push("end_time = :endTime");
    params.endTime = filter.endTime;
  }

  if (filter.period) {
    conditions.push("period = :period");
    params.period = filter.period;
  }

  if (filter.periodCode) {
    conditions.push("period_code = :periodCode");
    params.periodCode = filter.periodCode;
  }

  return {
    params,
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

function getCandidateGroupDisplayExpression(columnName) {
  return columnName;
}

function normalizeCandidateGroupFields(groupBy) {
  const requestedFields = Array.isArray(groupBy) ? groupBy : [groupBy];

  return requestedFields
    .map((field) => String(field || "").trim())
    .filter((field, index, fields) => field && fields.indexOf(field) === index)
    .map((field) => ({
      columnName: candidateGroupByColumns[field],
      field,
    }))
    .filter((fieldConfig) => fieldConfig.columnName);
}

function normalizeRepositoryFilter(rawFilter = {}) {
  const filter = normalizeCandidateFilter(rawFilter);
  filter.schoolId = String(rawFilter.schoolId || "").trim();
  const candidateSort = rawFilter.candidateSort && typeof rawFilter.candidateSort === "object"
    ? rawFilter.candidateSort
    : {};
  const sort = rawFilter.sort && typeof rawFilter.sort === "object" ? rawFilter.sort : {};

  filter.sortKey = String(rawFilter.sortKey || candidateSort.sortKey || sort.key || sort.field || "").trim();
  filter.sortDirection = String(rawFilter.sortDirection || candidateSort.sortDirection || sort.direction || "").trim().toLowerCase() === "desc"
    ? "desc"
    : "asc";
  return filter;
}

function buildDefaultCandidateOrderByClause() {
  return `
        ORDER BY
          CASE WHEN designated_sort = '' THEN 1 ELSE 0 END ASC,
          CAST(NULLIF(designated_sort, '') AS UNSIGNED) ASC,
          designated_sort ASC,
          exam_date ASC,
          room ASC,
          examinee_no ASC
      `;
}

function buildCandidateOrderByClause(filter = {}) {
  const columnName = candidateSortColumnMap[filter.sortKey];

  if (!columnName) {
    return buildDefaultCandidateOrderByClause();
  }

  const direction = filter.sortDirection === "desc" ? "DESC" : "ASC";
  const emptyExpression = `${columnName} IS NULL OR ${columnName} = ''`;
  const valueExpressions = numericSortColumns.has(columnName)
    ? `CAST(NULLIF(${columnName}, '') AS UNSIGNED) ${direction}, ${columnName} ${direction}`
    : `${columnName} ${direction}`;

  return `
        ORDER BY
          CASE WHEN ${emptyExpression} THEN 1 ELSE 0 END ASC,
          ${valueExpressions},
          id ASC
      `;
}

function createCandidateReadRepository({ createHttpError, query }) {
  const candidateFilterOptionColumns = Object.freeze({
    admission: "admission",
    admissionCode: "admission_code",
    building: "building",
    buildingCode: "building_code",
    date: "exam_date",
    examDate: "exam_date",
    group: "group_name",
    major: "major",
    majorCode: "major_code",
    opt1: "opt1",
    opt2: "opt2",
    opt3: "opt3",
    opt4: "opt4",
    opt5: "opt5",
    opt6: "opt6",
    opt7: "opt7",
    opt8: "opt8",
    opt9: "opt9",
    opt10: "opt10",
    period: "period",
    periodCode: "period_code",
    room: "room",
    roomCode: "room_code",
    series: "series",
    seriesCode: "series_code",
    time: "time",
    endTime: "end_time",
    track: "track",
    unit: "unit",
    unitCode: "unit_code",
  });

  function normalizeCandidateFilterOptionFields(fields) {
    const requestedFields = Array.isArray(fields)
      ? fields
      : String(fields || "")
          .split(",")
          .map((field) => field.trim());
    const normalizedFields = requestedFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(candidateFilterOptionColumns, field),
    );

    return normalizedFields.length ? [...new Set(normalizedFields)] : Object.keys(candidateFilterOptionColumns);
  }

  function appendOptionValueCondition(whereClause, columnName) {
    const valueCondition = `${columnName} IS NOT NULL AND ${columnName} <> ''`;

    return whereClause ? `${whereClause} AND ${valueCondition}` : `WHERE ${valueCondition}`;
  }

  function buildCandidateFilterForOptionField(filter = {}, field = "", options = {}) {
    if (!options.excludeSelfFilters) {
      return filter;
    }

    const fieldFilterKeys = field === "date" ? ["examDate"] : [field];

    return fieldFilterKeys.reduce(
      (nextFilter, key) => ({
        ...nextFilter,
        [key]: "",
      }),
      filter,
    );
  }

  async function findCandidates(rawFilter = {}) {
    const filter = normalizeRepositoryFilter(rawFilter);
    const offset = (filter.page - 1) * filter.limit;
    const { params, whereClause } = buildCandidateWhereClause(filter);
    const rows = await query(
      `
        SELECT COUNT(*) AS total
        FROM candidate_records
        ${whereClause}
      `,
      params,
    );
    const dataRows = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          designated_sort AS designatedSort,
          admission_year AS admissionYear,
          exam_date AS examDate,
          time,
          end_time AS endTime,
          track,
          admission,
          admission_code AS admissionCode,
          series,
          series_code AS seriesCode,
          unit,
          unit_code AS unitCode,
          major,
          major_code AS majorCode,
          building,
          building_code AS buildingCode,
          room,
          group_name AS groupName,
          room_code AS roomCode,
          period,
          period_code AS periodCode,
          examinee_no AS examineeNo,
          temporary_no AS temporaryNo,
          name,
          birth_date AS birthDate,
          opt1,
          opt2,
          opt3,
          opt4,
          opt5,
          opt6,
          opt7,
          opt8,
          opt9,
          opt10,
          photo_name AS photoName,
          photo_mime AS photoMime,
          UNIX_TIMESTAMP(updated_at) AS photoVersion,
          source_type AS sourceType
        FROM candidate_records
        ${whereClause}
        ${buildCandidateOrderByClause(filter)}
        LIMIT :limit OFFSET :offset
      `,
      {
        ...params,
        limit: filter.limit,
        offset,
      },
    );

    return {
      fieldMap: candidateFieldMap,
      items: dataRows.map(mapCandidateViewRow),
      limit: filter.limit,
      page: filter.page,
      total: Number(rows[0]?.total) || 0,
    };
  }

  async function getDashboardCandidateSummary(rawFilter = {}) {
    const schoolId = String(rawFilter.schoolId || "").trim();
    const whereClause = schoolId ? "WHERE school_id = :schoolId" : "";
    const params = schoolId ? { schoolId } : {};
    const totalRows = await query(`SELECT COUNT(*) AS totalCandidates FROM candidate_records ${whereClause}`, params);
    const roomRows = await query(`SELECT COUNT(DISTINCT room) AS totalRooms FROM candidate_records ${whereClause}`, params);
    const admissionRows = await query(
      `
        SELECT admission, COUNT(*) AS candidateCount
        FROM candidate_records
        ${whereClause}
        GROUP BY admission
        ORDER BY candidateCount DESC, admission ASC
        LIMIT 5
      `,
      params,
    );

    return {
      admissions: admissionRows.map((row) => ({
        candidateCount: Number(row.candidateCount) || 0,
        name: String(row.admission || "미분류"),
      })),
      totalCandidates: Number(totalRows[0]?.totalCandidates) || 0,
      totalRooms: Number(roomRows[0]?.totalRooms) || 0,
    };
  }

  async function findCandidateGroups(rawFilter = {}, groupBy = "room") {
    const filter = normalizeRepositoryFilter(rawFilter);
    const groupFields = normalizeCandidateGroupFields(groupBy);

    if (!groupFields.length) {
      throw createHttpError(400, "지원하지 않는 그룹 기준입니다.", "UNSUPPORTED_GROUP_BY");
    }

    const { params, whereClause } = buildCandidateWhereClause(filter);
    const selectExpressions = groupFields
      .map(({ columnName, field }) => `${getCandidateGroupDisplayExpression(columnName)} AS \`${field}\``)
      .join(",\n          ");
    const groupColumns = groupFields.map(({ columnName }) => columnName).join(", ");
    const orderColumns = groupFields.map(({ field }) => `\`${field}\` ASC`).join(", ");
    const rows = await query(
      `
        SELECT
          ${selectExpressions},
          COUNT(*) AS candidateCount
        FROM candidate_records
        ${whereClause}
        GROUP BY ${groupColumns}
        ORDER BY ${orderColumns}
      `,
      params,
    );

    return rows.map((row) => {
      const filters = Object.fromEntries(
        groupFields.map(({ field }) => [field, String(row[field] || "").trim()]),
      );
      const name = groupFields.length === 1
        ? String(Object.values(filters)[0] || "미분류")
        : groupFields.map(({ field }) => filters[field] || "미분류").join(" / ");

      return {
        candidateCount: Number(row.candidateCount) || 0,
        filters,
        name,
      };
    });
  }

  async function findCandidateFilterOptions(rawFilter = {}, fields = [], options = {}) {
    const filter = normalizeRepositoryFilter(rawFilter);
    const requestedFields = normalizeCandidateFilterOptionFields(fields);
    const optionGroups = {};

    for (const field of requestedFields) {
      const columnName = candidateFilterOptionColumns[field];
      const displayExpression = columnName;
      const fieldFilter = buildCandidateFilterForOptionField(filter, field, options);
      const { params, whereClause } = buildCandidateWhereClause(fieldFilter);
      const rows = await query(
        `
          SELECT ${displayExpression} AS value, COUNT(*) AS candidateCount
          FROM candidate_records
          ${appendOptionValueCondition(whereClause, columnName)}
          GROUP BY ${columnName}
          ORDER BY value ASC
        `,
        params,
      );

      optionGroups[field] = rows.map((row) => ({
        candidateCount: Number(row.candidateCount) || 0,
        value: String(row.value || ""),
      }));
    }

    return optionGroups;
  }

  async function getCandidateWorkbookRowById(candidateId, options = {}) {
    const schoolId = String(options.schoolId || "").trim();
    const [candidateRow] = await query(
      `
        SELECT
          id,
          designated_sort AS designatedSort,
          admission_year AS admissionYear,
          exam_date AS date,
          time,
          end_time AS endTime,
          track,
          admission,
          admission_code AS admissionCode,
          series,
          series_code AS seriesCode,
          unit,
          unit_code AS unitCode,
          major,
          major_code AS majorCode,
          building,
          building_code AS buildingCode,
          room,
          room_code AS roomCode,
          group_name AS \`group\`,
          period,
          period_code AS periodCode,
          examinee_no AS examineeNo,
          temporary_no AS temporaryNo,
          name,
          birth_date AS birth,
          opt1,
          opt2,
          opt3,
          opt4,
          opt5,
          opt6,
          opt7,
          opt8,
          opt9,
          opt10
        FROM candidate_records
        WHERE id = ?
        ${schoolId ? "AND school_id = ?" : ""}
      `,
      [candidateId, ...(schoolId ? [schoolId] : [])],
    );

    return candidateRow || null;
  }

  async function getCandidateViewRowById(candidateId, options = {}) {
    const schoolId = String(options.schoolId || "").trim();
    const [candidateRow] = await query(
      `
        SELECT
          id,
          school_id AS schoolId,
          designated_sort AS designatedSort,
          admission_year AS admissionYear,
          exam_date AS examDate,
          time,
          end_time AS endTime,
          track,
          admission,
          admission_code AS admissionCode,
          series,
          series_code AS seriesCode,
          unit,
          unit_code AS unitCode,
          major,
          major_code AS majorCode,
          building,
          building_code AS buildingCode,
          room,
          group_name AS groupName,
          room_code AS roomCode,
          period,
          period_code AS periodCode,
          examinee_no AS examineeNo,
          temporary_no AS temporaryNo,
          name,
          birth_date AS birthDate,
          opt1,
          opt2,
          opt3,
          opt4,
          opt5,
          opt6,
          opt7,
          opt8,
          opt9,
          opt10,
          photo_name AS photoName,
          photo_mime AS photoMime,
          UNIX_TIMESTAMP(updated_at) AS photoVersion,
          source_type AS sourceType
        FROM candidate_records
        WHERE id = ?
        ${schoolId ? "AND school_id = ?" : ""}
      `,
      [candidateId, ...(schoolId ? [schoolId] : [])],
    );

    return mapCandidateViewRow(candidateRow);
  }

  return Object.freeze({
    findCandidateFilterOptions,
    findCandidateGroups,
    findCandidates,
    getCandidateViewRowById,
    getCandidateWorkbookRowById,
    getDashboardCandidateSummary,
  });
}

module.exports = {
  buildCandidateWhereClause,
  createCandidateReadRepository,
};
