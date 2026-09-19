const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runDataTagFormatStabilityCheck(client) {
  await evaluate(client, `(${setupDataTagFormatStability.toString()})()`);
  try {
    const initial = await evaluate(client, "window.tagFormatStability.inspect()");
    const expected = ["2026년 11월 28일 (토)", "2026.11.28", "오전 09시 00분"];
    assert.deepEqual(initial.texts, expected, "configured date/time examples must display on mount");
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    const deleted = await evaluate(client, "window.tagFormatStability.inspect()");
    assert.equal(deleted.hasCover, true, "deleting trailing whitespace must retain the cover tag");
    assert.equal(deleted.hasSpace, false, "fixture's trailing whitespace was not deleted");
    assert.ok(deleted.observed.length > 0, "native deletion must exercise the input synchronization path");
    for (const texts of deleted.observed) assert.deepEqual(texts, expected, "unrelated deletion reset formatted samples during input sync");
    await client.send("Input.insertText", { text: " 수정" });
    const edited = await evaluate(client, "window.tagFormatStability.inspect()");
    assert.deepEqual(edited.texts, expected, "typing beside the cover tag reset another tag's format");
    assert.deepEqual(edited.formats, initial.formats, "editing changed stored format attributes");
    const reloaded = await evaluate(client, "window.tagFormatStability.reload()");
    assert.deepEqual(reloaded.texts, expected, "formatted samples must survive serialization and reload");
    assert.deepEqual(reloaded.formats, initial.formats);
  } finally {
    await evaluate(client, "window.tagFormatStability.dispose()");
  }
}

async function setupDataTagFormatStability() {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const { getDataTagViewOptions, setDataTagViewOptions } = await import("/client/features/template-editor/data-tags-view-options.js");
  const previousOptions = getDataTagViewOptions();
  setDataTagViewOptions({ showSampleData: true, showIcons: false });
  const token = (key, label, format = "", type = "") => `<span class="template-token" contenteditable="false" data-template-tag-value="${key}" data-template-tag-label="${label}"${format ? ` data-template-tag-format="${format}" data-template-tag-format-type="${type}"` : ""}>${label}</span>`;
  const template = { id: "format-stability", name: "경희대 표지", paperPreset: "A4", orientation: "portrait", layout: { pages: [{
    id: "format-cover", type: "cover", name: "표지", settings: { editorMode: "document", documentHtml:
      `<div class="template-doc"><table style="width:500px"><tr><td>${token("document.kyungheeCover", "경희대 표지")}&nbsp;<br></td></tr></table>` +
      `<table style="width:500px"><tr><td>고사일시</td><td>${token("candidate.examDate", "시험날짜", "YYYY년 MM월 DD일 (ddd)", "date")}</td></tr>` +
      `<tr><td>${token("candidate.examDate", "시험날짜", "YYYY.MM.DD", "date")}</td><td>${token("candidate.examStartTime", "시작시간", "A hh시 mm분", "time")}</td></tr></table></div>`,
    },
  }] } };
  const appState = { templateEditor: { dataTags: { groups: [] }, selectedPageId: "format-cover", template,
    dataTagSampleValues: { "candidate.examDate": "2026-11-28", "candidate.examStartTime": "09:00", "document.kyungheeCover": "건축학과(5년제) : 3005200001 ~ 3005200004" },
  } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  const formatted = () => [...surface.querySelectorAll("[data-template-tag-format]")];
  const observed = [];
  const onInput = (event) => {
    if (event.target === surface) observed.push(formatted().map((el) => el.textContent));
  };
  document.addEventListener("input", onInput);
  surface.focus();
  const cover = surface.querySelector('[data-template-tag-value="document.kyungheeCover"]');
  const range = document.createRange();
  range.setStart(cover.nextSibling, 1);
  range.collapse(true);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  const inspect = () => ({
    texts: formatted().map((el) => el.textContent),
    formats: formatted().map((el) => [el.dataset.templateTagFormatType, el.dataset.templateTagFormat]),
    observed,
    hasCover: !!surface.querySelector('[data-template-tag-value="document.kyungheeCover"]'),
    hasSpace: surface.querySelector('td').textContent.endsWith("\u00a0"),
  });
  window.tagFormatStability = {
    inspect,
    async reload() {
      editor.setHtml(editor.getHtml());
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return inspect();
    },
    dispose() {
      document.removeEventListener("input", onInput);
      unmountTemplateEditorRuntime();
      setDataTagViewOptions(previousOptions);
    },
  };
}

module.exports = { runDataTagFormatStabilityCheck };
