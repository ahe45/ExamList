const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("normalizePageSafeArea clamps margins and falls back per side", async () => {
  const { normalizePageSafeArea } = await importClientModule("layout-settings.js");

  const safeArea = normalizePageSafeArea(
    {
      bottom: "bad",
      left: -10,
      right: 500,
      top: 12.5,
    },
    {
      bottom: 33,
      left: 44,
      right: 55,
      top: 66,
    },
  );

  assert.deepEqual(safeArea, {
    bottom: 33,
    left: 0,
    right: 240,
    top: 12.5,
  });
});

test("applyTemplatePaperSettings updates paper and pages in pt", async () => {
  const { applyTemplatePaperSettings } = await importClientModule("layout-settings.js");
  const template = {
    layout: {
      pages: [
        { id: "page-1" },
        { id: "page-2", widthPt: 1, heightPt: 1 },
      ],
      paper: {},
    },
    orientation: "landscape",
    paperPreset: "A4",
  };

  applyTemplatePaperSettings(template);

  assert.equal(template.layout.paper.widthPt, 841.89);
  assert.equal(template.layout.paper.heightPt, 595.28);
  assert.equal(template.layout.paper.preset, "A4");
  assert.equal(template.layout.paper.orientation, "landscape");
  assert.deepEqual(
    template.layout.pages.map((page) => ({ heightPt: page.heightPt, widthPt: page.widthPt })),
    [
      { heightPt: 595.28, widthPt: 841.89 },
      { heightPt: 595.28, widthPt: 841.89 },
    ],
  );
});
