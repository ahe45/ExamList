const nodePath = require("path");

const { createUniqueValueList } = require("./utils");

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
} = {}) {
  const candidatePhotoFileNames = createCandidatePhotoFileNameSet(candidateRows, pathModule);
  const remainingPhotoFileNames = createCandidatePhotoFileNameSet(remainingPhotoReferenceRows, pathModule);
  const photoStorageDirectoryPath = pathModule.join(rootDir, "storage", "candidate-photos");

  return [...candidatePhotoFileNames]
    .filter((fileName) => !remainingPhotoFileNames.has(fileName))
    .map((fileName) => pathModule.join(photoStorageDirectoryPath, pathModule.basename(fileName)));
}

module.exports = {
  createCandidatePhotoFileNameSet,
  getStoredCandidatePhotoCandidateFileNames,
  resolveOrphanedCandidatePhotoFilePaths,
};
