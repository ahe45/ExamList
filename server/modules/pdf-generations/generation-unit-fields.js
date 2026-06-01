const defaultGenerationUnitFields = Object.freeze(["date", "periodCode", "roomCode"]);
const maxGenerationUnitFieldCount = 5;

const generationUnitFieldLabels = Object.freeze({
  admission: "전형명",
  admissionCode: "전형코드",
  building: "고사건물명",
  buildingCode: "고사건물코드",
  date: "날짜",
  endTime: "종료시간",
  examDate: "날짜",
  group: "조",
  major: "전공명",
  majorCode: "전공코드",
  opt1: "OPT1",
  opt2: "OPT2",
  opt3: "OPT3",
  opt4: "OPT4",
  opt5: "OPT5",
  period: "교시명",
  periodCode: "교시 코드",
  room: "고사실명",
  roomCode: "고사실 코드",
  series: "계열명",
  seriesCode: "계열코드",
  time: "시작시간",
  track: "모집시기",
  unit: "모집단위명",
  unitCode: "모집단위코드",
});

const supportedGenerationUnitFields = Object.freeze(Object.keys(generationUnitFieldLabels));

function normalizeGenerationUnitFieldKey(field = "") {
  const normalizedField = String(field || "").trim();

  return normalizedField === "examDate" ? "date" : normalizedField;
}

function normalizeGenerationUnitFields(fields = [], fallback = defaultGenerationUnitFields) {
  const normalizedFields = [];

  (Array.isArray(fields) ? fields : [])
    .map(normalizeGenerationUnitFieldKey)
    .filter(Boolean)
    .forEach((field) => {
      if (
        supportedGenerationUnitFields.includes(field) &&
        !normalizedFields.includes(field) &&
        normalizedFields.length < maxGenerationUnitFieldCount
      ) {
        normalizedFields.push(field);
      }
    });

  if (normalizedFields.length) {
    return normalizedFields;
  }

  return fallback === null ? [] : normalizeGenerationUnitFields(fallback, null);
}

function getGenerationUnitFieldLabel(field = "") {
  const normalizedField = normalizeGenerationUnitFieldKey(field);

  return generationUnitFieldLabels[normalizedField] || normalizedField;
}

function formatGenerationUnitFieldsLabel(fields = []) {
  return normalizeGenerationUnitFields(fields)
    .map(getGenerationUnitFieldLabel)
    .join(" / ");
}

function getTemplateGenerationUnitFields(template = {}, fallback = null) {
  return normalizeGenerationUnitFields(template?.layout?.generation?.unitFields, fallback);
}

module.exports = {
  defaultGenerationUnitFields,
  formatGenerationUnitFieldsLabel,
  generationUnitFieldLabels,
  getGenerationUnitFieldLabel,
  getTemplateGenerationUnitFields,
  maxGenerationUnitFieldCount,
  normalizeGenerationUnitFieldKey,
  normalizeGenerationUnitFields,
  supportedGenerationUnitFields,
};
