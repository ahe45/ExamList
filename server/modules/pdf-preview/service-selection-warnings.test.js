const test = require("node:test");
const assert = require("node:assert/strict");

const { createPdfPreviewService } = require("./service");
const { buildPreviewWarnings, selectPreviewCandidates } = require("./renderer-test-helpers");

function createHttpError(statusCode, message, errorCode = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  return error;
}

test("selectPreviewCandidates trims mixed room data and warnings explain photo placeholders", () => {
  const selection = selectPreviewCandidates(
    [
      { name: "홍길동", roomCode: "R101", roomName: "101호" },
      { name: "김영희", roomCode: "R101", roomName: "101호" },
      { name: "박민수", roomCode: "R102", roomName: "102호" },
    ],
    "room",
  );
  const warnings = buildPreviewWarnings({
    candidates: selection.candidates,
    generationUnit: "room",
    layout: {
      pages: [
        {
          elements: [
            {
              config: {
                columns: [{ key: "candidate.photo", label: "사진", type: "photo", width: 60 }],
              },
              type: "table",
            },
          ],
        },
      ],
    },
    selectedGroupLabel: selection.selectedGroupLabel,
    trimmed: selection.trimmed,
  });

  assert.equal(selection.candidates.length, 2);
  assert.equal(selection.trimmed, true);
  assert.match(warnings[0], /첫 고사실코드 R101 기준/);
  assert.match(warnings[1], /사진 데이터가 없어/);
});

test("previewTemplate renders sample values when candidate data is empty", async () => {
  const service = createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return { items: [] };
      },
    },
    createHttpError,
    pdfTemplateService: {
      async getTemplateById() {
        return null;
      },
    },
    schoolSettingsService: {
      async getSchoolSettings() {
        return {
          academicYear: "2027",
          schoolName: "한국대학교",
        };
      },
    },
  });
  const payload = await service.previewTemplate({
    template: {
      generationUnit: "room",
      id: "template-empty-sample-preview",
      layout: {
        dataTagSettings: {
          sampleData: {
            "candidate.admissionRoundName": "수시",
            "candidate.admissionTypeName": "학생부종합전형",
            "candidate.roomName": "101호",
            "room.assignedCount": "25",
            "school.academicYear": "2027학년도",
          },
        },
        pages: [
          {
            settings: {
              documentHtml:
                '<div class="template-doc"><p>{{school.academicYear}} {{candidate.admissionRoundName}} {{candidate.admissionTypeName}} {{room.name}} {{room.assignedCount}}</p></div>',
              editorMode: "document",
            },
            type: "cover",
          },
        ],
      },
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(payload.candidateCount, 25);
  assert.match(payload.warnings[0], /샘플 데이터/);
  assert.match(payload.previewHtml, /2027학년도/);
  assert.match(payload.previewHtml, /수시/);
  assert.match(payload.previewHtml, /학생부종합전형/);
  assert.match(payload.previewHtml, /101호/);
  assert.match(payload.previewHtml, /25/);
});

test("previewTemplate can render actual candidates for generation previews", async () => {
  let receivedQuery = null;
  const service = createPdfPreviewService({
    candidateService: {
      async findCandidates(query) {
        receivedQuery = query;

        return {
          items: [
            {
              examNo: "26010001",
              name: "실제이름",
              roomCode: "R101",
              roomName: "101호",
            },
          ],
        };
      },
    },
    createHttpError,
    pdfTemplateService: {
      async getTemplateById() {
        return null;
      },
    },
  });
  const payload = await service.previewTemplate({
    filters: {
      roomCode: "R101",
    },
    previewMode: "generation",
    renderActualCandidates: true,
    sampleLimit: 500,
    schoolId: "school-actual-preview",
    template: {
      generationUnit: "roomCode",
      id: "template-actual-generation-preview",
      layout: {
        dataTagSettings: {
          sampleData: {
            "candidate.name": "샘플이름",
          },
        },
        pages: [
          {
            settings: {
              candidateBlockGrid: {
                enabled: true,
                sortDirection: "desc",
                sortKey: "name",
              },
              documentHtml: '<div class="template-doc"><p>{{candidate.name}}</p></div>',
              editorMode: "document",
            },
            type: "content",
          },
        ],
      },
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(payload.candidateCount, 1);
  assert.equal(receivedQuery.limit, 500);
  assert.equal(receivedQuery.page, 1);
  assert.equal(receivedQuery.roomCode, "R101");
  assert.equal(receivedQuery.schoolId, "school-actual-preview");
  assert.equal(receivedQuery.sortDirection, "desc");
  assert.equal(receivedQuery.sortKey, "name");
  assert.match(payload.previewHtml, /실제이름/);
  assert.doesNotMatch(payload.previewHtml, /샘플이름/);
});

test("previewTemplate includes the other room page for room generation previews", async () => {
  const service = createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return { items: [] };
      },
    },
    createHttpError,
    pdfTemplateService: {
      async getTemplateById() {
        return null;
      },
    },
  });
  const payload = await service.previewTemplate({
    template: {
      generationUnit: "room",
      id: "template-other-room-preview-service",
      layout: {
        generation: {
          unit: "room",
        },
        pages: [
          {
            repeatable: true,
            settings: {
              documentHtml:
                '<div class="template-doc"><p><span data-template-tag-value="candidate.name">#성명</span> <span data-template-tag-value="room.otherRoom">#타고사실</span></p></div>',
              editorMode: "document",
              otherRoomPage: {
                enabled: true,
              },
              pageNumber: {
                enabled: true,
                preset: "numericCurrentTotal",
              },
            },
            type: "content",
          },
        ],
      },
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(payload.candidateCount, 25);
  assert.equal(payload.pageCount, 2);
  assert.match(payload.previewHtml, /타고사실/);
  assert.match(payload.previewHtml, />1\/2</);
  assert.match(payload.previewHtml, />2\/2</);
});

test("previewTemplate includes the other room page for custom generation units containing room", async () => {
  const service = createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return { items: [] };
      },
    },
    createHttpError,
    pdfTemplateService: {
      async getTemplateById() {
        return null;
      },
    },
  });
  const payload = await service.previewTemplate({
    template: {
      generationUnit: "custom",
      id: "template-other-room-custom-preview-service",
      layout: {
        generation: {
          unit: "custom",
          unitFields: ["date", "periodCode", "roomCode"],
        },
        pages: [
          {
            repeatable: true,
            settings: {
              documentHtml:
                '<div class="template-doc"><p><span data-template-tag-value="candidate.name">#성명</span> <span data-template-tag-value="room.otherRoom">#타고사실</span></p></div>',
              editorMode: "document",
              otherRoomPage: {
                enabled: true,
              },
              pageNumber: {
                enabled: true,
                preset: "numericCurrentTotal",
              },
            },
            type: "content",
          },
        ],
      },
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(payload.candidateCount, 25);
  assert.equal(payload.pageCount, 2);
  assert.match(payload.previewHtml, /타고사실/);
  assert.match(payload.previewHtml, />1\/2</);
  assert.match(payload.previewHtml, />2\/2</);
});

test("previewTemplate uses provided data tag sample values", async () => {
  const service = createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return {
          items: [
            {
              admissionTypeName: "실제전형",
              examDate: "2026-10-21",
              examNo: "26010001",
              name: "실제이름",
              roomName: "201호",
            },
          ],
        };
      },
    },
    createHttpError,
    pdfTemplateService: {
      async getTemplateById() {
        return null;
      },
    },
    schoolSettingsService: {
      async getSchoolSettings() {
        return {
          academicYear: "2027",
          schoolName: "실제대학교",
        };
      },
    },
  });
  const payload = await service.previewTemplate({
    sampleData: {
      "candidate.name": "샘플이름",
      "room.assignedCount": "5",
      "school.name": "샘플대학교",
    },
    template: {
      generationUnit: "room",
      id: "template-sample-data-preview",
      layout: {
        pages: [
          {
            settings: {
              documentHtml:
                '<div class="template-doc"><p>{{school.name}} {{candidate.name}} {{room.assignedCount}}</p></div>',
              editorMode: "document",
            },
            type: "cover",
          },
        ],
      },
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(payload.candidateCount, 25);
  assert.match(payload.previewHtml, /샘플대학교/);
  assert.match(payload.previewHtml, /샘플이름/);
  assert.match(payload.previewHtml, /5/);
  assert.doesNotMatch(payload.previewHtml, /실제대학교/);
  assert.doesNotMatch(payload.previewHtml, /실제이름/);
});

test("previewTemplate uses layout sample data for candidate block values", async () => {
  const service = createPdfPreviewService({
    candidateService: {
      async findCandidates() {
        return {
          items: [
            {
              examNo: "26010001",
              name: "",
              roomName: "201호",
            },
          ],
        };
      },
    },
    createHttpError,
    pdfTemplateService: {
      async getTemplateById() {
        return null;
      },
    },
  });
  const payload = await service.previewTemplate({
    template: {
      generationUnit: "room",
      id: "template-empty-value-data-preview",
      layout: {
        dataTagSettings: {
          emptyValueData: {
            "candidate.name": "빈 성명",
          },
          sampleData: {
            "candidate.name": "샘플 성명",
          },
        },
        pages: [
          {
            repeatable: true,
            settings: {
              candidateBlockGrid: {
                blockTemplateHtml: '<table><tbody><tr><td><span data-template-tag-value="candidate.name">#성명</span></td></tr></tbody></table>',
                columns: 1,
                enabled: true,
                rows: 1,
                variant: "photo",
              },
              documentHtml: '<div class="template-doc"><div data-candidate-block-grid="true"></div></div>',
              editorMode: "document",
            },
            type: "content",
          },
        ],
      },
      name: "수험생확인대장",
      orientation: "portrait",
      paperPreset: "A4",
    },
  });

  assert.equal(payload.candidateCount, 25);
  assert.match(payload.previewHtml, /샘플 성명/);
  assert.doesNotMatch(payload.previewHtml, /빈 성명/);
});
