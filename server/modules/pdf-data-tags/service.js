const schoolTagDefinitions = Object.freeze([
  Object.freeze({ key: "school.name", label: "학교명", type: "string", example: "한국대학교" }),
  Object.freeze({ key: "school.code", label: "학교코드", type: "string", example: "SEOUL01" }),
]);

const roomTagDefinitions = Object.freeze([
  Object.freeze({ key: "room.assignedCount", label: "배정인원", type: "number", example: "24" }),
  Object.freeze({ key: "room.otherRoom", label: "타고사실", type: "string", example: "" }),
]);

const otherTagDefinitions = Object.freeze([
  Object.freeze({ key: "row.indexInPage", label: "순번", type: "number", example: "1" }),
]);

const candidateTagOrder = Object.freeze([
  "candidate.admissionYear",
  "candidate.admissionRoundName",
  "candidate.campusName",
  "candidate.campusCode",
  "candidate.admissionTypeName",
  "candidate.admissionTypeCode",
  "candidate.seriesName",
  "candidate.seriesCode",
  "candidate.departmentName",
  "candidate.departmentCode",
  "candidate.majorName",
  "candidate.majorCode",
  "candidate.examDate",
  "candidate.examStartTime",
  "candidate.examEndTime",
  "candidate.periodName",
  "candidate.periodCode",
  "candidate.buildingName",
  "candidate.buildingCode",
  "candidate.roomName",
  "candidate.roomCode",
  "candidate.examNo",
  "candidate.temporaryNo",
  "candidate.name",
  "candidate.birthDate",
  "candidate.groupName",
  "candidate.opt1",
  "candidate.opt2",
  "candidate.opt3",
  "candidate.opt4",
  "candidate.opt5",
  "candidate.opt6",
  "candidate.opt7",
  "candidate.opt8",
  "candidate.opt9",
  "candidate.opt10",
  "candidate.photo",
]);
const hiddenCandidateTagKeys = new Set(["candidate.designatedSort"]);

const candidateTagMetadata = Object.freeze({
  "candidate.admissionRoundName": Object.freeze({ label: "모집시기", type: "string", example: "수시" }),
  "candidate.admissionTypeCode": Object.freeze({ label: "전형코드", type: "string", example: "SU" }),
  "candidate.admissionTypeName": Object.freeze({ label: "전형명", type: "string", example: "학생부종합전형" }),
  "candidate.admissionYear": Object.freeze({ label: "학년도", type: "string", example: "2026학년도" }),
  "candidate.birthDate": Object.freeze({ label: "생년월일", type: "date", example: "2007.03.15" }),
  "candidate.buildingCode": Object.freeze({ label: "고사건물코드", type: "string", example: "BLD01" }),
  "candidate.buildingName": Object.freeze({ label: "고사건물명", type: "string", example: "본관" }),
  "candidate.campusCode": Object.freeze({ label: "캠퍼스코드", type: "string", example: "SEOUL" }),
  "candidate.campusName": Object.freeze({ label: "캠퍼스명", type: "string", example: "서울캠퍼스" }),
  "candidate.departmentCode": Object.freeze({ label: "모집단위코드", type: "string", example: "NUR" }),
  "candidate.departmentName": Object.freeze({ label: "모집단위명", type: "string", example: "간호학부" }),
  "candidate.examDate": Object.freeze({ label: "시험날짜", type: "date", example: "2026-10-21" }),
  "candidate.examNo": Object.freeze({ label: "수험번호", type: "string", example: "26010001" }),
  "candidate.examStartTime": Object.freeze({ label: "시작시간", type: "string", example: "09:00" }),
  "candidate.examEndTime": Object.freeze({ label: "종료시간", type: "string", example: "10:00" }),
  "candidate.groupName": Object.freeze({ label: "조", type: "string", example: "A조" }),
  "candidate.majorCode": Object.freeze({ label: "전공코드", type: "string", example: "NUR01" }),
  "candidate.majorName": Object.freeze({ label: "전공명", type: "string", example: "간호학전공" }),
  "candidate.name": Object.freeze({ label: "이름", type: "string", example: "홍길동" }),
  "candidate.opt1": Object.freeze({ label: "OPT1", type: "string", example: "옵션1" }),
  "candidate.opt2": Object.freeze({ label: "OPT2", type: "string", example: "옵션2" }),
  "candidate.opt3": Object.freeze({ label: "OPT3", type: "string", example: "옵션3" }),
  "candidate.opt4": Object.freeze({ label: "OPT4", type: "string", example: "옵션4" }),
  "candidate.opt5": Object.freeze({ label: "OPT5", type: "string", example: "옵션5" }),
  "candidate.opt6": Object.freeze({ label: "OPT6", type: "string", example: "옵션6" }),
  "candidate.opt7": Object.freeze({ label: "OPT7", type: "string", example: "옵션7" }),
  "candidate.opt8": Object.freeze({ label: "OPT8", type: "string", example: "옵션8" }),
  "candidate.opt9": Object.freeze({ label: "OPT9", type: "string", example: "옵션9" }),
  "candidate.opt10": Object.freeze({ label: "OPT10", type: "string", example: "옵션10" }),
  "candidate.periodCode": Object.freeze({ label: "교시코드", type: "string", example: "P1" }),
  "candidate.periodName": Object.freeze({ label: "교시명", type: "string", example: "1교시" }),
  "candidate.photo": Object.freeze({ label: "수험생 사진", type: "image", example: "사진 파일" }),
  "candidate.roomCode": Object.freeze({ label: "고사실코드", type: "string", example: "R101" }),
  "candidate.roomName": Object.freeze({ label: "고사실명", type: "string", example: "101호" }),
  "candidate.seriesCode": Object.freeze({ label: "계열코드", type: "string", example: "NAT" }),
  "candidate.seriesName": Object.freeze({ label: "계열명", type: "string", example: "자연" }),
  "candidate.temporaryNo": Object.freeze({ label: "가번호", type: "string", example: "A001" }),
});

const fallbackCandidateFieldMap = Object.freeze(
  candidateTagOrder.reduce((fieldMap, key) => {
    fieldMap[key] = "";
    return fieldMap;
  }, {}),
);

function formatSchoolAcademicYearLabel(value) {
  const academicYear = String(value || "").trim().replace(/\s*학년도\s*$/u, "").trim();

  return academicYear ? `${academicYear}학년도` : "";
}

function buildSchoolTags(schoolSettings = {}) {
  const schoolName = String(schoolSettings.schoolName || "").trim();
  const schoolCode = String(schoolSettings.schoolCode || schoolSettings.code || "").trim();
  const academicYear = formatSchoolAcademicYearLabel(schoolSettings.academicYear);

  return schoolTagDefinitions
    .map((tag) =>
      freezeTag({
        ...tag,
        example:
          tag.key === "school.name"
            ? schoolName || tag.example
            : tag.key === "school.code"
              ? schoolCode || tag.example
            : academicYear || tag.example,
      }),
    )
    .filter(isVisibleDataTag);
}

function buildRoomTags() {
  return roomTagDefinitions.map(freezeTag).filter(isVisibleDataTag);
}

function buildOtherTags() {
  return otherTagDefinitions.map(freezeTag).filter(isVisibleDataTag);
}

function freezeTag(tag) {
  return Object.freeze({
    example: String(tag.example || ""),
    key: String(tag.key || ""),
    label: String(tag.label || tag.key || ""),
    sourceColumn: String(tag.sourceColumn || ""),
    type: String(tag.type || "string"),
  });
}

function isVisibleDataTag(tag = {}) {
  const key = String(tag?.key || "").trim();

  return Boolean(key) && key !== "school.academicYear";
}

function createFallbackLabel(key) {
  return String(key || "")
    .replace(/^candidate\./, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function buildCandidateTags(fieldMap = {}, schoolSettings = {}) {
  const mapEntries = Object.entries(fieldMap && typeof fieldMap === "object" ? fieldMap : {});
  const schoolAdmissionYear = formatSchoolAcademicYearLabel(schoolSettings.academicYear);
  const schoolCampusCode = String(schoolSettings.campusCode || "").trim();
  const schoolCampusName = String(schoolSettings.campusName || "").trim();
  const orderedKeys = [
    ...candidateTagOrder.filter((key) => Object.prototype.hasOwnProperty.call(fieldMap, key)),
    ...mapEntries.map(([key]) => key).filter((key) => !candidateTagOrder.includes(key)),
  ];

  return orderedKeys
    .filter((key) => String(key || "").startsWith("candidate.") && !hiddenCandidateTagKeys.has(String(key || "").trim()))
    .map((key) => {
      const metadata = candidateTagMetadata[key] || {};

      return freezeTag({
        example:
          key === "candidate.admissionYear"
            ? schoolAdmissionYear || metadata.example || ""
            : key === "candidate.campusName"
              ? schoolCampusName || metadata.example || ""
              : key === "candidate.campusCode"
                ? schoolCampusCode || metadata.example || ""
                : metadata.example || "",
        key,
        label: metadata.label || createFallbackLabel(key),
        sourceColumn: fieldMap[key],
        type: metadata.type || "string",
      });
    })
    .filter(isVisibleDataTag);
}

function resolveCandidateFieldMap(getCandidateFieldMap) {
  if (typeof getCandidateFieldMap !== "function") {
    return fallbackCandidateFieldMap;
  }

  const fieldMap = getCandidateFieldMap();

  return fieldMap && typeof fieldMap === "object" && Object.keys(fieldMap).length
    ? fieldMap
    : fallbackCandidateFieldMap;
}

async function resolveSchoolSettings(getSchoolSettings, options = {}) {
  if (typeof getSchoolSettings !== "function") {
    return {};
  }

  try {
    return (await getSchoolSettings(options.schoolId || "")) || {};
  } catch (_error) {
    return {};
  }
}

function createPdfDataTagService({ getCandidateFieldMap, getSchoolSettings } = {}) {
  async function getCatalog(options = {}) {
    const candidateFieldMap = resolveCandidateFieldMap(getCandidateFieldMap);
    const schoolSettings = await resolveSchoolSettings(getSchoolSettings, options);

    return Object.freeze({
      groups: Object.freeze([
        Object.freeze({
          key: "school",
          label: "학교 설정",
          tags: Object.freeze(buildSchoolTags(schoolSettings)),
        }),
        Object.freeze({
          key: "candidate",
          label: "수험생 데이터 컬럼",
          tags: Object.freeze(buildCandidateTags(candidateFieldMap, schoolSettings)),
        }),
        Object.freeze({
          key: "room",
          label: "고사장 정보",
          tags: Object.freeze(buildRoomTags()),
        }),
        Object.freeze({
          key: "etc",
          label: "기타",
          tags: Object.freeze(buildOtherTags()),
        }),
      ]),
    });
  }

  return Object.freeze({
    getCatalog,
  });
}

module.exports = {
  buildCandidateTags,
  buildOtherTags,
  buildRoomTags,
  buildSchoolTags,
  createPdfDataTagService,
};
