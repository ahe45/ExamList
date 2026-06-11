const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateLayout } = require("./layout");

test("normalizeTemplateLayout keeps pages and text element config", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "문서 제목",
                style: {
                  fontSize: 22,
                },
              },
              height: 48,
              type: "dataText",
              width: 240,
              x: 100,
              y: 120,
            },
          ],
          type: "cover",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "기본 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-1",
  );

  assert.equal(layout.id, "template-1");
  assert.equal(layout.pages.length, 1);
  assert.equal(layout.pages[0].elements[0].type, "dataText");
  assert.equal(layout.pages[0].elements[0].config.style.fontSize, 22);
});

test("normalizeTemplateLayout allows compact text line height", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "좁은 줄간격",
                style: {
                  lineHeight: 0.75,
                },
              },
              height: 48,
              type: "dataText",
              width: 240,
              x: 100,
              y: 120,
            },
          ],
          type: "cover",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "줄간격 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-line-height",
  );

  assert.equal(layout.pages[0].elements[0].config.style.lineHeight, 0.75);
});

test("normalizeTemplateLayout allows expanded text line height", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                content: "넓은 줄간격",
                style: {
                  lineHeight: 5,
                },
              },
              height: 80,
              type: "dataText",
              width: 240,
              x: 100,
              y: 120,
            },
          ],
          type: "cover",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "줄간격 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-expanded-line-height",
  );

  assert.equal(layout.pages[0].elements[0].config.style.lineHeight, 5);
});

test("normalizeTemplateLayout preserves data tag settings", () => {
  const layout = normalizeTemplateLayout(
    {
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
          elements: [],
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "데이터 태그 설정 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-data-tag-settings",
  );

  assert.deepEqual(layout.dataTagSettings, {
    emptyValueData: {
      "candidate.name": "빈 성명",
    },
    sampleData: {
      "candidate.name": "샘플 성명",
    },
  });
});

test("normalizeTemplateLayout preserves generation unit priority fields", () => {
  const layout = normalizeTemplateLayout(
    {
      generation: {
        unitFields: ["date", "periodCode", "roomCode", "name", "opt1"],
      },
      pages: [
        {
          elements: [],
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "custom",
      name: "생성 단위 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-generation-unit-fields",
  );

  assert.equal(layout.generation.unit, "custom");
  assert.deepEqual(layout.generation.unitFields, ["date", "periodCode", "roomCode", "opt1"]);
});

test("normalizeTemplateLayout removes file name patterns from generation settings", () => {
  const layout = normalizeTemplateLayout(
    {
      generation: {
        fileNamePattern: "{{room.name}}.pdf",
        unitFields: ["date", "periodCode", "roomCode"],
      },
      pages: [
        {
          elements: [],
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "custom",
      name: "생성 단위 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-generation-file-name-pattern",
  );

  assert.equal(Object.prototype.hasOwnProperty.call(layout.generation, "fileNamePattern"), false);
  assert.deepEqual(layout.generation.unitFields, ["date", "periodCode", "roomCode"]);
});

test("normalizeTemplateLayout rejects empty pages", () => {
  assert.throws(
    () =>
      normalizeTemplateLayout(
        {},
        {
          description: "",
          generationUnit: "room",
          name: "템플릿",
          orientation: "portrait",
          paperPreset: "A4",
        },
      ),
    /편집할 페이지가 없습니다/,
  );
});
