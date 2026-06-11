const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPdfGenerationFileName, formatTimestamp, sanitizeFileName } = require("./file-name");

test("sanitizeFileName replaces forbidden characters", () => {
  assert.equal(sanitizeFileName('면접/고사:101호?"<>|'), "면접_고사_101호_");
});

test("formatTimestamp returns compact file-safe timestamp", () => {
  assert.equal(formatTimestamp(new Date("2026-04-20T11:22:33+09:00")), "20260420_112233");
});

test("buildPdfGenerationFileName ignores template file name patterns and uses the system pattern", () => {
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

  assert.equal(fileName, "기본 템플릿_2026학년도_면접고사_학생부종합전형_101호_20260420_112233.pdf");
});

test("buildPdfGenerationFileName falls back to the default download file name pattern", () => {
  const fileName = buildPdfGenerationFileName({
    candidates: [
      {
        admissionRoundName: "수시",
        admissionTypeName: "학생부종합전형",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T11:22:33+09:00"),
    schoolSettings: {
      academicYear: "2026",
    },
    template: {
      layout: {
        generation: {},
      },
      name: "기본 수험생확인대장",
    },
  });

  assert.equal(fileName, "기본 수험생확인대장_2026학년도_수시_학생부종합전형_101호_20260420_112233.pdf");
});

test("buildPdfGenerationFileName ignores legacy default template patterns", () => {
  const fileName = buildPdfGenerationFileName({
    candidates: [
      {
        admissionRoundName: "수시모집",
        admissionTypeName: "논술",
        examName: "수시모집",
        roomName: "502호",
      },
    ],
    generatedAt: new Date("2026-06-11T19:29:57+09:00"),
    schoolSettings: {
      academicYear: "2026",
    },
    template: {
      layout: {
        generation: {
          fileNamePattern: "{{exam.name}}_{{room.name}}_수험생확인대장.pdf",
        },
      },
      name: "숭실사이버대학",
    },
  });

  assert.equal(fileName, "숭실사이버대학_2026학년도_수시모집_논술_502호_20260611_192957.pdf");
});
