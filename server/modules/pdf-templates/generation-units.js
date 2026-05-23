const canonicalGenerationUnits = Object.freeze([
  "admissionCode",
  "seriesCode",
  "examDate",
  "periodCode",
  "unitCode",
  "buildingCode",
  "roomCode",
  "group",
]);

const legacyGenerationUnitAliasMap = Object.freeze({
  admission: "admissionCode",
  exam: "examDate",
  room: "roomCode",
  unit: "unitCode",
});

const supportedGenerationUnits = Object.freeze([
  "all",
  "admission",
  "admissionCode",
  "buildingCode",
  "custom",
  "exam",
  "examDate",
  "group",
  "periodCode",
  "room",
  "roomCode",
  "seriesCode",
  "unit",
  "unitCode",
]);

function normalizeGenerationUnit(value, fallback = "roomCode") {
  const normalizedValue = String(value || "").trim();
  const aliasedValue = legacyGenerationUnitAliasMap[normalizedValue] || normalizedValue;

  return supportedGenerationUnits.includes(aliasedValue) ? aliasedValue : fallback;
}

function isRoomGenerationUnit(value) {
  return normalizeGenerationUnit(value, "") === "roomCode";
}

module.exports = {
  canonicalGenerationUnits,
  isRoomGenerationUnit,
  legacyGenerationUnitAliasMap,
  normalizeGenerationUnit,
  supportedGenerationUnits,
};
