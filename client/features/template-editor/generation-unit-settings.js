import { candidateGridColumns } from "../candidates/candidate-table-model.js";

export const generationUnitPriorityDefaults = Object.freeze(["date", "periodCode", "roomCode"]);
export const generationUnitPriorityMaximum = 5;
export const generationUnitPriorityMinimumRows = 4;

const excludedGenerationUnitFieldKeys = new Set([
  "birth",
  "designatedSort",
  "examineeNo",
  "name",
  "temporaryNo",
]);

const generationUnitFieldLabelOverrides = Object.freeze({
  date: "날짜",
  periodCode: "교시 코드",
  roomCode: "고사실 코드",
});

export function getGenerationUnitFieldOptions() {
  return candidateGridColumns
    .filter((column) => {
      const key = String(column?.key || "").trim();

      return key && !excludedGenerationUnitFieldKeys.has(key);
    })
    .map((column) => {
      const key = String(column.key || "").trim();

      return Object.freeze({
        key,
        label: generationUnitFieldLabelOverrides[key] || String(column.label || key).trim() || key,
      });
    });
}

function getGenerationUnitFieldOptionKeySet() {
  return new Set(getGenerationUnitFieldOptions().map((option) => option.key));
}

export function normalizeGenerationUnitFields(fields = [], fallback = generationUnitPriorityDefaults) {
  const optionKeySet = getGenerationUnitFieldOptionKeySet();
  const normalizedFields = [];

  (Array.isArray(fields) ? fields : [])
    .map((field) => String(field || "").trim())
    .filter(Boolean)
    .forEach((field) => {
      if (
        optionKeySet.has(field) &&
        !normalizedFields.includes(field) &&
        normalizedFields.length < generationUnitPriorityMaximum
      ) {
        normalizedFields.push(field);
      }
    });

  if (normalizedFields.length) {
    return normalizedFields;
  }

  return fallback === null ? [] : normalizeGenerationUnitFields(fallback, null);
}

export function getTemplateGenerationUnitFields(template = {}) {
  return normalizeGenerationUnitFields(template?.layout?.generation?.unitFields);
}

export function getGenerationUnitFieldLabel(field = "") {
  const normalizedField = String(field || "").trim();
  const option = getGenerationUnitFieldOptions().find((item) => item.key === normalizedField);

  return option?.label || normalizedField;
}

export function formatGenerationUnitFieldsSummary(fields = []) {
  const normalizedFields = normalizeGenerationUnitFields(fields);

  return normalizedFields.map(getGenerationUnitFieldLabel).join(" > ");
}

export function getVisibleGenerationUnitPriorityRowCount(fields = []) {
  const normalizedFields = normalizeGenerationUnitFields(fields, []);
  const baseRowCount = Math.max(generationUnitPriorityMinimumRows, normalizedFields.length + 1);

  return Math.min(generationUnitPriorityMaximum, baseRowCount);
}

export function writeGenerationUnitSettingsToTemplate(template, fields = []) {
  if (!template || typeof template !== "object") {
    return [];
  }

  const normalizedFields = normalizeGenerationUnitFields(fields);

  template.generationUnit = "custom";
  template.layout = template.layout && typeof template.layout === "object" ? template.layout : {};
  template.layout.generation =
    template.layout.generation && typeof template.layout.generation === "object"
      ? template.layout.generation
      : {};
  template.layout.generation.unit = "custom";
  template.layout.generation.unitFields = normalizedFields;

  return normalizedFields;
}
