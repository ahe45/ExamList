const test = require("node:test");
const assert = require("node:assert/strict");

const { createEditorToolbarMarkupRenderer } = require("./toolbar-markup.js");

function createRenderer() {
  return createEditorToolbarMarkupRenderer({
    EDITOR_TOOLBAR_DEFAULT_TEXT_COLOR: "#111827",
    EDITOR_TOOLBAR_FONT_OPTIONS: [{ value: "Noto Sans KR", label: "Noto Sans KR" }],
    EDITOR_TOOLBAR_FONT_SIZE_OPTIONS: [10, 11, 12, 14],
    EDITOR_TOOLBAR_ICON_MARKUP: new Proxy({}, { get: () => "" }),
    EDITOR_TOOLBAR_SHADING_COLOR_PRESETS: [],
    EDITOR_TOOLBAR_TEXT_COLOR_PRESETS: [],
    isEditorToolbarPresetFontSize: (value) => [10, 11, 12, 14].includes(Number(value)),
    normalizeEditorToolbarColorValue: (value, fallbackValue = "#000000") => value || fallbackValue,
  });
}

test("font size dropdown renders the pt unit inside the focus-preserving button", () => {
  const renderer = createRenderer();
  const html = renderer.renderEditorToolbarInner({
    fontFamilyId: "fontFamily",
    fontSizeId: "fontSize",
    fontSizeValue: 14,
  });

  assert.match(
    html,
    /class="template-toolbar-combo-value template-toolbar-font-size-value"[\s\S]*<span data-editor-font-size-current>14<\/span>\s*<span class="template-toolbar-combo-unit" aria-hidden="true">pt<\/span>/,
  );
  assert.doesNotMatch(html, /template-toolbar-value-unit/);
});
