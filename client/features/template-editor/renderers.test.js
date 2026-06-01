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

test("data tag settings modal isolates the editor runtime while open", async () => {
  const { renderTemplateEditorView } = await importClientModule("renderers.js");
  const html = renderTemplateEditorView({
    access: {
      permissions: {
        manageTemplates: true,
        previewTemplates: true,
      },
    },
    editor: {
      dataTagSampleModal: {
        draftEmptyValueData: {},
        draftValues: {},
        isOpen: true,
      },
      dataTags: { groups: [] },
      selectedPageId: "page-content",
      template: {
        id: "template-1",
        layout: {
          pages: [
            { enabled: true, id: "page-cover", name: "표지", settings: {}, type: "cover" },
            { id: "page-content", name: "본문", settings: {}, type: "content" },
          ],
        },
        name: "수험생확인대장",
      },
    },
  });

  assert.match(html, /template-editor-runtime-shell is-template-editor-modal-open/);
  assert.match(html, /id="templateEditorRuntimeHost" inert aria-hidden="true"/);
  assert.match(html, /class="modal-overlay data-tag-sample-modal-overlay"/);
});
