const {
  formatGenerationUnitFieldsLabel,
  getGenerationUnitFieldLabel,
  normalizeGenerationUnitFieldKey,
  normalizeGenerationUnitFields,
} = require("./generation-unit-fields");

const generationTargetCandidateFieldMap = Object.freeze({
  admission: "admissionCode",
  admissionCode: "admissionCode",
  buildingCode: "buildingCode",
  date: "date",
  exam: "examDate",
  examDate: "examDate",
  group: "groupName",
  periodCode: "periodCode",
  room: "roomCode",
  roomCode: "roomCode",
  seriesCode: "seriesCode",
  unit: "unitCode",
  unitCode: "unitCode",
});

const generationTargetStrategies = Object.freeze({
  admission: Object.freeze({ filterKey: "admissionCode", groupBy: "admissionCode", label: "전형코드" }),
  admissionCode: Object.freeze({ filterKey: "admissionCode", groupBy: "admissionCode", label: "전형코드" }),
  buildingCode: Object.freeze({ filterKey: "buildingCode", groupBy: "buildingCode", label: "고사건물코드" }),
  exam: Object.freeze({ filterKey: "examDate", groupBy: "examDate", label: "시험날짜" }),
  examDate: Object.freeze({ filterKey: "examDate", groupBy: "examDate", label: "시험날짜" }),
  group: Object.freeze({ filterKey: "group", groupBy: "group", label: "조" }),
  periodCode: Object.freeze({ filterKey: "periodCode", groupBy: "periodCode", label: "교시코드" }),
  room: Object.freeze({ filterKey: "roomCode", groupBy: "roomCode", label: "고사실코드" }),
  roomCode: Object.freeze({ filterKey: "roomCode", groupBy: "roomCode", label: "고사실코드" }),
  seriesCode: Object.freeze({ filterKey: "seriesCode", groupBy: "seriesCode", label: "계열코드" }),
  unit: Object.freeze({ filterKey: "unitCode", groupBy: "unitCode", label: "모집단위코드" }),
  unitCode: Object.freeze({ filterKey: "unitCode", groupBy: "unitCode", label: "모집단위코드" }),
});

function getCandidateFieldForGenerationUnitField(field = "") {
  const normalizedField = normalizeGenerationUnitFieldKey(field);

  return generationTargetCandidateFieldMap[normalizedField] || normalizedField;
}

function createCustomGenerationTargetStrategy(fields = []) {
  const normalizedFields = normalizeGenerationUnitFields(fields, null);

  if (!normalizedFields.length) {
    return null;
  }

  const targetFields = normalizedFields.map((field) => Object.freeze({
    key: field,
    label: getGenerationUnitFieldLabel(field),
  }));
  const lastField = normalizedFields[normalizedFields.length - 1];

  return Object.freeze({
    filterKey: lastField,
    groupBy: normalizedFields,
    label: formatGenerationUnitFieldsLabel(normalizedFields),
    targetFields: Object.freeze(targetFields),
  });
}

function normalizeTargetFilters(filters = {}) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [String(key || "").trim(), String(value ?? "").trim()])
      .filter(([key, value]) => key && value),
  );
}

function formatGenerationTargetName(filters = {}, targetFields = []) {
  const normalizedFilters = normalizeTargetFilters(filters);
  const parts = (Array.isArray(targetFields) ? targetFields : [])
    .map((field) => String(normalizedFilters[field.key] || "").trim())
    .filter(Boolean);
  const targetName = parts.join(" / ");

  return targetName ? targetName.slice(0, 120) : "";
}

function normalizeGenerationTargetItem(item = {}, strategy = null) {
  const filters = normalizeTargetFilters(item.filters);
  const targetName =
    formatGenerationTargetName(filters, strategy?.targetFields) ||
    String(item.name || "").trim() ||
    String(filters[strategy?.filterKey] || "").trim() ||
    "미분류";

  return {
    candidateCount: Number(item.candidateCount) || 0,
    filters,
    name: targetName.slice(0, 120),
  };
}

function resolveGenerationTargetNameFromCandidates(generationUnit = "", candidates = [], generationUnitFields = []) {
  const strategy = getGenerationTargetStrategy(generationUnit, generationUnitFields);

  if (!strategy || !Array.isArray(candidates) || !candidates.length) {
    return "";
  }

  if (strategy.targetFields) {
    const candidate = candidates[0] || {};
    const filters = Object.fromEntries(
      strategy.targetFields.map((field) => [
        field.key,
        String(candidate?.[field.key] ?? candidate?.[getCandidateFieldForGenerationUnitField(field.key)] ?? "").trim(),
      ]),
    );

    return formatGenerationTargetName(filters, strategy.targetFields);
  }

  const candidateField = generationTargetCandidateFieldMap[String(generationUnit || "").trim()];

  return candidateField ? String(candidates[0]?.[candidateField] || "").trim() : "";
}

function getGenerationTargetStrategy(generationUnit = "", generationUnitFields = []) {
  const customStrategy = createCustomGenerationTargetStrategy(generationUnitFields);

  if (customStrategy) {
    return customStrategy;
  }

  return generationTargetStrategies[String(generationUnit || "").trim()] || null;
}

function resolveGenerationRequestTargetName({
  candidates = [],
  filters = {},
  generationUnit = "",
  generationUnitFields = [],
  targetName = "",
}) {
  const requestedTargetName = String(targetName || "").trim();

  if (requestedTargetName) {
    return requestedTargetName;
  }

  const strategy = getGenerationTargetStrategy(generationUnit, generationUnitFields);

  if (strategy) {
    const targetNameFromFilters = formatGenerationTargetName(filters, strategy.targetFields);

    if (targetNameFromFilters) {
      return targetNameFromFilters;
    }

    const filteredTargetName = String(filters?.[strategy.filterKey] || "").trim();

    return filteredTargetName || resolveGenerationTargetNameFromCandidates(generationUnit, candidates, generationUnitFields);
  }

  if (generationUnit === "all" || generationUnit === "custom") {
    return "전체";
  }

  return "";
}

function normalizeTargetNames(targets) {
  return [...new Set((Array.isArray(targets) ? targets : []).map((target) => String(target || "").trim()).filter(Boolean))];
}

async function resolveGenerationTargets({ candidateService, createHttpError, generationUnit, generationUnitFields = [], filters = {} }) {
  const strategy = getGenerationTargetStrategy(generationUnit, generationUnitFields);

  if (!strategy) {
    if (generationUnit === "all" || generationUnit === "custom" || !generationUnit) {
      const candidatePayload = await candidateService.findCandidates({
        ...(filters && typeof filters === "object" ? filters : {}),
        limit: 1,
        page: 1,
      });

      return {
        generationUnit: String(generationUnit || "all"),
        items: [
          {
            candidateCount: Number(candidatePayload.total) || 0,
            name: "전체",
          },
        ],
        label: "전체",
      };
    }

    throw createHttpError(400, "지원하지 않는 생성 단위입니다.", "UNSUPPORTED_GENERATION_UNIT");
  }

  return {
    generationUnit: String(generationUnit || ""),
    items: (await candidateService.findCandidateGroups(filters, strategy.groupBy))
      .map((item) => normalizeGenerationTargetItem(item, strategy)),
    label: strategy.label,
  };
}

module.exports = {
  getGenerationTargetStrategy,
  normalizeTargetNames,
  resolveGenerationRequestTargetName,
  resolveGenerationTargetNameFromCandidates,
  resolveGenerationTargets,
};
