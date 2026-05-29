function normalizeStorageSegment(value = "", fallback = "default") {
  const normalizedValue = String(value || "").trim();
  const normalizedFallback = String(fallback || "default").trim() || "default";
  const sanitizedValue = normalizedValue
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();

  if (!sanitizedValue || sanitizedValue === "." || sanitizedValue === "..") {
    return normalizedFallback;
  }

  return sanitizedValue;
}

function resolveConfiguredDirectory(pathModule, rootDir, value = "") {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return pathModule.isAbsolute(normalizedValue) ? normalizedValue : pathModule.join(rootDir, normalizedValue);
}

function resolveStorageBaseRoot(pathModule, rootDir) {
  return resolveConfiguredDirectory(pathModule, rootDir, process.env.EXAMLIST_STORAGE_DIR) ||
    pathModule.join(rootDir, "storage");
}

function resolveSchoolStorageRoot(pathModule, rootDir, schoolStorageCode = "") {
  return pathModule.join(
    resolveStorageBaseRoot(pathModule, rootDir),
    normalizeStorageSegment(schoolStorageCode, "school-default"),
  );
}

function resolveSchoolCandidatePhotoDirectoryPath(pathModule, rootDir, schoolStorageCode = "") {
  return pathModule.join(resolveSchoolStorageRoot(pathModule, rootDir, schoolStorageCode), "candidate-photos");
}

function resolveLegacyCandidatePhotoDirectoryPath(pathModule, rootDir) {
  return pathModule.join(resolveStorageBaseRoot(pathModule, rootDir), "candidate-photos");
}

function resolveConfiguredPdfStorageRoot(pathModule, rootDir) {
  return resolveConfiguredDirectory(pathModule, rootDir, process.env.PDF_STORAGE_DIR);
}

function resolveLegacyPdfStorageRoot(pathModule, rootDir) {
  return resolveConfiguredPdfStorageRoot(pathModule, rootDir) ||
    pathModule.join(resolveStorageBaseRoot(pathModule, rootDir), "pdf-generations");
}

function resolveSchoolPdfStorageRoot(pathModule, rootDir, schoolStorageCode = "") {
  const configuredPdfStorageRoot = resolveConfiguredPdfStorageRoot(pathModule, rootDir);

  if (configuredPdfStorageRoot) {
    return pathModule.join(configuredPdfStorageRoot, normalizeStorageSegment(schoolStorageCode, "school-default"));
  }

  return pathModule.join(resolveSchoolStorageRoot(pathModule, rootDir, schoolStorageCode), "pdf-generations");
}

module.exports = {
  normalizeStorageSegment,
  resolveLegacyCandidatePhotoDirectoryPath,
  resolveLegacyPdfStorageRoot,
  resolveSchoolCandidatePhotoDirectoryPath,
  resolveSchoolPdfStorageRoot,
  resolveSchoolStorageRoot,
  resolveStorageBaseRoot,
};
