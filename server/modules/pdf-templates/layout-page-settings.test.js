const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateLayout } = require("./layout");

test("normalizeTemplateLayout normalizes page recognition marks", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            recognitionMarks: {
              enabled: "true",
              offsetXPt: 32.4,
              offsetYPt: -10,
              sizePt: 96,
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "인식 기준값 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-recognition",
  );

  assert.deepEqual(layout.pages[0].settings.recognitionMarks, {
    enabled: true,
    offsetXPt: 32.4,
    offsetYPt: 0,
    sizePt: 72,
  });
});

test("normalizeTemplateLayout normalizes page number settings", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            pageNumber: {
              enabled: true,
              preset: "pageCurrentTotalEnglish",
            },
          },
          type: "cover",
        },
        {
          settings: {
            pageNumber: {
              enabled: "true",
              preset: "koreanPage",
            },
          },
          type: "content",
        },
        {
          settings: {
            pageNumber: {
              enabled: 0,
              preset: "unsupported",
            },
          },
          type: "appendix",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "페이지 번호 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-page-number",
  );

  assert.deepEqual(layout.pages[0].settings.pageNumber, {
    enabled: false,
    preset: "pageCurrentTotalEnglish",
  });
  assert.deepEqual(layout.pages[1].settings.pageNumber, {
    enabled: true,
    preset: "koreanPage",
  });
  assert.deepEqual(layout.pages[2].settings.pageNumber, {
    enabled: false,
    preset: "numericCurrentTotal",
  });
});

test("normalizeTemplateLayout normalizes other room page settings", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            otherRoomPage: {
              enabled: "true",
            },
          },
          type: "cover",
        },
        {
          settings: {
            otherRoomPage: {
              enabled: "true",
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "타 고사실 페이지 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-other-room-page",
  );

  assert.deepEqual(layout.pages[0].settings.otherRoomPage, {
    enabled: false,
  });
  assert.deepEqual(layout.pages[1].settings.otherRoomPage, {
    enabled: true,
  });
});
