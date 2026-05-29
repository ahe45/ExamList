const nodePath = require("path");

const { createUniqueValueList } = require("./utils");
const {
  resolveLegacyCandidatePhotoDirectoryPath,
  resolveSchoolCandidatePhotoDirectoryPath,
} = require("../storage-paths");

function getStoredCandidatePhotoCandidateFileNames(candidate = {}, pathModule = nodePath) {
  const examineeNo = String(candidate.examineeNo || "").trim();
  const photoName = pathModule.basename(String(candidate.photoName || "").trim());

  if (!photoName) {
    return [];
  }

  return createUniqueValueList([
    photoName,
    examineeNo ? `${examineeNo}.jpg` : "",
    examineeNo ? `${examineeNo}.jpeg` : "",
    examineeNo ? `${examineeNo}.png` : "",
  ]);
}

function createCandidatePhotoFileNameSet(candidateRows = [], pathModule = nodePath) {
  const fileNames = new Set();

  candidateRows.forEach((candidate) => {
    getStoredCandidatePhotoCandidateFileNames(candidate, pathModule).forEach((fileName) => {
      fileNames.add(fileName);
    });
  });

  return fileNames;
}

function resolveOrphanedCandidatePhotoFilePaths({
  candidateRows = [],
  pathModule = nodePath,
  remainingPhotoReferenceRows = [],
  rootDir = process.cwd(),
  schoolId = "",
  schoolStorageCode = "",
} = {}) {
  const candidatePhotoFileNames = createCandidatePhotoFileNameSet(candidateRows, pathModule);
  const remainingPhotoFileNames = createCandidatePhotoFileNameSet(remainingPhotoReferenceRows, pathModule);
  const normalizedSchoolId = String(schoolId || "").trim();
  const sameSchoolRemainingRows = normalizedSchoolId
    ? remainingPhotoReferenceRows.filter((row) => String(row?.schoolId || "").trim() === normalizedSchoolId)
    : remainingPhotoReferenceRows;
  const sameSchoolRemainingPhotoFileNames = createCandidatePhotoFileNameSet(sameSchoolRemainingRows, pathModule);
  const schoolPhotoStorageDirectoryPath = String(schoolStorageCode || "").trim()
    ? resolveSchoolCandidatePhotoDirectoryPath(pathModule, rootDir, schoolStorageCode)
    : "";
  const legacyPhotoStorageDirectoryPath = resolveLegacyCandidatePhotoDirectoryPath(pathModule, rootDir);
  const filePaths = [];

  for (const fileName of candidatePhotoFileNames) {
    const basename = pathModule.basename(fileName);

    if (schoolPhotoStorageDirectoryPath && !sameSchoolRemainingPhotoFileNames.has(fileName)) {
      filePaths.push(pathModule.join(schoolPhotoStorageDirectoryPath, basename));
    }

    if (!remainingPhotoFileNames.has(fileName)) {
      filePaths.push(pathModule.join(legacyPhotoStorageDirectoryPath, basename));
    }
  }

  return createUniqueValueList(filePaths);
}

module.exports = {
  createCandidatePhotoFileNameSet,
  getStoredCandidatePhotoCandidateFileNames,
  resolveOrphanedCandidatePhotoFilePaths,
};
