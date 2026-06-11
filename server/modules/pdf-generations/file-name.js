const { createBaseContext } = require("../pdf-preview/renderer");

function sanitizeFileName(fileName) {
  return String(fileName || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .trim()
    .replace(/[. ]+$/g, "");
}

function formatTimestamp(value = new Date()) {
  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "00000000_000000";
  }

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  const hours = String(dateValue.getHours()).padStart(2, "0");
  const minutes = String(dateValue.getMinutes()).padStart(2, "0");
  const seconds = String(dateValue.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function ensurePdfExtension(fileName) {
  return String(fileName || "").toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
}

function normalizeFileNamePart(value) {
  return String(value || "").trim();
}

function buildDefaultPdfGenerationFileName({ context = {}, generatedAt, templateName = "" }) {
  const admission = context.admission || {};
  const candidate = context.candidate || {};
  const document = context.document || {};
  const exam = context.exam || {};
  const room = context.room || {};
  const school = context.school || {};
  const parts = [
    document.templateName || templateName || "수험생확인대장",
    school.academicYear || school.year || candidate.admissionYear,
    candidate.admissionRoundName || candidate.examName || exam.name,
    candidate.admissionTypeName || admission.typeName,
    room.name || room.roomName || candidate.roomName,
    formatTimestamp(generatedAt),
  ].map(normalizeFileNamePart).filter(Boolean);

  return parts.join("_");
}

function buildPdfGenerationFileName({ candidates, generatedAt, schoolSettings = {}, template }) {
  const representativeCandidate = Array.isArray(candidates) && candidates.length ? candidates[0] : {};
  const context = createBaseContext({
    candidates,
    generatedAt,
    pageNumber: 1,
    representativeCandidate,
    schoolSettings,
    templateName: template?.name || "",
    totalPages: 1,
  });
  const fallbackName = buildDefaultPdfGenerationFileName({
    context,
    generatedAt,
    templateName: template?.name,
  });
  const sanitizedName = sanitizeFileName(fallbackName) || `pdf_${formatTimestamp(generatedAt)}`;

  return ensurePdfExtension(sanitizedName);
}

module.exports = {
  buildPdfGenerationFileName,
  formatTimestamp,
  sanitizeFileName,
};
