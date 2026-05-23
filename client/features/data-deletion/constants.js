export const DATA_DELETION_CONFIRMATION_PHRASE = "전체 데이터 삭제";
export const dataDeletionGenerationUnit = "roomCode";

export const dataDeletionItems = Object.freeze([
  Object.freeze({
    description: "현재 학교의 운영 데이터를 모두 정리합니다.",
    impact: "현재 학교는 유지하고 수험생, 사진, 생성 PDF, 작업 로그, 양식 데이터를 모두 삭제합니다.",
    scope: "all",
    summary: Object.freeze(["수험생 정보 및 사진", "PDF 생성 결과/파일/작업 로그", "양식 및 편집 스냅샷"]),
    title: "전체 데이터",
  }),
  Object.freeze({
    description: "수험생 기본 정보와 연결 사진을 함께 삭제합니다.",
    impact: "수험생 목록과 연결된 사진을 삭제합니다. 양식과 생성 PDF 이력은 유지됩니다.",
    scope: "candidates",
    summary: Object.freeze(["수험생 기본 정보", "사진 파일 및 사진 참조"]),
    title: "수험생 데이터",
  }),
  Object.freeze({
    description: "수험생 기본 정보는 유지하고 사진만 비웁니다.",
    impact: "수험생 기본 정보는 유지하고 사진 파일과 사진 참조만 삭제합니다.",
    scope: "photos",
    summary: Object.freeze(["사진 파일", "수험생 사진 참조"]),
    title: "사진 데이터",
  }),
  Object.freeze({
    description: "생성 결과와 관련 파일 및 작업 로그를 삭제합니다.",
    impact: "PDF 생성 이력, 일괄 생성 결과, PDF/ZIP 파일, 작업 로그를 삭제합니다.",
    scope: "pdf-generations",
    summary: Object.freeze(["PDF 생성 이력", "일괄 생성 결과", "PDF/ZIP 파일", "PDF 작업 로그"]),
    title: "생성 PDF 데이터",
  }),
  Object.freeze({
    description: "양식과 편집 저장 정보를 삭제합니다.",
    impact: "양식 목록, 페이지/요소 구성, 버전 스냅샷을 삭제합니다. 수험생 데이터는 유지됩니다.",
    scope: "templates",
    summary: Object.freeze(["양식 목록", "페이지/요소 구성", "버전 스냅샷"]),
    title: "양식 데이터",
  }),
]);

export function getDataDeletionItems() {
  return dataDeletionItems;
}

export function normalizeDataDeletionScope(scope = "") {
  const normalizedScope = String(scope || "").trim();

  return dataDeletionItems.some((item) => item.scope === normalizedScope) ? normalizedScope : "";
}

export function getDataDeletionItem(scope = "") {
  const normalizedScope = normalizeDataDeletionScope(scope);

  return dataDeletionItems.find((item) => item.scope === normalizedScope) || null;
}

export function normalizeTemplateIds(values = []) {
  const rawValues = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map((value) => value.trim());

  return Array.from(new Set(rawValues.map((value) => String(value || "").trim()).filter(Boolean)));
}
