const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateLayout } = require("./layout");

test("normalizeTemplateLayout normalizes table columns and pagination", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                columns: [
                  {
                    key: "candidate.name",
                    label: "성명",
                    width: 72,
                  },
                ],
                pagination: {
                  fillEmptyRows: false,
                  headerHeight: 30,
                  repeatHeader: true,
                  rowHeight: 40,
                },
              },
              height: 430,
              type: "table",
              width: 500,
            },
          ],
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "테이블 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-2",
  );

  assert.equal(layout.pages[0].elements[0].config.columns.length, 1);
  assert.equal(layout.pages[0].elements[0].config.pagination.rowHeight, 40);
  assert.equal(layout.pages[0].elements[0].config.rowsPerPage, 10);
});

test("normalizeTemplateLayout normalizes image, line, signature, and page number elements", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                fit: "invalid",
              },
              type: "image",
            },
            {
              config: {
                direction: "vertical",
                style: {
                  strokeColor: "#223355",
                  strokeStyle: "dotted",
                  strokeWidth: 2,
                },
              },
              type: "line",
            },
            {
              config: {
                label: "감독관",
              },
              type: "signatureBox",
            },
            {
              type: "pageNumber",
            },
          ],
          type: "content",
        },
      ],
    },
    {
      description: "설명",
      generationUnit: "room",
      name: "요소 템플릿",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-3",
  );

  const [imageElement, lineElement, signatureElement, pageNumberElement] = layout.pages[0].elements;

  assert.equal(imageElement.width, 140);
  assert.equal(imageElement.height, 120);
  assert.equal(imageElement.config.fit, "contain");
  assert.equal(lineElement.config.direction, "vertical");
  assert.equal(lineElement.config.style.strokeStyle, "dotted");
  assert.equal(signatureElement.config.placeholderText, "서명란");
  assert.equal(pageNumberElement.config.content, "{{page.current}} / {{page.total}}");
  assert.equal(pageNumberElement.config.style.textAlign, "center");
});
