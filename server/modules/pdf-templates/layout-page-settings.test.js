const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateLayout } = require("./layout");

test("page number formatting survives saving and rejects invalid CSS values", () => {
  const { normalizePageNumberSettings } = require("./layout-page-settings");
  const format = { fontFamily: "'GulimChe', 'Gulim', sans-serif", fontSizePt: 16.5,
    color: "#123abc", bold: false, italic: true, underline: true };
  const config = { enabled: true, position: "right", preset: "koreanPage", format };
  const metadata = { name: "서식", paperPreset: "A4", orientation: "portrait", generationUnit: "room" };
  const saved = normalizeTemplateLayout({ pages: [{ type: "content", settings: { pageNumber: config } }] }, metadata, "format-test");
  const reloaded = normalizeTemplateLayout(JSON.parse(JSON.stringify(saved)), metadata, "format-test");
  assert.deepEqual(reloaded.pages[0].settings.pageNumber, config);
  const invalid = normalizePageNumberSettings({ format: {
    fontFamily: "serif;position:fixed", fontSizePt: 999, color: "red;display:none",
  } });
  assert.equal(invalid.format.fontFamily, "'Noto Sans KR', sans-serif");
  assert.equal(invalid.format.fontSizePt, 72);
  assert.equal(invalid.format.color, "#000000");
});

test("normalizeTemplateLayout fixes recognition margins to the default template", () => {
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
    offsetXPt: 14.17,
    offsetYPt: 14.17,
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
              position: "left",
              preset: "pageCurrentTotalEnglish",
            },
          },
          type: "cover",
        },
        {
          settings: {
            pageNumber: {
              enabled: "true",
              position: "right",
              preset: "koreanPage",
            },
          },
          type: "content",
        },
        {
          settings: {
            pageNumber: {
              enabled: 0,
              position: "unsupported",
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
    position: "left",
    preset: "pageCurrentTotalEnglish",
  });
  assert.deepEqual(layout.pages[1].settings.pageNumber, {
    enabled: true,
    position: "right",
    preset: "koreanPage",
  });
  assert.deepEqual(layout.pages[2].settings.pageNumber, {
    enabled: false,
    position: "center",
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
