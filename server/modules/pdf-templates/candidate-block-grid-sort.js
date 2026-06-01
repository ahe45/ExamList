const candidateBlockGridSortOptions = Object.freeze([
  Object.freeze({ key: "designatedSort", label: "지정정렬" }),
  Object.freeze({ key: "track", label: "모집시기" }),
  Object.freeze({ key: "admission", label: "전형명" }),
  Object.freeze({ key: "admissionCode", label: "전형코드" }),
  Object.freeze({ key: "series", label: "계열명" }),
  Object.freeze({ key: "seriesCode", label: "계열코드" }),
  Object.freeze({ key: "unit", label: "모집단위명" }),
  Object.freeze({ key: "unitCode", label: "모집단위코드" }),
  Object.freeze({ key: "major", label: "전공명" }),
  Object.freeze({ key: "majorCode", label: "전공코드" }),
  Object.freeze({ key: "date", label: "시험날짜" }),
  Object.freeze({ key: "time", label: "시작시간" }),
  Object.freeze({ key: "endTime", label: "종료시간" }),
  Object.freeze({ key: "period", label: "교시명" }),
  Object.freeze({ key: "periodCode", label: "교시코드" }),
  Object.freeze({ key: "building", label: "고사건물명" }),
  Object.freeze({ key: "buildingCode", label: "고사건물코드" }),
  Object.freeze({ key: "room", label: "고사실명" }),
  Object.freeze({ key: "roomCode", label: "고사실코드" }),
  Object.freeze({ key: "examineeNo", label: "수험번호" }),
  Object.freeze({ key: "temporaryNo", label: "가번호" }),
  Object.freeze({ key: "name", label: "이름" }),
  Object.freeze({ key: "birth", label: "생년월일" }),
  Object.freeze({ key: "group", label: "조" }),
  Object.freeze({ key: "opt1", label: "OPT1" }),
  Object.freeze({ key: "opt2", label: "OPT2" }),
  Object.freeze({ key: "opt3", label: "OPT3" }),
  Object.freeze({ key: "opt4", label: "OPT4" }),
  Object.freeze({ key: "opt5", label: "OPT5" }),
]);
const candidateBlockGridSortKeys = new Set(candidateBlockGridSortOptions.map((option) => option.key));
const defaultCandidateBlockGridSortKey = "examineeNo";
const defaultCandidateBlockGridSortDirection = "asc";
const candidateBlockGridSortKeyAliases = Object.freeze({
  "candidate.admissionRoundName": "track",
  "candidate.admissionTypeCode": "admissionCode",
  "candidate.admissionTypeName": "admission",
  "candidate.birthDate": "birth",
  "candidate.buildingCode": "buildingCode",
  "candidate.buildingName": "building",
  "candidate.date": "date",
  "candidate.departmentCode": "unitCode",
  "candidate.departmentName": "unit",
  "candidate.designatedSort": "designatedSort",
  "candidate.examDate": "date",
  "candidate.examName": "track",
  "candidate.examNo": "examineeNo",
  "candidate.examStartTime": "time",
  "candidate.examEndTime": "endTime",
  "candidate.groupName": "group",
  "candidate.majorCode": "majorCode",
  "candidate.majorName": "major",
  "candidate.name": "name",
  "candidate.opt1": "opt1",
  "candidate.opt2": "opt2",
  "candidate.opt3": "opt3",
  "candidate.opt4": "opt4",
  "candidate.opt5": "opt5",
  "candidate.periodCode": "periodCode",
  "candidate.periodName": "period",
  "candidate.roomCode": "roomCode",
  "candidate.roomName": "room",
  "candidate.seriesCode": "seriesCode",
  "candidate.seriesName": "series",
  "candidate.temporaryNo": "temporaryNo",
});

function normalizeCandidateBlockGridSortKey(value) {
  const rawValue = String(value || "").trim();
  const aliasedValue = candidateBlockGridSortKeyAliases[rawValue] || rawValue;

  return candidateBlockGridSortKeys.has(aliasedValue) ? aliasedValue : defaultCandidateBlockGridSortKey;
}

function normalizeCandidateBlockGridSortDirection(value) {
  return String(value || "").trim().toLowerCase() === "desc" ? "desc" : defaultCandidateBlockGridSortDirection;
}

module.exports = {
  candidateBlockGridSortOptions,
  defaultCandidateBlockGridSortDirection,
  defaultCandidateBlockGridSortKey,
  normalizeCandidateBlockGridSortDirection,
  normalizeCandidateBlockGridSortKey,
};
