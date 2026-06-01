function normalizeDuplicateSchoolId(value = "") {
  return String(value || "").trim();
}

function normalizeDuplicateMetadataValue(value = "") {
  return String(value ?? "").trim();
}

function normalizeTemplateDuplicateOptions(options = {}) {
  const sourceSchoolId = normalizeDuplicateSchoolId(options.sourceSchoolId);
  const legacySchoolId = normalizeDuplicateSchoolId(options.schoolId);
  const targetSchoolId = normalizeDuplicateSchoolId(options.targetSchoolId || legacySchoolId);

  return {
    description: normalizeDuplicateMetadataValue(options.description),
    hasDescription: Object.prototype.hasOwnProperty.call(options, "description"),
    lookupSchoolId: sourceSchoolId || legacySchoolId,
    name: normalizeDuplicateMetadataValue(options.name),
    schoolId: legacySchoolId,
    sourceSchoolId,
    targetSchoolId,
  };
}

module.exports = {
  normalizeTemplateDuplicateOptions,
};
