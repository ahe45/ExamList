const test = require("node:test");
const assert = require("node:assert/strict");

const { createTemplate, normalizeTemplateLayout, renderPreviewDocument } = require("./renderer-test-helpers");

test("renderPreviewDocument renders image, candidate photo, line, shapes, checkbox, signature, and page number elements", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          elements: [
            {
              config: {
                src: "https://example.com/banner.png",
              },
              height: 72,
              type: "image",
              width: 140,
              x: 40,
              y: 40,
            },
            {
              height: 96,
              type: "candidatePhoto",
              width: 72,
              x: 200,
              y: 40,
            },
            {
              config: {
                direction: "diagonal-down",
                style: {
                  strokeColor: "#223355",
                  strokeStyle: "dashed",
                  strokeWidth: 2,
                },
              },
              height: 40,
              type: "line",
              width: 140,
              x: 40,
              y: 140,
            },
            {
              config: {
                label: "확인 구역",
              },
              height: 56,
              type: "rect",
              width: 140,
              x: 40,
              y: 200,
            },
            {
              config: {
                label: "강조",
              },
              height: 56,
              type: "ellipse",
              width: 96,
              x: 200,
              y: 200,
            },
            {
              config: {
                checked: true,
                label: "본인 확인",
              },
              height: 28,
              type: "checkbox",
              width: 120,
              x: 40,
              y: 280,
            },
            {
              config: {
                label: "감독관 서명",
                placeholderText: "서명란",
              },
              height: 72,
              type: "signatureBox",
              width: 180,
              x: 40,
              y: 330,
            },
            {
              type: "pageNumber",
              width: 100,
              x: 440,
              y: 780,
            },
          ],
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
    "template-preview-rich-elements",
  );
  const result = renderPreviewDocument({
    candidates: [
      {
        examName: "면접고사",
        name: "홍길동",
        photoUrl: "data:image/png;base64,ZmFrZQ==",
        roomName: "101호",
      },
    ],
    generatedAt: new Date("2026-04-20T09:00:00+09:00"),
    template: createTemplate(layout),
  });

  assert.match(result.html, /preview-image-wrap/);
  assert.match(result.html, /https:\/\/example\.com\/banner\.png/);
  assert.match(result.html, /data:image\/png;base64,ZmFrZQ==/);
  assert.match(result.html, /preview-line-svg/);
  assert.match(result.html, /확인 구역/);
  assert.match(result.html, /preview-shape-ellipse/);
  assert.match(result.html, /preview-checkbox-box checked/);
  assert.match(result.html, /감독관 서명/);
  assert.match(result.html, />1 \/ 1</);
});
