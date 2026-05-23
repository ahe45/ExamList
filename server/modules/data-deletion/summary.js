const { dataDeletionScopeDefinitions } = require("./filters");
const { parseJsonColumn } = require("./utils");

function createEmptyDeletionCounts() {
  return {
    candidatePhotos: 0,
    candidateRecords: 0,
    pdfFiles: 0,
    pdfAuditLogs: 0,
    pdfGenerationBatches: 0,
    pdfGenerationHistories: 0,
    pdfTemplateElements: 0,
    pdfTemplatePages: 0,
    pdfTemplateVersions: 0,
    pdfTemplates: 0,
  };
}

function getCountRowValue(rows = []) {
  const [row] = Array.isArray(rows) ? rows : [];

  return Number(row?.total) || 0;
}

function createSummaryItem(key, label, count, description = "") {
  return {
    count: Number(count) || 0,
    description,
    key,
    label,
  };
}

function mapTemplateDeletionItem(row = {}) {
  return {
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
    description: String(row.description || ""),
    generationUnit: String(row.generationUnit || ""),
    id: String(row.id || ""),
    layout: parseJsonColumn(row.layoutJson, null),
    latestVersionNo: Number(row.latestVersionNo) || 0,
    name: String(row.name || ""),
    orientation: String(row.orientation || ""),
    paperPreset: String(row.paperPreset || ""),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
  };
}

function sumSummaryItemCounts(items = []) {
  return (Array.isArray(items) ? items : []).reduce((total, item) => total + (Number(item?.count) || 0), 0);
}

function buildScopeSummary(scope, items = []) {
  const definition = dataDeletionScopeDefinitions[scope] || {};

  return {
    items,
    label: definition.label || scope,
    scope,
    totalCount: sumSummaryItemCounts(items),
  };
}

function buildDataDeletionScopeSummaries(counts = createEmptyDeletionCounts()) {
  const candidateItems = [
    createSummaryItem("candidateRecords", "수험생 기본 정보", counts.candidateRecords, "수험생 목록과 상세 정보"),
    createSummaryItem("candidatePhotos", "사진 데이터", counts.candidatePhotos, "사진 파일 및 수험생 사진 참조"),
  ];
  const photoItems = [
    createSummaryItem("candidatePhotos", "사진 데이터", counts.candidatePhotos, "사진 파일 및 수험생 사진 참조"),
  ];
  const pdfGenerationItems = [
    createSummaryItem("pdfGenerationHistories", "PDF 생성 이력", counts.pdfGenerationHistories, "개별 PDF 생성 결과"),
    createSummaryItem("pdfGenerationBatches", "일괄 생성 결과", counts.pdfGenerationBatches, "일괄 생성 작업 기록"),
    createSummaryItem("pdfFiles", "PDF/ZIP 파일", counts.pdfFiles, "저장된 PDF 및 압축 파일 참조"),
    createSummaryItem("pdfAuditLogs", "PDF 작업 로그", counts.pdfAuditLogs, "생성/병합/재시도 등 작업 로그"),
  ];
  const templateItems = [
    createSummaryItem("pdfTemplates", "양식", counts.pdfTemplates, "양식 기본 정보"),
    createSummaryItem("pdfTemplatePages", "페이지", counts.pdfTemplatePages, "양식 페이지 구성"),
    createSummaryItem("pdfTemplateElements", "요소", counts.pdfTemplateElements, "텍스트/표/이미지 등 배치 요소"),
    createSummaryItem("pdfTemplateVersions", "버전 스냅샷", counts.pdfTemplateVersions, "저장된 양식 버전 정보"),
  ];

  return [
    buildScopeSummary("all", [...candidateItems, ...pdfGenerationItems, ...templateItems]),
    buildScopeSummary("candidates", candidateItems),
    buildScopeSummary("photos", photoItems),
    buildScopeSummary("pdf-generations", pdfGenerationItems),
    buildScopeSummary("templates", templateItems),
  ];
}

module.exports = {
  buildDataDeletionScopeSummaries,
  buildScopeSummary,
  createEmptyDeletionCounts,
  createSummaryItem,
  getCountRowValue,
  mapTemplateDeletionItem,
  sumSummaryItemCounts,
};
