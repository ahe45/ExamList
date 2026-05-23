const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplate, normalizeTemplateLayout } = require("./renderer-test-helpers");
const { renderTemplateContentThumbnail } = require("./thumbnail");

test("renderTemplateContentThumbnail uses the first rendered content preview page", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          settings: {
            documentHtml: "<p>COVER_PAGE_MARKER</p>",
            editorMode: "document",
          },
          type: "cover",
        },
        {
          settings: {
            documentHtml: "<p>CONTENT_PAGE_MARKER {{candidate.name}}</p>",
            editorMode: "document",
            pageNumber: {
              enabled: true,
              preset: "numericCurrentTotal",
            },
          },
          type: "content",
        },
      ],
    },
    {
      description: "썸네일 테스트",
      generationUnit: "room",
      name: "썸네일 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-thumbnail-test",
  );
  const thumbnail = renderTemplateContentThumbnail(createTemplate(layout), {
    candidates: [
      {
        name: "홍길동",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-05-13T00:00:00.000Z"),
  });

  assert.ok(thumbnail);
  assert.equal(thumbnail.sourcePageNumber, 1);
  assert.match(thumbnail.html, /preview-page-document/);
  assert.match(thumbnail.html, /CONTENT_PAGE_MARKER 홍길동/);
  assert.doesNotMatch(thumbnail.html, /COVER_PAGE_MARKER/);
  assert.match(thumbnail.html, /body \{[\s\S]*padding: 0 !important;/);
});
