const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeTemplateLayout } = require("./layout");

test("normalizeTemplateLayout normalizes candidate block grid settings", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          type: "content",
          settings: {
            candidateBlockGrid: {
              blockTemplateHtml: "<table><tbody><tr><td>{{candidate.name}}</td></tr></tbody></table>",
              columns: 8,
              fillEmptyBlocks: false,
              gapXPt: 6.25,
              gapYPt: 5.5,
              rows: 2,
              sortDirection: "desc",
              sortKey: "candidate.name",
              variant: "photo",
              xPt: 12.25,
              yPt: 18.5,
            },
          },
        },
        {
          type: "content",
          settings: {
            candidateBlockGrid: {
              enabled: true,
              variant: "photo",
            },
          },
        },
        {
          type: "cover",
          settings: {
            candidateBlockGrid: {
              enabled: true,
              variant: "photo",
            },
          },
        },
      ],
    },
    {
      description: "테스트",
      generationUnit: "room",
      name: "블록 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-block-grid-normalize",
  );

  assert.deepEqual(layout.pages[0].settings.candidateBlockGrid, {
    blockTemplateHtml: "<table><tbody><tr><td>{{candidate.name}}</td></tr></tbody></table>",
    columns: 4,
    enabled: false,
    fillEmptyBlocks: false,
    gapXPt: 6.25,
    gapYPt: 5.5,
    heightPt: 0,
    rows: 2,
    sortDirection: "desc",
    sortKey: "name",
    variant: "photo",
    widthPt: 0,
    xPt: 12.25,
    yPt: 18.5,
  });
  assert.equal(layout.pages[1].settings.candidateBlockGrid.variant, "photo");
  assert.equal(layout.pages[1].settings.candidateBlockGrid.columns, 2);
  assert.equal(layout.pages[1].settings.candidateBlockGrid.rows, 10);
  assert.equal(layout.pages[1].settings.candidateBlockGrid.sortKey, "examineeNo");
  assert.equal(layout.pages[1].settings.candidateBlockGrid.sortDirection, "asc");
  assert.equal(layout.pages[2].settings.candidateBlockGrid.enabled, false);
});

test("normalizeTemplateLayout removes smoke candidate block placeholder text", () => {
  const layout = normalizeTemplateLayout(
    {
      pages: [
        {
          type: "content",
          settings: {
            candidateBlockGrid: {
              blockTemplateHtml: "<table><tbody><tr><td>공통 블록</td></tr></tbody></table>",
              enabled: true,
            },
          },
        },
      ],
    },
    {
      description: "테스트",
      generationUnit: "room",
      name: "블록 테스트",
      orientation: "portrait",
      paperPreset: "A4",
    },
    "template-block-grid-smoke-cleanup",
  );

  assert.equal(layout.pages[0].settings.candidateBlockGrid.blockTemplateHtml, "<p><br></p>");
});
