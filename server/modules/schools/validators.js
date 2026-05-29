const defaultSchoolId = "school-default";

function normalizeSchoolId(value, fallback = defaultSchoolId) {
  const normalizedValue = String(value || "").trim();

  return normalizedValue || fallback;
}

function normalizeSchoolPayload(payload = {}, createHttpError) {
  const code = String(payload.code || "").trim().toUpperCase();
  const description = String(payload.description || "").trim();
  const name = String(payload.name || payload.schoolName || "").trim();

  if (!name) {
    throw createHttpError(400, "학교명을 입력하세요.", "SCHOOL_NAME_REQUIRED");
  }

  if (name.length > 200) {
    throw createHttpError(400, "학교명은 200자 이하로 입력하세요.", "INVALID_SCHOOL_NAME");
  }

  if (code && !/^[A-Z0-9_-]{2,80}$/.test(code)) {
    throw createHttpError(400, "학교 코드는 영문 대문자, 숫자, -, _ 조합으로 2~80자만 입력하세요.", "INVALID_SCHOOL_CODE");
  }

  if (description.length > 255) {
    throw createHttpError(400, "학교 설명은 255자 이하로 입력하세요.", "INVALID_SCHOOL_DESCRIPTION");
  }

  return {
    code,
    description,
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
    code: String(row.code || ""),
    createdAccount: String(row.createdAccount || ""),
    description: String(row.description || ""),
    id: String(row.id || ""),
    name: String(row.name || ""),
    templateCount: Number(row.templateCount) || 0,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
  };
}

module.exports = {
  defaultSchoolId,
  mapSchoolRow,
  normalizeSchoolDeletionPassword,
  normalizeSchoolId,
  normalizeSchoolListFilter,
  normalizeSchoolPayload,
};
