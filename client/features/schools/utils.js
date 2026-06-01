export function toSchoolQueryString(filters = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== null && typeof value !== "undefined") {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}

export function readSchoolLogoFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("로고 이미지를 읽지 못했습니다.")));
    reader.readAsDataURL(file);
  });
}

export function normalizeAcademicYearInputValue(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

export function formatAcademicYearForSave(value) {
  const normalizedAcademicYear = normalizeAcademicYearInputValue(value);

  return normalizedAcademicYear ? `${normalizedAcademicYear}학년도` : "";
}

export function normalizeCampusNameInputValue(value) {
  return String(value || "").trim().replace(/\s*캠퍼스\s*$/u, "").trim();
}

export function formatCampusNameForSave(value) {
  const normalizedCampusName = normalizeCampusNameInputValue(value);

  return normalizedCampusName ? `${normalizedCampusName}캠퍼스` : "";
}

export function normalizeSchoolNameInputValue(value) {
  return String(value || "").trim().replace(/\s*대학교\s*$/u, "").trim();
}

export function formatSchoolNameForSave(value) {
  const normalizedSchoolName = normalizeSchoolNameInputValue(value);

  return normalizedSchoolName ? `${normalizedSchoolName}대학교` : "";
}
