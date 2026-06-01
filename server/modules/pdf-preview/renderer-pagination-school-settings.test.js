const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplate, normalizeTemplateLayout, renderPreviewDocument } = require("./renderer-test-helpers");

test("renderPreviewDocument uses school academic year as admission year fallback", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "{{admission.year}} {{candidate.admissionYear}} {{school.academicYear}} {{school.name}}",
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
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-school-test",
  );
  const result = renderPreviewDocument({
    candidates: [{ examDate: "2025-10-21", name: "홍길동" }],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    schoolSettings: {
      academicYear: "2026",
      schoolName: "한국대학교",
    },
    template: createTemplate(layout),
  });

  assert.match(result.html, /2026 2026학년도 2026학년도 한국대학교/);
});

test("renderPreviewDocument uses school campus settings as candidate campus fallback", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "{{candidate.campusName}} {{candidate.campusCode}}",
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
      ],
    },
    {
      description: "미리보기 테스트",
      generationUnit: "room",
      name: "미리보기 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-preview-school-campus-test",
  );
  const result = renderPreviewDocument({
    candidates: [{ campusName: "", examDate: "2025-10-21", name: "홍길동" }],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    schoolSettings: {
      campusCode: "SEOUL",
      campusName: "서울캠퍼스",
      schoolName: "한국대학교",
    },
    template: createTemplate(layout),
  });

  assert.match(result.html, /서울캠퍼스 SEOUL/);
});
