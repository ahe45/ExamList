const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function importClientModule(fileName) {
  return import(pathToFileURL(path.join(__dirname, fileName)).href);
}

test("template preview modal renders generated PDF viewer without zoom controls", async () => {
  const { renderTemplateEditorView } = await importClientModule("renderers.js");
  const html = renderTemplateEditorView({
    access: {
      permissions: {
        manageTemplates: true,
        previewTemplates: true,
      },
    },
    editor: {
      dataTags: { groups: [] },
      isPreviewLoading: false,
      isPreviewOpen: true,
      previewPdfUrl: "/api/pdf-generations/previews/pdf-generation-preview-1?name=preview.pdf",
      selectedPageId: "page-1",
      template: {
        id: "template-1",
        layout: {
          pages: [{ id: "page-1", name: "본문", settings: {}, type: "content" }],
        },
        name: "수험생확인대장",
      },
    },
  });

  assert.match(html, /title="PDF 미리보기"/);
  assert.match(html, /src="\/api\/pdf-generations\/previews\/pdf-generation-preview-1\?name=preview\.pdf"/);
  assert.doesNotMatch(html, /data-action="zoom-in-template-preview"/);
  assert.doesNotMatch(html, /data-template-preview-zoom-input/);
  assert.doesNotMatch(html, /data-action="zoom-out-template-preview"/);
});
