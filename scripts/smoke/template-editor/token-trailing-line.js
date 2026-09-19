const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runTokenTrailingLineCheck(client) {
  const press = async (key, code, modifiers = 0) => {
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode: code, modifiers });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: code, modifiers });
    await evaluate(client, "new Promise(resolve => requestAnimationFrame(resolve))");
  };
  for (const variant of ["seoul-cover", "empty", "paragraph", "wrapped", "br"]) {
    await evaluate(client, `(${setupTrailingLine.toString()})(${JSON.stringify(variant)})`);
    try {
      const before = await evaluate(client, "window.trailingLine.inspect()");
      await press("Backspace", 8);
      const after = await evaluate(client, "window.trailingLine.inspect()");
      assert.deepEqual(after.tag, before.tag, `${variant}: deleting the trailing line must retain the cover tag`);
      assert.equal(after.lines, before.lines - 1, `${variant}: remove only one blank line`);
      assert.equal(after.other, before.other);
      await client.send("Input.insertText", { text: "추가" });
      const typed = await evaluate(client, "window.trailingLine.inspect()");
      assert.deepEqual(typed.tag, before.tag, `${variant}: typing must not enter or replace the tag`);
      assert.ok(typed.afterTag.includes("추가"), `${variant}: caret must remain after the tag in the cell`);
      await press("z", 90, 2);
      await press("z", 90, 2);
      const undone = await evaluate(client, "window.trailingLine.inspect()");
      assert.deepEqual(undone.tag, before.tag);
      assert.equal(undone.lines, before.lines);
      await press("y", 89, 2);
      const reloaded = await evaluate(client, "window.trailingLine.reload()");
      assert.deepEqual(reloaded.tag, before.tag);
      assert.equal(reloaded.lines, after.lines);
      await evaluate(client, "window.trailingLine.afterTag()");
      await press("Backspace", 8);
      assert.equal((await evaluate(client, "window.trailingLine.inspect()")).tag, null,
        `${variant}: Backspace immediately beside the tag must still delete it`);
    } finally { await evaluate(client, "window.trailingLine.dispose()"); }
  }
}

async function setupTrailingLine(variant) {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const token = '<span class="template-token" contenteditable="false" data-template-tag-value="document.kyungheeCover" style="font-size:11pt;line-height:16px;color:rgb(0,0,0)">경희대 표지</span>';
  const content = variant === "paragraph" ? `<p>${token}</p><p class="blank"><br></p>`
    : variant === "empty" ? `${token}<p class="blank"></p>`
    : variant === "wrapped" ? `<b>${token}</b><p class="blank"><br></p>`
    : variant === "br" ? `${token}<br><br class="blank">`
    : `${token}<p class="blank"><br></p><p></p><p></p>`;
  const page = { id: "trailing-line", type: "cover", settings: { editorMode: "document", documentHtml:
    `<div class="template-doc"><table style="width:600px"><tr><td style="width:211px;height:417px;vertical-align:middle;font-size:11pt">${content}</td><td>다른 셀</td></tr></table></div>` } };
  const template = { id: "trailing-line-template", name: "표지 빈 줄", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { dataTags: { groups: [] }, selectedPageId: page.id, template } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  surface.focus();
  const blank = surface.querySelector(".blank");
  const range = document.createRange();
  if (variant === "br") range.setStartBefore(blank);
  else range.setStart(blank, 0);
  range.collapse(true);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  const inspect = () => {
    const cell = surface.querySelector("td");
    const tag = cell.querySelector("[data-template-tag-value]");
    const after = document.createRange();
    after.selectNodeContents(cell);
    if (tag) after.setStartAfter(tag);
    return {
      tag: tag ? { key: tag.dataset.templateTagValue, text: tag.textContent, font: getComputedStyle(tag).fontSize, color: getComputedStyle(tag).color } : null,
      lines: variant === "br" ? cell.querySelectorAll("br").length : cell.querySelectorAll("p").length,
      afterTag: after.toString(), other: surface.querySelector("td + td").textContent,
    };
  };
  window.trailingLine = {
    inspect,
    afterTag() {
      const tag = surface.querySelector("[data-template-tag-value]");
      surface.focus();
      const range = document.createRange();
      range.setStartAfter(tag);
      range.collapse(true);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    },
    async reload() { editor.setHtml(editor.getHtml()); await new Promise(resolve => requestAnimationFrame(resolve)); return inspect(); },
    dispose: unmountTemplateEditorRuntime,
  };
}

module.exports = { runTokenTrailingLineCheck };
