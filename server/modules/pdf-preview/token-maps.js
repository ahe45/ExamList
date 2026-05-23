const { formatDateValue } = require("./token-formatters");

function buildCandidateTokenMap(candidate = {}, school = {}) {
  const schoolAdmissionYear = String(school?.academicYear || school?.year || "").trim();

  return {
    ...candidate,
    admissionYear: schoolAdmissionYear || String(candidate.admissionYear || ""),
    birthDate: formatDateValue(candidate.birthDate),
    examDate: formatDateValue(candidate.examDate),
    examEndTime: String(candidate.examEndTime || candidate.endTime || ""),
    examStartTime: String(candidate.examStartTime || candidate.time || ""),
    photo: String(candidate.photoUrl || candidate.photoFileId || ""),
    photoFileId: String(candidate.photoFileId || ""),
    photoUrl: String(candidate.photoUrl || ""),
  };
}

function normalizeSchoolAcademicYearValue(value) {
  return String(value || "").trim().replace(/\s*학년도\s*$/u, "").trim();
}

function formatSchoolAcademicYearLabel(value) {
  const academicYear = normalizeSchoolAcademicYearValue(value);

  return academicYear ? `${academicYear}학년도` : "";
}

function buildSchoolTokenMap(schoolSettings = {}) {
  const schoolName = String(schoolSettings.schoolName || schoolSettings.name || "").trim();
  const schoolCode = String(schoolSettings.schoolCode || schoolSettings.code || "").trim();
  const academicYear = normalizeSchoolAcademicYearValue(schoolSettings.academicYear || schoolSettings.year);
  const academicYearLabel = formatSchoolAcademicYearLabel(academicYear);

  return {
    academicYear: academicYearLabel,
    academicYearValue: academicYear,
    code: schoolCode,
    logoDataUrl: String(schoolSettings.logoDataUrl || "").trim(),
    name: schoolName,
    schoolCode,
    schoolName,
    year: academicYear,
  };
}

module.exports = {
  buildCandidateTokenMap,
  buildSchoolTokenMap,
  formatSchoolAcademicYearLabel,
  normalizeSchoolAcademicYearValue,
};
