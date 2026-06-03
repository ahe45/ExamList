const crypto = require("crypto");

const { parseCandidateCsv } = require("./normalization-csv");
const { formatDateValue, normalizeDateForDb } = require("./normalization-dates");

function normalizeText(value, maximum = 120) {
  return String(value ?? "").trim().slice(0, maximum);
}

function normalizePositiveInteger(value, fallback, minimum = 1, maximum = 5000) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function normalizeCandidateFilter(rawFilter = {}) {
  return {
    admission: String(rawFilter.admission || "").trim(),
    admissionCode: String(rawFilter.admissionCode || rawFilter.admission_code || "").trim(),
    building: String(rawFilter.building || "").trim(),
    buildingCode: String(rawFilter.buildingCode || rawFilter.building_code || "").trim(),
    campus: String(rawFilter.campus || "").trim(),
    campusCode: String(rawFilter.campusCode || rawFilter.campus_code || "").trim(),
    examDate: String(rawFilter.examDate || rawFilter.date || "").trim(),
    group: String(rawFilter.group || "").trim(),
    keyword: String(rawFilter.keyword || "").trim(),
    limit: normalizePositiveInteger(rawFilter.limit, 12, 1, 5000),
    major: String(rawFilter.major || "").trim(),
    majorCode: String(rawFilter.majorCode || rawFilter.major_code || "").trim(),
    opt1: String(rawFilter.opt1 || "").trim(),
    opt2: String(rawFilter.opt2 || "").trim(),
    opt3: String(rawFilter.opt3 || "").trim(),
    opt4: String(rawFilter.opt4 || "").trim(),
    opt5: String(rawFilter.opt5 || "").trim(),
    page: normalizePositiveInteger(rawFilter.page, 1, 1, 10000),
    period: String(rawFilter.period || "").trim(),
    periodCode: String(rawFilter.periodCode || rawFilter.period_code || "").trim(),
    room: String(rawFilter.room || "").trim(),
    roomCode: String(rawFilter.roomCode || rawFilter.room_code || rawFilter.roomId || "").trim(),
    series: String(rawFilter.series || "").trim(),
    seriesCode: String(rawFilter.seriesCode || rawFilter.series_code || "").trim(),
    time: String(rawFilter.time || "").trim(),
    endTime: String(rawFilter.endTime || rawFilter.examEndTime || "").trim(),
    track: String(rawFilter.track || "").trim(),
    unit: String(rawFilter.unit || "").trim(),
    unitCode: String(rawFilter.unitCode || rawFilter.unit_code || "").trim(),
  };
}

function hashRecordKey(record) {
  return crypto
    .createHash("sha256")
    .update(
      [
        record.admissionYear || "",
        record.examDate || "",
        record.examineeNo || "",
        record.periodCode || "",
        record.admissionCode || "",
        record.name || "",
        record.birthDate || "",
      ].join("|"),
      "utf8",
    )
    .digest("hex")
    .slice(0, 32);
}

function normalizeCandidateRecordInput(input = {}, sourceType = "manual", schoolId = "school-default") {
  const raw = input.raw && typeof input.raw === "object" ? input.raw : input;
  const normalizedSchoolId = String(schoolId || input.schoolId || raw.schoolId || "school-default").trim() || "school-default";
  const record = {
    admission: normalizeText(raw.admission ?? input.admissionTypeName),
    admissionYear: normalizeText(raw.admissionYear ?? raw.admission_year ?? input.admissionYear, 20),
    admissionCode: normalizeText(raw.admissionCode ?? raw.admission_code ?? input.applicationNo),
    birthDate: normalizeDateForDb(raw.birthDate ?? raw.birth_date ?? input.birthDate),
    building: normalizeText(raw.building ?? input.buildingName),
    buildingCode: normalizeText(raw.buildingCode ?? raw.building_code ?? input.buildingCode),
    campus: normalizeText(raw.campus ?? raw.campusName ?? raw.campus_name ?? input.campusName),
    campusCode: normalizeText(raw.campusCode ?? raw.campus_code ?? input.campusCode),
    designatedSort: normalizeText(raw.designatedSort ?? raw.designated_sort ?? input.designatedSort),
    examDate: normalizeDateForDb(raw.examDate ?? raw.exam_date ?? input.examDate),
    examineeNo: normalizeText(raw.examineeNo ?? raw.examinee_no ?? input.examNo),
    groupName: normalizeText(raw.groupName ?? raw.group_name ?? raw.group ?? input.groupName),
    major: normalizeText(raw.major ?? input.majorName),
    majorCode: normalizeText(raw.majorCode ?? raw.major_code ?? input.majorCode),
    name: normalizeText(raw.name ?? input.name),
    opt1: normalizeText(raw.opt1 ?? raw.OPT1 ?? input.opt1, 255),
    opt2: normalizeText(raw.opt2 ?? raw.OPT2 ?? input.opt2, 255),
    opt3: normalizeText(raw.opt3 ?? raw.OPT3 ?? input.opt3, 255),
    opt4: normalizeText(raw.opt4 ?? raw.OPT4 ?? input.opt4, 255),
    opt5: normalizeText(raw.opt5 ?? raw.OPT5 ?? input.opt5, 255),
    period: normalizeText(raw.period ?? raw.periodName ?? raw.period_name ?? input.periodName),
    periodCode: normalizeText(raw.periodCode ?? raw.period_code ?? input.periodCode),
    photoMime: normalizeText(raw.photoMime ?? raw.photo_mime ?? input.photoMime, 120),
    photoName: normalizeText(raw.photoName ?? raw.photo_name ?? input.photoFileId, 255),
    room: normalizeText(raw.room ?? input.roomName),
    roomCode: normalizeText(raw.roomCode ?? raw.room_code ?? input.roomId),
    series: normalizeText(raw.series),
    seriesCode: normalizeText(raw.seriesCode ?? raw.series_code ?? input.seriesCode),
    temporaryNo: normalizeText(raw.temporaryNo ?? raw.temporary_no ?? input.temporaryNo),
    time: normalizeText(raw.time ?? input.examStartTime, 40),
    endTime: normalizeText(raw.endTime ?? raw.end_time ?? input.examEndTime, 40),
    track: normalizeText(raw.track ?? input.examName),
    unit: normalizeText(raw.unit ?? input.departmentName),
    unitCode: normalizeText(raw.unitCode ?? raw.unit_code ?? input.unitCode),
  };
  const sourceId =
    normalizeText(raw.id || input.sourceId || input.id || "", 255) ||
    `${sourceType}-${hashRecordKey(record)}`;

  return {
    ...record,
    id: `candidate-${crypto.createHash("sha256").update(`${normalizedSchoolId}:${sourceType}:${sourceId}`, "utf8").digest("hex").slice(0, 32)}`,
    schoolId: normalizedSchoolId,
    sourceId,
    sourceType,
  };
}

function toCandidateWorkbookRow(row = {}) {
  return {
    admission: String(row.admission || row.admissionTypeName || ""),
    admissionYear: String(row.admissionYear || row.admission_year || row.admissionYearName || ""),
    admissionCode: String(row.admissionCode || row.applicationNo || ""),
    birth: String(row.birthDate || row.birth || ""),
    building: String(row.building || row.buildingName || ""),
    buildingCode: String(row.buildingCode || ""),
    campus: String(row.campus || row.campusName || ""),
    campusCode: String(row.campusCode || ""),
    date: String(row.examDate || row.date || ""),
    designatedSort: String(row.designatedSort || ""),
    examineeNo: String(row.examineeNo || row.examNo || ""),
    group: String(row.groupName || row.group || ""),
    major: String(row.major || row.majorName || ""),
    majorCode: String(row.majorCode || ""),
    name: String(row.name || ""),
    opt1: String(row.opt1 || ""),
    opt2: String(row.opt2 || ""),
    opt3: String(row.opt3 || ""),
    opt4: String(row.opt4 || ""),
    opt5: String(row.opt5 || ""),
    period: String(row.period || row.periodName || ""),
    periodCode: String(row.periodCode || ""),
    room: String(row.room || row.roomName || ""),
    roomCode: String(row.roomCode || row.roomId || ""),
    series: String(row.series || row.raw?.series || ""),
    seriesCode: String(row.seriesCode || ""),
    temporaryNo: String(row.temporaryNo || ""),
    time: String(row.time || row.examStartTime || ""),
    endTime: String(row.endTime || row.examEndTime || ""),
    track: String(row.track || row.examName || ""),
    unit: String(row.unit || row.departmentName || ""),
    unitCode: String(row.unitCode || ""),
  };
}

function mapCandidateViewRow(row = {}) {
  const hasPhoto = Boolean(String(row.photoName || "").trim());
  const examDate = String(row.examDate || "");
  const birthDate = String(row.birthDate || "");

  return {
    id: String(row.id || ""),
    admission: String(row.admission || ""),
    admissionTypeCode: String(row.admissionCode || ""),
    admissionTypeName: String(row.admission || ""),
    admissionRoundName: String(row.track || ""),
    admissionYear: String(row.admissionYear || ""),
    admissionCode: String(row.admissionCode || ""),
    applicationNo: String(row.admissionCode || ""),
    birth: birthDate,
    birthDate,
    building: String(row.building || ""),
    buildingCode: String(row.buildingCode || ""),
    buildingName: String(row.building || ""),
    campus: String(row.campus || ""),
    campusCode: String(row.campusCode || ""),
    campusName: String(row.campus || ""),
    date: examDate,
    designatedSort: String(row.designatedSort || ""),
    departmentCode: String(row.unitCode || ""),
    departmentName: String(row.unit || ""),
    examDate,
    examName: String(row.track || ""),
    examNo: String(row.examineeNo || ""),
    examStartTime: String(row.time || ""),
    examEndTime: String(row.endTime || ""),
    examineeNo: String(row.examineeNo || ""),
    group: String(row.groupName || ""),
    groupName: String(row.groupName || ""),
    hasPhoto,
    major: String(row.major || ""),
    majorCode: String(row.majorCode || ""),
    majorName: String(row.major || ""),
    name: String(row.name || ""),
    opt1: String(row.opt1 || ""),
    opt2: String(row.opt2 || ""),
    opt3: String(row.opt3 || ""),
    opt4: String(row.opt4 || ""),
    opt5: String(row.opt5 || ""),
    period: String(row.period || ""),
    periodCode: String(row.periodCode || ""),
    periodName: String(row.period || ""),
    photoFileId: String(row.photoName || ""),
    photoUrl: "",
    photoVersion: row.photoVersion ? Number(row.photoVersion) || 0 : 0,
    room: String(row.room || ""),
    roomCode: String(row.roomCode || ""),
    roomName: String(row.room || ""),
    schoolId: String(row.schoolId || ""),
    series: String(row.series || ""),
    seriesCode: String(row.seriesCode || ""),
    seriesName: String(row.series || ""),
    sourceType: String(row.sourceType || ""),
    temporaryNo: String(row.temporaryNo || ""),
    time: String(row.time || ""),
    endTime: String(row.endTime || ""),
    track: String(row.track || ""),
    unit: String(row.unit || ""),
    unitCode: String(row.unitCode || ""),
  };
}

module.exports = {
  formatDateValue,
  mapCandidateViewRow,
  normalizeCandidateFilter,
  normalizeCandidateRecordInput,
  parseCandidateCsv,
  toCandidateWorkbookRow,
};
