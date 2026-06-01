const test = require("node:test");
const assert = require("node:assert/strict");

const { createEditorToolbarBorderMarkup } = require("./toolbar-border-markup.js");

function createRenderer() {
  return createEditorToolbarBorderMarkup({
    EDITOR_TOOLBAR_TEXT_COLOR_PRESETS: [],
    escapeEditorToolbarAttribute: (value) => String(value ?? ""),
    escapeEditorToolbarHtml: (value) => String(value ?? ""),
    renderEditorToolbarAttribute: (attributeName, attributeValue) => `${attributeName}="${attributeValue}"`,
    renderEditorToolbarColorPickerSection: () => '<button data-editor-color-toggle="borderColor" type="button">색상</button>',
  });
}

test("table border width renders as a focus-preserving dropdown", () => {
  const renderer = createRenderer();
  const html = renderer.renderEditorToolbarBorderSection({
    tableActionAttr: "data-template-table-action",
    borderTargetId: "borderTarget",
    borderStyleId: "borderStyle",
    borderWidthId: "borderWidth",
    borderColorId: "borderColor",
  });

  assert.match(html, /class="template-toolbar-border-width-combo"/);
  assert.match(html, /id="borderWidth" type="hidden"/);
  assert.match(html, /data-editor-border-width-toggle="borderWidth"/);
  assert.match(html, /data-editor-border-width-menu-for="borderWidth"/);
  assert.doesNotMatch(html, /class="[^"]*template-toolbar-border-width[^"]*"[^>]*type="number"/);

  ["0", "0.5", "1", "1.5", "2", "2.5", "3"].forEach((value) => {
    assert.match(html, new RegExp(`data-editor-border-width-option="${value.replace(".", "\\.")}"`));
  });
});
