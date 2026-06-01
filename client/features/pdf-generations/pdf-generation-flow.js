export const pdfGenerationFilterSteps = Object.freeze([
  Object.freeze({ key: "track", label: "모집시기" }),
  Object.freeze({ key: "admission", label: "전형" }),
  Object.freeze({ key: "series", label: "계열" }),
  Object.freeze({ key: "unit", label: "모집단위" }),
  Object.freeze({ key: "major", label: "전공" }),
  Object.freeze({ key: "examDate", label: "시험날짜" }),
  Object.freeze({ key: "time", label: "시작시간" }),
  Object.freeze({ key: "endTime", label: "종료시간" }),
  Object.freeze({ key: "period", label: "교시" }),
  Object.freeze({ key: "building", label: "고사건물" }),
  Object.freeze({ key: "room", label: "고사실" }),
  Object.freeze({ key: "group", label: "조" }),
]);

export const pdfGenerationCreateSteps = Object.freeze([
  Object.freeze({ key: "template", label: "양식", type: "template" }),
  ...pdfGenerationFilterSteps.map((step) => Object.freeze({ ...step, type: "filter" })),
]);

export const pdfGenerationResultColumns = Object.freeze([
  Object.freeze({ key: "templateName", label: "양식" }),
  ...pdfGenerationFilterSteps,
]);

export const pdfGenerationCreateRequiredFilterKeys = Object.freeze(["track", "admission"]);
export const pdfGenerationCreateIndependentFilterKeys = Object.freeze(["track", "admission"]);

export const pdfGenerationUnitFilterKeyMap = Object.freeze({
  admission: "admission",
  admissionCode: "admission",
  buildingCode: "building",
  exam: "examDate",
  examDate: "examDate",
  group: "group",
  periodCode: "period",
  room: "room",
  roomCode: "room",
  seriesCode: "series",
  unit: "unit",
  unitCode: "unit",
});

export function clampPdfGenerationCreateStepIndex(value) {
  const parsedValue = Math.round(Number(value));

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.min(Math.max(parsedValue, 0), pdfGenerationCreateSteps.length - 1);
}

export function createEmptyPdfGenerationFilters() {
  return pdfGenerationFilterSteps.reduce((filters, step) => {
    filters[step.key] = "";
    return filters;
  }, {});
}

export function getPdfGenerationStepIndex(stepKey = "") {
  return pdfGenerationFilterSteps.findIndex((step) => step.key === stepKey);
}

export function getPdfGenerationUnitLastFilterIndex(generationUnit = "") {
  const filterKey = pdfGenerationUnitFilterKeyMap[String(generationUnit || "").trim()];

  if (!filterKey) {
    return pdfGenerationFilterSteps.length - 1;
  }

  const filterIndex = getPdfGenerationStepIndex(filterKey);

  return filterIndex >= 0 ? filterIndex : pdfGenerationFilterSteps.length - 1;
}

export function getPdfGenerationVisibleFilterSteps(generationUnit = "") {
  const seriesIndex = getPdfGenerationStepIndex("series");
  const unitLastFilterIndex = getPdfGenerationUnitLastFilterIndex(generationUnit);
  const lastFilterIndex = Math.max(unitLastFilterIndex, seriesIndex);

  return pdfGenerationFilterSteps.slice(0, lastFilterIndex + 1);
}

export function getPdfGenerationHiddenFilterSteps(generationUnit = "") {
  return pdfGenerationFilterSteps.slice(getPdfGenerationUnitLastFilterIndex(generationUnit) + 1);
}

export function normalizePdfGenerationSelectedFilterKeys(selectedFilterKeys = [], generationUnit = "") {
  const selectedKeySet = new Set(
    (Array.isArray(selectedFilterKeys) ? selectedFilterKeys : [])
      .map((key) => String(key || "").trim())
      .filter(Boolean),
  );
  const visibleKeySet = new Set(getPdfGenerationVisibleFilterSteps(generationUnit).map((step) => step.key));

  return pdfGenerationFilterSteps
    .map((step) => step.key)
    .filter((key) => visibleKeySet.has(key) && selectedKeySet.has(key));
}

export function isPdfGenerationCreateConditionComplete(selectedFilterKeys = [], generationUnit = "") {
  const selectedKeySet = new Set(normalizePdfGenerationSelectedFilterKeys(selectedFilterKeys, generationUnit));

  return pdfGenerationCreateRequiredFilterKeys.every((key) => selectedKeySet.has(key));
}

export function getPdfGenerationRevealedFilterSteps(selectedFilterKeys = [], generationUnit = "") {
  const visibleSteps = getPdfGenerationVisibleFilterSteps(generationUnit);
  const selectedKeySet = new Set(normalizePdfGenerationSelectedFilterKeys(selectedFilterKeys, generationUnit));
  const alwaysRevealedStepCount = Math.min(4, visibleSteps.length);
  const revealedSteps = visibleSteps.slice(0, alwaysRevealedStepCount);

  if (!visibleSteps.length || !selectedKeySet.has("admission")) {
    return revealedSteps;
  }

  const lastAlwaysRevealedStep = revealedSteps[revealedSteps.length - 1];

  if (!selectedKeySet.has(lastAlwaysRevealedStep?.key)) {
    return revealedSteps;
  }

  for (const step of visibleSteps.slice(alwaysRevealedStepCount)) {
    revealedSteps.push(step);

    if (!selectedKeySet.has(step.key)) {
      break;
    }
  }

  return revealedSteps;
}

export function resetPdfGenerationLowerFilters(filters = {}, stepKey = "") {
  const stepIndex = getPdfGenerationStepIndex(stepKey);
  const nextFilters = {
    ...createEmptyPdfGenerationFilters(),
    ...(filters && typeof filters === "object" ? filters : {}),
  };

  if (stepIndex < 0) {
    return nextFilters;
  }

  pdfGenerationFilterSteps.slice(stepIndex + 1).forEach((step) => {
    nextFilters[step.key] = "";
  });

  return nextFilters;
}

export function resetPdfGenerationLowerFilterSelections(selectedFilterKeys = [], stepKey = "", generationUnit = "") {
  const stepIndex = getPdfGenerationStepIndex(stepKey);
  const normalizedSelectedKeys = normalizePdfGenerationSelectedFilterKeys(selectedFilterKeys, generationUnit);

  if (stepIndex < 0) {
    return normalizedSelectedKeys;
  }

  return normalizedSelectedKeys.filter((key) => getPdfGenerationStepIndex(key) <= stepIndex);
}

export function resetPdfGenerationUnitLowerFilters(filters = {}, generationUnit = "") {
  const visibleSteps = getPdfGenerationVisibleFilterSteps(generationUnit);
  const visibleKeys = new Set(visibleSteps.map((step) => step.key));
  const nextFilters = {
    ...createEmptyPdfGenerationFilters(),
    ...(filters && typeof filters === "object" ? filters : {}),
  };

  pdfGenerationFilterSteps.forEach((step) => {
    if (!visibleKeys.has(step.key)) {
      nextFilters[step.key] = "";
    }
  });

  return nextFilters;
}

export function resetPdfGenerationFiltersAfterSelection(filters = {}, stepKey = "", generationUnit = "") {
  const normalizedStepKey = String(stepKey || "").trim();
  const nextFilters = {
    ...createEmptyPdfGenerationFilters(),
    ...(filters && typeof filters === "object" ? filters : {}),
  };

  if (pdfGenerationCreateIndependentFilterKeys.includes(normalizedStepKey)) {
    const firstDependentFilterIndex = getPdfGenerationStepIndex("series");

    pdfGenerationFilterSteps.slice(firstDependentFilterIndex).forEach((step) => {
      nextFilters[step.key] = "";
    });

    return resetPdfGenerationUnitLowerFilters(nextFilters, generationUnit);
  }

  return resetPdfGenerationUnitLowerFilters(
    resetPdfGenerationLowerFilters(nextFilters, normalizedStepKey),
    generationUnit,
  );
}

export function getPdfGenerationSelectedFilterKeysAfterSelection({
  generationUnit = "",
  selectedFilterKeys = [],
  stepKey = "",
  value = "",
} = {}) {
  const normalizedStepKey = String(stepKey || "").trim();
  const normalizedSelectedKeys = normalizePdfGenerationSelectedFilterKeys(selectedFilterKeys, generationUnit);
  const selectedKeySet = new Set();

  if (!pdfGenerationFilterSteps.some((step) => step.key === normalizedStepKey)) {
    return normalizedSelectedKeys;
  }

  if (pdfGenerationCreateIndependentFilterKeys.includes(normalizedStepKey)) {
    normalizedSelectedKeys
      .filter((key) => pdfGenerationCreateIndependentFilterKeys.includes(key))
      .forEach((key) => selectedKeySet.add(key));
    selectedKeySet.add(normalizedStepKey);

    if (normalizedStepKey === "admission") {
      selectedKeySet.add("track");
    }

    return normalizePdfGenerationSelectedFilterKeys([...selectedKeySet], generationUnit);
  }

  const stepIndex = getPdfGenerationStepIndex(normalizedStepKey);

  normalizedSelectedKeys
    .filter((key) => getPdfGenerationStepIndex(key) <= stepIndex)
    .forEach((key) => selectedKeySet.add(key));
  selectedKeySet.add(normalizedStepKey);

  return normalizePdfGenerationSelectedFilterKeys([...selectedKeySet], generationUnit);
}
