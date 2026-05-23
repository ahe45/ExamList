const singletonSettingsId = "default";

function buildSchoolSettingsId(schoolId) {
  const normalizedSchoolId = String(schoolId || "").trim();

  return normalizedSchoolId === "school-default" ? singletonSettingsId : `settings-${normalizedSchoolId}`.slice(0, 64);
}

function normalizeAcademicYearValue(value, createHttpError = null) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  if (rawValue.length > 20 && typeof createHttpError === "function") {
    throw createHttpError(400, "모집년도는 20자 이하로 입력하세요.", "INVALID_ACADEMIC_YEAR");
  }

  const numericValue = rawValue.replace(/\s*학년도\s*$/u, "").trim();

  if (!/^\d{4}$/.test(numericValue)) {
    if (typeof createHttpError === "function") {
      throw createHttpError(400, "모집년도는 숫자 4자리로 입력하세요.", "INVALID_ACADEMIC_YEAR");
    }

    return "";
  }

  return numericValue;
}

function normalizeSchoolSettingsPayload(payload = {}, createHttpError) {
  const schoolName = String(payload.schoolName ?? "").trim();
  const academicYear = normalizeAcademicYearValue(payload.academicYear, createHttpError);
  const logoDataUrl = String(payload.logoDataUrl ?? "").trim();

  if (schoolName.length > 200) {
    throw createHttpError(400, "학교명은 200자 이하로 입력하세요.", "INVALID_SCHOOL_NAME");
  }

  if (logoDataUrl && !/^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoDataUrl)) {
    throw createHttpError(400, "로고 이미지는 PNG, JPG, WEBP 데이터 URL만 저장할 수 있습니다.", "INVALID_SCHOOL_LOGO");
  }

  if (logoDataUrl.length > 1024 * 1024 * 2) {
    throw createHttpError(400, "로고 이미지는 2MB 이하만 저장할 수 있습니다.", "SCHOOL_LOGO_TOO_LARGE");
  }

  return {
    academicYear,
    logoDataUrl,
    schoolName,
  };
}

function mapSettingsRow(row = {}) {
  return {
    academicYear: normalizeAcademicYearValue(row.academicYear),
    logoDataUrl: String(row.logoDataUrl || ""),
    schoolCode: String(row.schoolCode || row.code || ""),
    schoolId: String(row.schoolId || ""),
    schoolName: String(row.schoolName || ""),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : "",
  };
}

function createSchoolSettingsService({ createHttpError, getDefaultSchoolId = null, getSchoolById = null, query }) {
  async function resolveSchoolId(schoolId = "") {
    const normalizedSchoolId = String(schoolId || "").trim();

    if (normalizedSchoolId) {
      if (typeof getSchoolById === "function") {
        const school = await getSchoolById(normalizedSchoolId);
        return String(school?.id || normalizedSchoolId);
      }

      return normalizedSchoolId;
    }

    return typeof getDefaultSchoolId === "function" ? getDefaultSchoolId() : "school-default";
  }

  async function getSchoolSettings(schoolId = "") {
    const resolvedSchoolId = await resolveSchoolId(schoolId);
    const school = typeof getSchoolById === "function" ? await getSchoolById(resolvedSchoolId) : null;
    const rows = await query(
      `
        SELECT
          school_id AS schoolId,
          school_name AS schoolName,
          academic_year AS academicYear,
          logo_data_url AS logoDataUrl,
          updated_at AS updatedAt
        FROM school_settings
        WHERE school_id = ? OR (id = ? AND ? = 'school-default')
        ORDER BY CASE WHEN school_id = ? THEN 0 ELSE 1 END
        LIMIT 1
      `,
      [resolvedSchoolId, singletonSettingsId, resolvedSchoolId, resolvedSchoolId],
    );

    if (rows[0]) {
      const settings = mapSettingsRow(rows[0]);

      return {
        ...settings,
        schoolCode: school?.code || settings.schoolCode,
        schoolName: settings.schoolName || school?.name || "",
      };
    }

    return mapSettingsRow({
      schoolCode: school?.code || "",
      schoolId: resolvedSchoolId,
      schoolName: school?.name || "",
    });
  }

  async function updateSchoolSettings(payload = {}, schoolId = "") {
    const resolvedSchoolId = await resolveSchoolId(schoolId || payload.schoolId || "");
    const settings = normalizeSchoolSettingsPayload(payload, createHttpError);

    await query(
      `
        INSERT INTO school_settings (
          id,
          school_id,
          school_name,
          academic_year,
          logo_data_url
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          school_name = VALUES(school_name),
          academic_year = VALUES(academic_year),
          logo_data_url = VALUES(logo_data_url),
          updated_at = CURRENT_TIMESTAMP
      `,
      [buildSchoolSettingsId(resolvedSchoolId), resolvedSchoolId, settings.schoolName, settings.academicYear, settings.logoDataUrl],
    );

    if (settings.schoolName) {
      await query(
        `
          UPDATE schools
          SET
            name = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND deleted_at IS NULL
        `,
        [settings.schoolName, resolvedSchoolId],
      );
    }

    return getSchoolSettings(resolvedSchoolId);
  }

  return Object.freeze({
    getSchoolSettings,
    updateSchoolSettings,
  });
}

module.exports = {
  createSchoolSettingsService,
  normalizeSchoolSettingsPayload,
};
