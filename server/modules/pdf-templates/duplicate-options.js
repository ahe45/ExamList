function normalizeDuplicateSchoolId(value = "") {
  return String(value || "").trim();
}

function normalizeTemplateDuplicateOptions(options = {}) {
  const sourceSchoolId = normalizeDuplicateSchoolId(options.sourceSchoolId);
  const legacySchoolId = normalizeDuplicateSchoolId(options.schoolId);
  const targetSchoolId = normalizeDuplicateSchoolId(options.targetSchoolId || legacySchoolId);

  return {
    lookupSchoolId: sourceSchoolId || legacySchoolId,
    schoolId: legacySchoolId,
    sourceSchoolId,
    targetSchoolId,
  };
}

module.exports = {
  normalizeTemplateDuplicateOptions,
};
