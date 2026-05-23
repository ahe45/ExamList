const { createBaseContext, replaceTemplateTokens } = require("../pdf-preview/renderer");

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
  const rawPattern = String(template?.layout?.generation?.fileNamePattern || "").trim();
  const renderedName = rawPattern ? replaceTemplateTokens(rawPattern, context) : "";
  const fallbackName = `${String(template?.name || "수험생확인대장").trim() || "수험생확인대장"}_${formatTimestamp(generatedAt)}`;
  const sanitizedName = sanitizeFileName(renderedName || fallbackName) || `pdf_${formatTimestamp(generatedAt)}`;

  return ensurePdfExtension(sanitizedName);
}

module.exports = {
  buildPdfGenerationFileName,
  formatTimestamp,
  sanitizeFileName,
};
