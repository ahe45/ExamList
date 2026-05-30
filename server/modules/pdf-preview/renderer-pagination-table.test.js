const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplate, normalizeTemplateLayout, renderPreviewDocument } = require("./renderer-test-helpers");

test("renderPreviewDocument replaces tokens and paginates table rows", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "{{school.academicYear}} / {{school.name}} / {{school.code}} / {{exam.name}} / {{room.name}} / {{room.assignedCount}}명 / {{document.totalCandidates}}명",
              },
              height: 40,
              type: "dataText",
              width: 300,
              x: 48,
              y: 60,
            },
          ],
          type: "cover",
        },
        {
          elements: [
            {
              config: {
                columns: [
                  { key: "row.indexInPage", label: "순번", width: 48 },
                  { key: "candidate.name", label: "성명", width: 96 },
                ],
                pagination: {
                  fillEmptyRows: true,
                  headerHeight: 24,
                  repeatHeader: true,
                  rowHeight: 28,
                },
              },
              height: 92,
              type: "table",
              width: 320,
              x: 40,
              y: 80,
            },
          ],
          repeatable: true,
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      { examName: "면접고사", name: "홍길동", roomName: "101호" },
      { examName: "면접고사", name: "김영희", roomName: "101호" },
      { examName: "면접고사", name: "박민수", roomName: "101호" },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    schoolSettings: {
      academicYear: "2026",
      schoolCode: "SEOUL01",
      schoolName: "한국대학교",
    },
    template: createTemplate(layout),
  });

  assert.equal(result.pageCount, 3);
  assert.match(result.html, /2026학년도/);
  assert.match(result.html, /한국대학교/);
  assert.match(result.html, /SEOUL01/);
  assert.match(result.html, /면접고사/);
  assert.match(result.html, /101호/);
  assert.match(result.html, /3명/);
  assert.match(result.html, /홍길동/);
  assert.match(result.html, /김영희/);
  assert.match(result.html, /박민수/);
  assert.match(result.html, /<span class="template-data-fit" data-template-data-fit="true">홍길동<\/span>/);
  assert.match(result.pages[2]?.html || "", /<span class="template-data-fit" data-template-data-fit="true">3<\/span>[\s\S]*박민수/);
});

test("renderPreviewDocument renders assigned counts by exam room", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                columns: [
                  { key: "candidate.name", label: "성명", width: 96 },
                  { key: "candidate.roomName", label: "고사실", width: 72 },
                  { key: "room.assignedCount", label: "배정인원", width: 72 },
                ],
                pagination: {
                  fillEmptyRows: false,
                  headerHeight: 24,
                  repeatHeader: true,
                  rowHeight: 28,
                },
              },
              height: 128,
              type: "table",
              width: 320,
              x: 40,
              y: 80,
            },
          ],
          repeatable: true,
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "unit",
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-room-assigned-count-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      { buildingName: "본관", name: "홍길동", roomName: "101호" },
      { buildingName: "본관", name: "김영희", roomName: "101호" },
      { buildingName: "본관", name: "박민수", roomName: "102호" },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /홍길동[\s\S]*101호[\s\S]*2/);
  assert.match(result.html, /김영희[\s\S]*101호[\s\S]*2/);
  assert.match(result.html, /박민수[\s\S]*102호[\s\S]*1/);
});

test("renderPreviewDocument applies table column date format", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                columns: [
                  { format: "YYYY-MM-DD", key: "candidate.birthDate", label: "생년월일", width: 96 },
                  { key: 'candidate.phone | phone | mask: "phone"', label: "연락처", width: 112 },
                ],
                pagination: {
                  fillEmptyRows: false,
                  headerHeight: 24,
                  repeatHeader: true,
                  rowHeight: 28,
                },
              },
              height: 80,
              type: "table",
              width: 180,
              x: 40,
              y: 80,
            },
          ],
          repeatable: true,
          type: "content",
        },
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-format-test",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        birthDate: "2007.03.15",
        examName: "면접고사",
        phone: "01012345678",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /2007-03-15/);
  assert.match(result.html, /\*\*\*-\*\*\*\*-5678/);
  assert.doesNotMatch(result.html, /010-1234-5678/);
});
