import test from "node:test";
import assert from "node:assert/strict";

import {
  DATA_DELETION_CONFIRMATION_PHRASE,
  renderDataDeletionModal,
  renderDataDeletionProgressOverlay,
  renderDataDeletionView,
} from "./renderers.js";

const access = Object.freeze({
  permissions: {
    deleteProjectData: true,
  },
});
const summary = Object.freeze({
  scopes: [
    Object.freeze({
      items: [
        Object.freeze({ count: 2, description: "개별 PDF 생성 결과", key: "pdfGenerationHistories", label: "PDF 생성 이력" }),
        Object.freeze({ count: 1, description: "일괄 생성 작업 기록", key: "pdfGenerationBatches", label: "일괄 생성 결과" }),
        Object.freeze({ count: 3, description: "저장된 PDF 및 압축 파일 참조", key: "pdfFiles", label: "PDF/ZIP 파일" }),
        Object.freeze({ count: 4, description: "생성/병합/재시도 등 작업 로그", key: "pdfAuditLogs", label: "PDF 작업 로그" }),
      ],
      scope: "pdf-generations",
      totalCount: 10,
    }),
    Object.freeze({
      items: [
        Object.freeze({ count: 5, description: "수험생 목록과 상세 정보", key: "candidateRecords", label: "수험생 기본 정보" }),
        Object.freeze({ count: 2, description: "사진 파일 및 수험생 사진 참조", key: "candidatePhotos", label: "사진 데이터" }),
      ],
      scope: "all",
      totalCount: 7,
    }),
  ],
});
const templateSummary = Object.freeze({
  counts: {
    pdfTemplateElements: 5,
    pdfTemplatePages: 2,
    pdfTemplateVersions: 1,
    pdfTemplates: 1,
  },
  scopes: [
    Object.freeze({
      items: [
        Object.freeze({ count: 1, description: "양식 기본 정보", key: "pdfTemplates", label: "양식" }),
        Object.freeze({ count: 2, description: "양식 페이지 구성", key: "pdfTemplatePages", label: "페이지" }),
        Object.freeze({ count: 5, description: "텍스트/표/이미지 등 배치 요소", key: "pdfTemplateElements", label: "요소" }),
        Object.freeze({ count: 1, description: "저장된 양식 버전 정보", key: "pdfTemplateVersions", label: "버전 스냅샷" }),
      ],
      scope: "templates",
      totalCount: 9,
    }),
  ],
  templates: {
    items: [
      Object.freeze({
        description: "고사실용",
        generationUnit: "roomCode",
        id: "template-1",
        layout: {
          pages: [
            {
              enabled: true,
              sortOrder: 0,
              type: "cover",
            },
            {
              settings: {
                candidateBlockGrid: {
                  columns: 2,
                  rows: 10,
                  sortDirection: "asc",
                  sortKey: "examineeNo",
                  variant: "photo",
                },
                otherRoomPage: {
                  enabled: true,
                },
              },
              sortOrder: 1,
              type: "content",
            },
          ],
        },
        name: "수험표",
        orientation: "portrait",
        paperPreset: "A4",
      }),
      Object.freeze({
        description: "일자별",
        generationUnit: "examDate",
        id: "template-2",
        layout: {
          pages: [
            {
              enabled: false,
              sortOrder: 0,
              type: "cover",
            },
            {
              settings: {
                candidateBlockGrid: {
                  sortDirection: "desc",
                  sortKey: "name",
                  variant: "list",
                },
                otherRoomPage: {
                  enabled: false,
                },
              },
              sortOrder: 1,
              type: "content",
            },
          ],
        },
        name: "명단",
        orientation: "landscape",
        paperPreset: "B4",
      }),
    ],
    selectedIds: ["template-1"],
  },
});

function getDataDeletionFilterFieldHtml(html, key) {
  return html.match(
    new RegExp(`<label\\b(?:(?!</label>)[\\s\\S])*data-data-deletion-modal-filter="${key}"(?:(?!</label>)[\\s\\S])*</label>`),
  )?.[0] || "";
}

test("data deletion view renders scoped delete cards with data summaries", () => {
  const html = renderDataDeletionView({
    access,
    dataDeletion: {
      activeScope: "",
      isDeleting: false,
      statusMessage: "",
      statusType: "",
    },
    school: {
      id: "school-1",
      name: "서울대학교",
    },
  });

  assert.match(html, /데이터 삭제/);
  assert.match(html, /서울대학교의 운영 데이터를 범위별로 삭제합니다/);
  assert.doesNotMatch(html, /data-deletion-guard-hint/);
  assert.doesNotMatch(html, /system-data-delete-guard-hint/);
  assert.match(html, /대상 데이터/);
  assert.match(html, /수험생 정보 및 사진/);
  assert.match(html, /PDF 생성 결과\/파일\/작업 로그/);
  assert.match(html, /페이지\/요소 구성/);
  assert.match(html, /data-action="open-data-deletion-modal"/);
  assert.match(html, /data-data-deletion-scope="all"/);
  assert.match(html, /data-data-deletion-scope="candidates"/);
  assert.match(html, /data-data-deletion-scope="photos"/);
  assert.match(html, /data-data-deletion-scope="pdf-generations"/);
  assert.match(html, /data-data-deletion-scope="templates"/);
});

test("data deletion view disables actions without permission", () => {
  const html = renderDataDeletionView({
    access: {
      permissions: {
        deleteProjectData: false,
      },
    },
    dataDeletion: {},
    school: {
      id: "school-1",
      name: "서울대학교",
    },
  });

  assert.match(html, /데이터 삭제 권한이 없습니다/);
  assert.match(html, /data-data-deletion-scope="all"[\s\S]*disabled/);
});

test("data deletion view keeps actions visible but disabled for read-only school access", () => {
  const html = renderDataDeletionView({
    access: {
      permissions: {
        deleteProjectData: true,
      },
      schoolAccess: {
        canManage: false,
        schoolId: "school-readonly",
      },
    },
    dataDeletion: {},
    school: {
      id: "school-readonly",
      name: "서울대학교",
    },
  });

  assert.doesNotMatch(html, /현재 학교는 읽기 전용입니다/);
  assert.match(html, /data-data-deletion-scope="all"[\s\S]*disabled/);
});

test("data deletion modal renders one-screen unit selection with target counts", () => {
  const html = renderDataDeletionModal(
    {
      isDeleting: false,
      modal: {
        confirmationPhrase: "",
        errorMessage: "",
        filters: {
          admission: "",
          campus: "",
          track: "",
        },
        isOpen: true,
        isLoadingSummary: false,
        options: {
          admission: [{ candidateCount: 5, value: "학생부종합" }],
          campus: [{ candidateCount: 5, value: "서울" }],
          series: [{ candidateCount: 3, value: "자연" }],
          track: [{ candidateCount: 5, value: "수시" }],
        },
        selectedFilterKeys: ["campus", "track", "admission"],
        selectedScope: "pdf-generations",
        summary,
      },
    },
    {
      access,
      school: {
        id: "school-1",
        name: "서울대학교",
      },
    },
  );

  assert.match(html, /데이터 삭제 설정/);
  assert.match(html, /삭제 단위/);
  assert.match(html, /data-data-deletion-modal-filter="campus"/);
  assert.match(html, /data-data-deletion-modal-filter="track"/);
  assert.match(html, /data-data-deletion-modal-filter="admission"/);
  assert.match(html, /data-data-deletion-modal-filter="series"/);
  assert.match(html, /data-data-deletion-modal-filter="room"/);
  assert.match(getDataDeletionFilterFieldHtml(html, "campus"), /<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.match(getDataDeletionFilterFieldHtml(html, "track"), /<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.match(getDataDeletionFilterFieldHtml(html, "admission"), /<\/select>\s*<span class="field-required-badge">필수<\/span>/);
  assert.doesNotMatch(getDataDeletionFilterFieldHtml(html, "series"), /field-required-badge/);
  const seriesSelect = html.match(/<select\s+name="series"[\s\S]*?>/)?.[0] || "";
  assert.doesNotMatch(seriesSelect, /disabled/);
  assert.doesNotMatch(html, /data-data-deletion-modal-scope-select/);
  assert.doesNotMatch(html, /<h3>삭제 대상 데이터<\/h3>/);
  assert.doesNotMatch(html, /data-deletion-modal-warning/);
  assert.doesNotMatch(html, /data-deletion-modal-notice/);
  assert.match(html, /data-deletion-modal-content-grid/);
  assert.doesNotMatch(html, /data-deletion-modal-content-grid is-template-scope/);
  assert.ok(html.indexOf("<h3>삭제 대상</h3>") < html.indexOf("<h3>삭제 단위</h3>"));
  assert.ok(html.indexOf("<h3>삭제 단위</h3>") < html.indexOf("<h3>삭제 대상 건수</h3>"));
  assert.match(html, /생성 PDF 데이터/);
  assert.match(html, /<strong>생성 PDF 데이터<\/strong>/);
  assert.match(html, /<strong>10건<\/strong>/);
  assert.match(html, /PDF 생성 이력/);
  assert.match(html, /2건/);
  assert.match(html, /PDF 작업 로그/);
  assert.match(html, /4건/);
  assert.doesNotMatch(html, /개별 PDF 생성 결과/);
  assert.doesNotMatch(html, /일괄 생성 작업 기록/);
  assert.doesNotMatch(html, /저장된 PDF 및 압축 파일 참조/);
  assert.doesNotMatch(html, /생성\/병합\/재시도 등 작업 로그/);
  assert.doesNotMatch(html, /선택한 삭제 단위에 해당하는 데이터만 집계합니다/);
  assert.doesNotMatch(html, /PDF 생성하기와 같은 기준/);
  assert.doesNotMatch(html, /data-deletion-modal-step/);
  assert.doesNotMatch(html, /next-data-deletion-modal-step/);
  assert.match(html, /type="submit" >삭제 실행/);
});

test("data deletion confirmation popup requires phrase for all data", () => {
  const html = renderDataDeletionModal(
    {
      isDeleting: false,
      modal: {
        confirmationOpen: true,
        confirmationPhrase: "",
        errorMessage: "",
        filters: {
          admission: "",
          campus: "",
          track: "",
        },
        isOpen: true,
        isLoadingSummary: false,
        selectedFilterKeys: ["campus", "track", "admission"],
        selectedScope: "all",
        summary,
      },
    },
    {
      access,
      school: {
        id: "school-1",
        name: "서울대학교",
      },
    },
  );

  assert.match(html, /전체 데이터 삭제 확인 문구/);
  assert.match(html, new RegExp(DATA_DELETION_CONFIRMATION_PHRASE));
  assert.match(html, /data-data-deletion-confirm-form/);
  assert.match(html, /type="submit" disabled>\s*삭제 실행/);
});

test("data deletion progress overlay shows target counts while deleting", () => {
  const html = renderDataDeletionProgressOverlay({
    activeScope: "pdf-generations",
    isDeleting: true,
    modal: {
      selectedScope: "pdf-generations",
      summary,
    },
    progressOverlay: {
      message: "삭제 결과를 현재 화면에 반영하고 있습니다.",
      stageLabel: "화면 갱신",
    },
  });

  assert.match(html, /busy-overlay data-deletion-progress-overlay/);
  assert.match(html, /data-data-deletion-progress-overlay/);
  assert.match(html, /생성 PDF 데이터 삭제 중/);
  assert.match(html, /총 10건/);
  assert.match(html, /PDF 생성 이력/);
  assert.match(html, /2건/);
  assert.match(html, /PDF 작업 로그/);
  assert.match(html, /4건/);
  assert.match(html, /progress-bar is-indeterminate/);
});

test("template data deletion modal renders templates as selectable deletion units", () => {
  const html = renderDataDeletionModal(
    {
      isDeleting: false,
      modal: {
        confirmationPhrase: "",
        errorMessage: "",
        filters: {},
        isOpen: true,
        isLoadingSummary: false,
        selectedScope: "templates",
        selectedTemplateIds: ["template-1"],
        summary: templateSummary,
      },
    },
    {
      access,
      school: {
        id: "school-1",
        name: "서울대학교",
      },
    },
  );

  assert.match(html, /data-data-deletion-template-id="template-1"/);
  assert.match(html, /data-deletion-modal-content-grid is-template-scope/);
  assert.match(html, /삭제할 양식/);
  assert.match(html, /<span class="field-required-badge">필수<\/span>/);
  assert.match(html, /data-data-deletion-template-id="template-2"/);
  assert.match(html, /data-data-deletion-template-select-all/);
  assert.match(html, /data-deletion-template-select-all-row/);
  assert.doesNotMatch(html, /data-deletion-template-option-all/);
  assert.match(html, /수험표/);
  assert.match(html, /명단/);
  assert.match(html, /1 \/ 2개 선택/);
  assert.match(html, /용지 속성/);
  assert.match(html, /A4 · 세로/);
  assert.match(html, /표지/);
  assert.match(html, /정렬/);
  assert.match(html, /수험번호 \/ 오름차순/);
  assert.doesNotMatch(html, /타입/);
  assert.doesNotMatch(html, /사진형 2열 × 10행/);
  assert.match(html, /생성 단위/);
  assert.match(html, /고사실/);
  assert.match(html, /타고사실/);
  assert.match(html, /<strong>양식 데이터<\/strong>/);
  assert.match(html, /<strong>9건<\/strong>/);
  assert.doesNotMatch(html, /양식 기본 정보/);
  assert.doesNotMatch(html, /양식 페이지 구성/);
  assert.doesNotMatch(html, /텍스트\/표\/이미지 등 배치 요소/);
  assert.doesNotMatch(html, /저장된 양식 버전 정보/);
  assert.doesNotMatch(html, /data-data-deletion-modal-filter="campus"/);
  assert.match(html, /type="submit" >삭제 실행/);
});
