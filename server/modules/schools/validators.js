const defaultSchoolId = "school-default";

function normalizeSchoolId(value, fallback = defaultSchoolId) {
  const normalizedValue = String(value || "").trim();

  return normalizedValue || fallback;
}

function combineSchoolCode(schoolCode = "", campusCode = "") {
  const normalizedSchoolCode = String(schoolCode || "").trim().toUpperCase();
  const normalizedCampusCode = String(campusCode || "").trim().toUpperCase();

  if (!normalizedSchoolCode || !normalizedCampusCode) {
    return normalizedSchoolCode;
  }

  const campusSuffix = `-${normalizedCampusCode}`;

  return normalizedSchoolCode.endsWith(campusSuffix)
    ? normalizedSchoolCode
    : `${normalizedSchoolCode}${campusSuffix}`;
}

function normalizeCombinedSchoolCode(schoolCode = "", campusCode = "", createHttpError) {
  const normalizedCampusCode = String(campusCode || "").trim().toUpperCase();

  if (normalizedCampusCode && !/^[A-Z0-9_-]{1,80}$/.test(normalizedCampusCode)) {
    throw createHttpError(400, "캠퍼스 코드는 영문 대문자, 숫자, -, _ 조합으로 입력하세요.", "INVALID_CAMPUS_CODE");
  }

  const code = combineSchoolCode(schoolCode, normalizedCampusCode);

  if (code && !/^[A-Z0-9_-]{2,80}$/.test(code)) {
    throw createHttpError(400, "학교 코드는 캠퍼스 코드와 조합했을 때 영문 대문자, 숫자, -, _ 조합으로 2~80자여야 합니다.", "INVALID_SCHOOL_CODE");
  }

  return code;
}

function normalizeSchoolPayload(payload = {}, createHttpError) {
  const campusCode = String(payload.campusCode || "").trim().toUpperCase();
  const code = normalizeCombinedSchoolCode(payload.code, campusCode, createHttpError);
  const name = String(payload.name || payload.schoolName || "").trim();

  if (!name) {
    throw createHttpError(400, "학교명을 입력하세요.", "SCHOOL_NAME_REQUIRED");
  }

  if (name.length > 200) {
    throw createHttpError(400, "학교명은 200자 이하로 입력하세요.", "INVALID_SCHOOL_NAME");
  }

  return {
    campusCode,
    code,
    name,
  };
}

function normalizeSchoolDeletionPassword(value = "") {
  return String(value || "").trim();
}

function normalizeSchoolListFilter(rawFilter = {}) {
  const page = Math.max(1, Math.round(Number(rawFilter.page) || 1));
  const limit = Math.min(Math.max(1, Math.round(Number(rawFilter.limit) || 30)), 100);

  return {
    keyword: String(rawFilter.keyword || "").trim(),
    limit,
    page,
  };
}

function mapSchoolRow(row = {}) {
  return {
    candidateCount: Number(row.candidateCount) || 0,
    campusCode: String(row.campusCode || ""),
    campusName: String(row.campusName || ""),
    code: String(row.code || ""),
    createdAccount: String(row.createdAccount || ""),
    description: "",
    id: String(row.id || ""),
    name: String(row.name || ""),
    templateCount: Number(row.templateCount) || 0,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
  };
}

module.exports = {
  combineSchoolCode,
  defaultSchoolId,
  mapSchoolRow,
  normalizeSchoolDeletionPassword,
  normalizeSchoolId,
  normalizeSchoolListFilter,
  normalizeCombinedSchoolCode,
  normalizeSchoolPayload,
};
