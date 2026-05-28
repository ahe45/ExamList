import { formatCount } from "../../app/number-format.js";
import {
  createEmptyPdfGenerationFilters,
  pdfGenerationFilterSteps,
} from "../pdf-generations/pdf-generation-flow.js";
import { getDataDeletionItems } from "./constants.js";

export const dataDeletionGenerationUnit = "roomCode";
export const dataDeletionOptionFields = Object.freeze(pdfGenerationFilterSteps.map((step) => step.key));
export const emptyTemplateSelectionQueryValue = "__none__";

const scopeLabels = Object.freeze(
  getDataDeletionItems().reduce((labels, item) => {
    labels[item.scope] = item.title;
    return labels;
  }, {}),
);

export function getEmptyPdfGenerationTableState() {
  return {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [{ key: "sequenceNumber", direction: "asc" }],
  };
}

export function normalizeDataDeletionScope(scope = "") {
  const normalizedScope = String(scope || "").trim();

  return getDataDeletionItems().some((item) => item.scope === normalizedScope) ? normalizedScope : "";
}

export function normalizeTemplateIds(values = []) {
  const rawValues = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map((value) => value.trim());

  return Array.from(new Set(rawValues.map((value) => String(value || "").trim()).filter(Boolean)));
}

export function createEmptyDataDeletionFilters() {
  return createEmptyPdfGenerationFilters();
}

export function createClosedDataDeletionModalState() {
  return {
    confirmationOpen: false,
    confirmationPhrase: "",
    errorMessage: "",
    filters: createEmptyDataDeletionFilters(),
    isOpen: false,
    isDeleting: false,
    isLoadingOptions: false,
    isLoadingSummary: false,
    options: {},
    selectedFilterKeys: [],
    selectedScope: "",
    selectedTemplateIds: [],
    summary: null,
    summaryErrorMessage: "",
  };
}

export function getDeletionImpact(scope = "", result = {}) {
  const normalizedScope = String(scope || "").trim();
  const hasFilters = Object.keys(result?.filters || {}).length > 0;

  return {
    candidates: normalizedScope === "all" || normalizedScope === "candidates",
    pdfGenerations: normalizedScope === "all" || normalizedScope === "pdf-generations",
    photos: normalizedScope === "all" || normalizedScope === "candidates" || normalizedScope === "photos",
    templates: normalizedScope === "templates" || (normalizedScope === "all" && !hasFilters),
  };
}

export function getDataDeletionScopeSummary(summary = null, scope = "") {
  const scopes = Array.isArray(summary?.scopes) ? summary.scopes : [];

  return scopes.find((candidate) => String(candidate?.scope || "") === scope) || null;
}

export function buildDataDeletionSuccessMessage(result = {}) {
  const scope = String(result.scope || "").trim();
  const label = String(result.scopeLabel || scopeLabels[scope] || "데이터");

  if (scope === "all") {
    return `전체 데이터를 삭제했습니다. 수험생 ${formatCount(result.deletedCandidateRecords)}건, 사진 ${formatCount(result.deletedCandidatePhotos)}건, 생성 PDF 데이터 ${formatCount(result.deletedPdfGenerationHistories)}건, 양식 ${formatCount(result.deletedPdfTemplates)}건이 정리되었습니다.`;
  }

  if (scope === "candidates") {
    return `수험생 데이터 ${formatCount(result.deletedCandidateRecords)}건을 삭제했습니다. 사진 ${formatCount(result.deletedCandidatePhotos)}건이 함께 정리되었습니다.`;
  }

  if (scope === "photos") {
    return `사진 데이터 ${formatCount(result.deletedCandidatePhotos)}건을 삭제했습니다.`;
  }

  if (scope === "pdf-generations") {
    return `생성 PDF 데이터 ${formatCount(result.deletedPdfGenerationHistories)}건과 일괄 생성 결과 ${formatCount(result.deletedPdfGenerationBatches)}건을 삭제했습니다.`;
  }

  if (scope === "templates") {
    return `양식 데이터 ${formatCount(result.deletedPdfTemplates)}건을 삭제했습니다.`;
  }

  return `${label}를 삭제했습니다.`;
}
