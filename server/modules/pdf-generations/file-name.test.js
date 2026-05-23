const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPdfGenerationFileName, formatTimestamp, sanitizeFileName } = require("./file-name");

test("sanitizeFileName replaces forbidden characters", () => {
  assert.equal(sanitizeFileName('면접/고사:101호?"<>|'), "면접_고사_101호_");
});

test("formatTimestamp returns compact file-safe timestamp", () => {
  assert.equal(formatTimestamp(new Date("2026-04-20T11:22:33+09:00")), "20260420_112233");
});

test("buildPdfGenerationFileName uses template pattern and appends pdf extension", () => {
  const fileName = buildPdfGenerationFileName({
    candidates: [
      {
        admissionTypeName: "학생부종합전형",
        examName: "면접고사",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T11:22:33+09:00"),
    schoolSettings: {
      academicYear: "2026",
      schoolName: "한국대학교",
    },
    template: {
      layout: {
        generation: {
          fileNamePattern: "{{school.academicYear}}_{{school.name}}_{{exam.name}}/{{room.name}}_수험생확인대장",
        },
      },
      name: "기본 템플릿",
    },
  });

  assert.equal(fileName, "2026학년도_한국대학교_면접고사_101호_수험생확인대장.pdf");
});

test("buildPdfGenerationFileName falls back to template name and timestamp", () => {
  const fileName = buildPdfGenerationFileName({
    candidates: [],
    generatedAt: new Date("2026-04-20T11:22:33+09:00"),
    template: {
      layout: {
        generation: {},
      },
      name: "기본 수험생확인대장",
    },
  });

  assert.equal(fileName, "기본 수험생확인대장_20260420_112233.pdf");
});
