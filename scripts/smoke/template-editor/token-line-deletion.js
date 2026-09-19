const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runTokenLineDeletionCheck(client) {
  const press = async (key, code, modifiers = 0) => {
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key, windowsVirtualKeyCode: code, modifiers });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: code, modifiers });
    await evaluate(client, "new Promise(resolve => requestAnimationFrame(resolve))");
  };
  for (const inCell of [false, true]) {
    for (const variant of ["paragraph", "empty", "wrapped", "div", "br", "blank-br", "double-br", "wrapped-br"]) {
      await evaluate(client, `(${setupTokenLineDeletion.toString()})(${JSON.stringify({ inCell, variant })})`);
      try {
        const before = await evaluate(client, "window.tokenLineDeletion.inspect()");
        await press("Delete", 46);
        const after = await evaluate(client, "window.tokenLineDeletion.inspect()");
        const context = `${inCell ? "cell" : "page"} ${variant}`;
        assert.deepEqual(after.tags, before.tags, `${context}: Delete before a line break must retain the tag and its format`);
        assert.ok(after.top < before.top - 5, `${context}: Delete must pull the tag up one line: ${JSON.stringify({ before, after })}`);
        await client.send("Input.insertText", { text: "추가" });
        const typed = await evaluate(client, "window.tokenLineDeletion.inspect()");
        assert.deepEqual(typed.tags, before.tags, `${context}: typing after joining must preserve the tag`);
        assert.ok(typed.textBeforeTag.includes("추가"), `${context}: typing must stay before the tag: ${JSON.stringify(typed)}`);
        await press("z", 90, 2);
        assert.deepEqual(after.otherText, before.otherText);
        await press("z", 90, 2);
        const undone = await evaluate(client, "window.tokenLineDeletion.inspect()");
        assert.deepEqual(undone.tags, before.tags, `${context}: undo must retain the tag`);
        assert.equal(undone.top, before.top, `${context}: undo must restore the line break`);
        await press("y", 89, 2);
        const redone = await evaluate(client, "window.tokenLineDeletion.inspect()");
        assert.deepEqual(redone.tags, before.tags);
        assert.equal(redone.top, after.top);
        const reloaded = await evaluate(client, "window.tokenLineDeletion.reload()");
        assert.deepEqual(reloaded.tags, before.tags);
        assert.equal(reloaded.top, after.top, `${context}: the joined line must persist`);
        await evaluate(client, "window.tokenLineDeletion.beforeTag()");
        await press("Delete", 46);
        assert.equal((await evaluate(client, "window.tokenLineDeletion.inspect()")).tags.length, 0,
          `${context}: Delete directly beside a tag must still delete it`);
      } finally { await evaluate(client, "window.tokenLineDeletion.dispose()"); }
    }
  }
}

async function setupTokenLineDeletion({ inCell, variant }) {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const token = '<span class="template-token" contenteditable="false" data-template-tag-value="candidate.examDate" data-template-tag-format-type="date" data-template-tag-format="YYYY년 MM월 DD일 (ddd)" style="font-size:16px;color:#112233">고사일시</span>';
  const content = variant === "br" ? `<p class="start">윗줄<br>${token}</p>`
    : variant === "blank-br" ? `<p class="start"><br>${token}</p>`
    : variant === "double-br" ? `<p class="start">윗줄<br><br>${token}</p>`
    : variant === "wrapped-br" ? `<p class="start"><b>윗줄</b><span><br></span><i>${token}</i></p>`
    : variant === "empty" ? `<p class="start"><br></p><p>${token}</p>`
    : variant === "wrapped" ? `<p class="start"><b>윗줄</b></p><p><i>${token}</i></p>`
    : variant === "div" ? `<div class="start">윗줄</div><div>${token}</div>`
    : `<p class="start">윗줄</p><p>${token}</p>`;
  const page = { id: "token-line", type: "cover", settings: { editorMode: "document", documentHtml:
    `<div class="template-doc" style="font-size:16px;line-height:24px">${inCell ? `<table style="width:600px"><tr><td style="vertical-align:top">${content}</td><td>옆 셀</td></tr></table>` : content}<p class="other">다른 내용</p></div>` } };
  const template = { id: "token-line-test", name: "태그 줄 병합", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { dataTags: { groups: [] }, selectedPageId: page.id, template } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  const select = (node, offset) => {
    surface.focus({ preventScroll: true });
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  };
  const start = surface.querySelector(".start");
  if (variant === "empty" || variant === "blank-br") select(start, 0);
  else {
    const text = ["wrapped", "wrapped-br"].includes(variant) ? start.firstChild.firstChild : start.firstChild;
    select(text, text.length);
  }
  const inspect = () => ({
    textBeforeTag: (() => {
      const tag = surface.querySelector("[data-template-tag-value]");
      if (!tag) return "";
      const range = document.createRange();
      range.selectNodeContents(surface.querySelector(".template-doc"));
      range.setEndBefore(tag);
      return range.toString();
    })(),
    tags: [...surface.querySelectorAll("[data-template-tag-value]")].map(el => ({ key: el.dataset.templateTagValue, format: el.dataset.templateTagFormat, text: el.textContent, fontSize: getComputedStyle(el).fontSize, color: getComputedStyle(el).color })),
    top: surface.querySelector("[data-template-tag-value]")?.getBoundingClientRect().top,
    otherText: [surface.querySelector(".other")?.textContent, surface.querySelector("td + td")?.textContent],
  });
  window.tokenLineDeletion = {
    inspect,
    beforeTag() {
      const tag = surface.querySelector("[data-template-tag-value]");
      select(tag.parentNode, [...tag.parentNode.childNodes].indexOf(tag));
    },
    async reload() { editor.setHtml(editor.getHtml()); await new Promise(resolve => requestAnimationFrame(resolve)); return inspect(); },
    dispose: unmountTemplateEditorRuntime,
  };
}

module.exports = { runTokenLineDeletionCheck };
