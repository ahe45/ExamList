export const templateGenerationUnitOptions = Object.freeze([
  Object.freeze({ label: "전형", value: "admissionCode" }),
  Object.freeze({ label: "계열", value: "seriesCode" }),
  Object.freeze({ label: "시험날짜", value: "examDate" }),
  Object.freeze({ label: "교시", value: "periodCode" }),
  Object.freeze({ label: "모집단위", value: "unitCode" }),
  Object.freeze({ label: "고사건물", value: "buildingCode" }),
  Object.freeze({ label: "고사실", value: "roomCode" }),
  Object.freeze({ label: "조", value: "group" }),
  Object.freeze({ label: "사용자 지정", value: "custom" }),
]);

const generationUnitLegacyAliasMap = Object.freeze({
  admission: "admissionCode",
  exam: "examDate",
  room: "roomCode",
  unit: "unitCode",
});

const generationUnitLabelMap = Object.freeze({
  admission: "전형",
  admissionCode: "전형",
  all: "전체",
  buildingCode: "고사건물",
  custom: "사용자 지정",
  exam: "시험날짜",
  examDate: "시험날짜",
  group: "조",
  periodCode: "교시",
  room: "고사실",
  roomCode: "고사실",
  seriesCode: "계열",
  unit: "모집단위",
  unitCode: "모집단위",
});

function isTemplateGenerationUnitValue(value) {
  return templateGenerationUnitOptions.some((option) => option.value === value);
}

export function normalizeTemplateGenerationUnitValue(value, fallback = "roomCode") {
  const normalizedValue = String(value || "").trim();
  const aliasedValue = generationUnitLegacyAliasMap[normalizedValue] || normalizedValue;

  return isTemplateGenerationUnitValue(aliasedValue) ? aliasedValue : fallback;
}

export function formatGenerationUnitLabel(value) {
  const normalizedValue = String(value || "").trim();
  const aliasedValue = generationUnitLegacyAliasMap[normalizedValue] || normalizedValue;

  return generationUnitLabelMap[aliasedValue] || generationUnitLabelMap[normalizedValue] || normalizedValue || "-";
}
