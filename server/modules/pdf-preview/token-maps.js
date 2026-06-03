function buildCandidateTokenMap(candidate = {}, school = {}) {
  const schoolAdmissionYear = String(school?.academicYear || school?.year || "").trim();
  const schoolCampusCode = String(school?.campusCode || "").trim();
  const schoolCampusName = String(school?.campusName || school?.campus || "").trim();

  return {
    ...candidate,
    admissionYear: schoolAdmissionYear || String(candidate.admissionYear || ""),
    birthDate: String(candidate.birthDate || ""),
    campus: schoolCampusName || String(candidate.campus || candidate.campusName || ""),
    campusCode: schoolCampusCode || String(candidate.campusCode || ""),
    campusName: schoolCampusName || String(candidate.campusName || candidate.campus || ""),
    examDate: String(candidate.examDate || ""),
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
  const campusCode = String(schoolSettings.campusCode || "").trim();
  const campusName = String(schoolSettings.campusName || schoolSettings.campus || "").trim();
  const academicYear = normalizeSchoolAcademicYearValue(schoolSettings.academicYear || schoolSettings.year);
  const academicYearLabel = formatSchoolAcademicYearLabel(academicYear);

  return {
    academicYear: academicYearLabel,
    academicYearValue: academicYear,
    campus: campusName,
    campusCode,
    campusName,
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
