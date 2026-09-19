const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

// Use native Chromium input with both the embedded runtime and the application's
// document sync. A runtime-only check misses the application's caret cleanup.
async function runTokenTableTypingCheck(client) {
  for (const variant of ["td", "th", "wrapped", "trailing-text", "line-break"]) {
    await evaluate(client, `(${setupTokenTableTyping.toString()})(${JSON.stringify(variant)})`);
    try {
      for (const text of ["A", "B"]) {
        await client.send("Input.insertText", { text });
        const state = await evaluate(client, `window.tokenTableTyping.inspect()`);
        assert.equal(state.inCell, true, `${variant}: caret left the cell after ${text}: ${JSON.stringify(state)}`);
      }
      await client.send("Input.imeSetComposition", { text: "한", selectionStart: 1, selectionEnd: 1 });
      assert.equal((await evaluate(client, `window.tokenTableTyping.inspect()`)).inCell, true, `${variant}: IME left cell`);
      await client.send("Input.insertText", { text: "한글" });
      await evaluate(client, `new Promise(resolve => setTimeout(resolve, 30))`);
      const result = await evaluate(client, `window.tokenTableTyping.inspect()`);
      assert.equal(result.inCell, true, `${variant}: caret left cell after Korean input`);
      assert.ok(result.cellText.includes("AB한글"), `${variant}: inserted text was lost: ${JSON.stringify(result)}`);
      assert.equal(result.outsideText, "표 밖", `${variant}: typing changed the outside paragraph`);
      assert.equal(result.tokenText, "이름", `${variant}: typing changed the data tag`);
      assert.equal(result.hasStoredGuard, false, `${variant}: temporary caret leaked into saved HTML`);
    } finally {
      await evaluate(client, `window.tokenTableTyping.dispose()`);
    }
  }
}

async function setupTokenTableTyping(variant) {
  const { createDocumentHistoryRuntime } = await import("/client/features/template-editor/document-history-runtime.js");
  const { createSelectedPageDocumentHtmlSync } = await import("/client/features/template-editor/template-editor-document-sync.js");
  const { serializeEditableDocumentRoot } = await import("/client/features/template-editor/document-editor.js");
  const root = document.querySelector("#editor");
  root.replaceChildren();
  const token = '<span class="template-token" contenteditable="false" data-template-tag-value="@{이름}" data-template-tag-label="이름">이름</span>';
  const cellTag = variant === "th" ? "th" : "td";
  const content = variant === "wrapped" ? `<p><b>${token}</b></p>`
    : variant === "trailing-text" ? `${token} 기존 글`
    : variant === "line-break" ? `${token}<br>다음 줄` : token;
  const editor = await ExamListTemplateEditorRuntimeLoader.createTemplateEditor({
    baseUrl: "/client/template-editor-runtime/", root,
    initialHtml: `<div class="template-doc"><table style="width:500px"><tr><${cellTag}>${content}</${cellTag}></tr></table><p>표 밖</p></div>`,
    tags: [{ key: "candidate.name", label: "이름", token: "@{이름}" }],
  });
  const surface = root.querySelector("[data-template-editor-runtime-surface]");
  surface.dataset.pageId = "caret-test";
  const page = { id: "caret-test", type: "cover", settings: { documentHtml: editor.getHtml() } };
  const appState = { templateEditor: { selectedPageId: page.id, template: { layout: { pages: [page] } } } };
  const updateSelectedPageDocumentHtml = (html) => { page.settings.documentHtml = html; };
  const history = createDocumentHistoryRuntime({
    appState, getClosestDocumentSurface: (node) => surface.contains(node) ? surface : null,
    getDocumentSurfaceByPageId: () => surface, refreshDocumentEditorRuntime: () => {}, updateSelectedPageDocumentHtml,
  });
  const sync = createSelectedPageDocumentHtmlSync({
    appState, ...history, getDocumentSurfaceByPageId: () => surface,
    getLastValidDocumentHtml: () => "", rememberValidDocumentHtml: () => {},
    setDocumentOverflowState: () => {}, refreshDocumentEditorRuntime: () => {}, updateSelectedPageDocumentHtml,
  });
  let composing = false;
  const onStart = () => { composing = true; };
  const onEnd = () => { composing = false; };
  const onInput = (event) => {
    if (event.target === surface && !event.isComposing && !composing) sync({ render: false });
  };
  surface.addEventListener("compositionstart", onStart);
  surface.addEventListener("compositionend", onEnd);
  document.addEventListener("input", onInput);
  surface.focus();
  const range = document.createRange();
  range.setStartAfter(surface.querySelector(".template-token"));
  range.collapse(true);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  history.rememberDocumentSelection();
  window.tokenTableTyping = {
    inspect() {
      const selection = getSelection();
      const cell = surface.querySelector("td, th");
      const html = serializeEditableDocumentRoot(surface);
      return {
        inCell: cell.contains(selection.anchorNode), cellText: cell.textContent,
        tokenText: surface.querySelector(".template-token").textContent,
        outsideText: surface.querySelector(".template-doc > p").textContent,
        hasStoredGuard: html.includes("template-token-caret") || html.includes("\u200B"),
      };
    },
    dispose() {
      document.removeEventListener("input", onInput);
      surface.removeEventListener("compositionstart", onStart);
      surface.removeEventListener("compositionend", onEnd);
      editor.destroy?.();
    },
  };
}

module.exports = { runTokenTableTypingCheck };
