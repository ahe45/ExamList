const fs = require("fs");
const path = require("path");

const previewSampleCandidateCount = 25;
const sampleCandidatePhotoFileId = "sample-candidate-photo.png";
const sampleCandidatePhotoPath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "client",
  "assets",
  sampleCandidatePhotoFileId,
);
let sampleCandidatePhotoDataUrl = null;

const candidateTagAliases = Object.freeze({
  "candidate.admissionRoundName": Object.freeze(["admissionRoundName", "track", "examName"]),
  "candidate.admissionTypeCode": Object.freeze(["admissionTypeCode", "admissionCode"]),
  "candidate.admissionTypeName": Object.freeze(["admissionTypeName", "admission"]),
  "candidate.admissionYear": Object.freeze(["admissionYear"]),
  "candidate.birthDate": Object.freeze(["birthDate", "birth"]),
  "candidate.buildingCode": Object.freeze(["buildingCode"]),
  "candidate.buildingName": Object.freeze(["buildingName", "building"]),
  "candidate.campusCode": Object.freeze(["campusCode"]),
  "candidate.campusName": Object.freeze(["campusName", "campus"]),
  "candidate.departmentCode": Object.freeze(["departmentCode", "unitCode"]),
  "candidate.departmentName": Object.freeze(["departmentName", "unit"]),
  "candidate.designatedSort": Object.freeze(["designatedSort"]),
  "candidate.examDate": Object.freeze(["examDate", "date"]),
  "candidate.examEndTime": Object.freeze(["examEndTime", "endTime"]),
  "candidate.examName": Object.freeze(["examName", "track"]),
  "candidate.examNo": Object.freeze(["examNo", "examineeNo"]),
  "candidate.examStartTime": Object.freeze(["examStartTime", "time"]),
  "candidate.groupName": Object.freeze(["groupName", "group"]),
  "candidate.majorCode": Object.freeze(["majorCode"]),
  "candidate.majorName": Object.freeze(["majorName", "major"]),
  "candidate.name": Object.freeze(["name"]),
  "candidate.opt1": Object.freeze(["opt1"]),
  "candidate.opt2": Object.freeze(["opt2"]),
  "candidate.opt3": Object.freeze(["opt3"]),
  "candidate.opt4": Object.freeze(["opt4"]),
  "candidate.opt5": Object.freeze(["opt5"]),
  "candidate.opt6": Object.freeze(["opt6"]),
  "candidate.opt7": Object.freeze(["opt7"]),
  "candidate.opt8": Object.freeze(["opt8"]),
  "candidate.opt9": Object.freeze(["opt9"]),
  "candidate.opt10": Object.freeze(["opt10"]),
  "candidate.periodCode": Object.freeze(["periodCode"]),
  "candidate.periodName": Object.freeze(["periodName", "period"]),
  "candidate.photo": Object.freeze(["photo"]),
  "candidate.photoFileId": Object.freeze(["photoFileId"]),
  "candidate.photoUrl": Object.freeze(["photoUrl"]),
  "candidate.roomCode": Object.freeze(["roomCode"]),
  "candidate.roomName": Object.freeze(["roomName", "room"]),
  "candidate.seriesCode": Object.freeze(["seriesCode"]),
  "candidate.seriesName": Object.freeze(["seriesName", "series"]),
  "candidate.temporaryNo": Object.freeze(["temporaryNo"]),
});

function isImageSource(value = "") {
  return /^(?:data:image\/|https?:\/\/|\/)/i.test(String(value || "").trim());
}

function getSampleCandidatePhotoDataUrl() {
  if (sampleCandidatePhotoDataUrl !== null) {
    return sampleCandidatePhotoDataUrl;
  }

  try {
    sampleCandidatePhotoDataUrl = `data:image/png;base64,${fs.readFileSync(sampleCandidatePhotoPath).toString("base64")}`;
  } catch (_error) {
    sampleCandidatePhotoDataUrl = "";
  }

  return sampleCandidatePhotoDataUrl;
}

function getCandidateKeyFallback(tagKey = "") {
  return String(tagKey || "").replace(/^candidate\./, "").trim();
}

function applyCandidateSampleValue(candidate, tagKey, value) {
  const normalizedKey = String(tagKey || "").trim();
  const aliases = candidateTagAliases[normalizedKey] || [getCandidateKeyFallback(normalizedKey)].filter(Boolean);
  const normalizedValue = String(value ?? "");

  aliases.forEach((alias) => {
    candidate[alias] = normalizedValue;
  });

  if (normalizedKey === "candidate.photo" && isImageSource(normalizedValue)) {
    candidate.photoUrl = normalizedValue;
  }

  if (normalizedKey === "candidate.photoUrl") {
    candidate.photo = normalizedValue;
  }
}

function applyDefaultCandidatePhotoSample(candidate) {
  const photoUrl = String(candidate.photoUrl || "").trim();

  if (photoUrl) {
    return;
  }

  const samplePhotoUrl = getSampleCandidatePhotoDataUrl();

  if (!samplePhotoUrl) {
    return;
  }

  candidate.photoFileId = String(candidate.photoFileId || sampleCandidatePhotoFileId);
  candidate.photoUrl = samplePhotoUrl;

  if (!String(candidate.photo || "").trim()) {
    candidate.photo = "사진";
  }
}

function buildPreviewSampleCandidate(sampleData = {}, index = 0) {
  const candidate = {
    id: `preview-sample-${index + 1}`,
    sourceType: "sample",
  };

  Object.entries(sampleData && typeof sampleData === "object" && !Array.isArray(sampleData) ? sampleData : {}).forEach(
    ([tagKey, sampleValue]) => {
      if (String(tagKey || "").startsWith("candidate.")) {
        applyCandidateSampleValue(candidate, tagKey, sampleValue);
      }
    },
  );

  applyDefaultCandidatePhotoSample(candidate);

  return candidate;
}

function buildPreviewSampleCandidates(sampleData = {}, count = previewSampleCandidateCount) {
  const safeCount = Math.max(1, Math.round(Number(count)) || previewSampleCandidateCount);

  return Array.from({ length: safeCount }, (_item, index) => buildPreviewSampleCandidate(sampleData, index));
}

module.exports = {
  buildPreviewSampleCandidate,
  buildPreviewSampleCandidates,
  getSampleCandidatePhotoDataUrl,
  previewSampleCandidateCount,
  sampleCandidatePhotoFileId,
};
