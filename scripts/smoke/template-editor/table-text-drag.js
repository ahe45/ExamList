const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runTableTextDragCheck(client) {
  const drag = async (start, end) => {
    await client.send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...start });
    for (let step = 1; step <= 8; step++) {
      await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1,
        x: start.x + (end.x - start.x) * step / 8, y: start.y + (end.y - start.y) * step / 8 });
    }
    await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...end });
  };
  for (const cellTag of ["td", "th"]) {
    for (const reverse of [false, true]) {
      await evaluate(client, `(${setupTableTextDrag.toString()})('${cellTag}')`);
      try {
        const points = await evaluate(client, "window.tableTextDrag.points()");
        await drag(reverse ? points.end : points.start, reverse ? points.start : points.end);
        const selected = await evaluate(client, "window.tableTextDrag.inspect()");
        assert.equal(selected.text, "다라마바사", `${cellTag} ${reverse ? "backward" : "forward"}: mouse drag must select text`);
        assert.equal(selected.cells, 0, "dragging inside a cell must not select the whole cell");
        const formatted = await evaluate(client, "window.tableTextDrag.bold()");
        assert.equal(formatted.text, "가나다라마바사아자차");
        assert.deepEqual(formatted.bold, [false, false, true, true, true, true, true, false, false, false],
          "formatting must affect only the dragged substring");
        assert.equal(formatted.otherBold, false, "formatting must not change the neighboring cell");
        await evaluate(client, "window.tableTextDrag.undo()");
        const cellPoints = await evaluate(client, "window.tableTextDrag.points()");
        await drag(cellPoints.start, cellPoints.other);
        assert.equal((await evaluate(client, "window.tableTextDrag.inspect()")).cells, 2,
          "dragging into another cell must retain multi-cell selection");
      } finally {
        await evaluate(client, "window.tableTextDrag.dispose()");
      }
    }
  }
}

async function setupTableTextDrag(cellTag) {
  const { renderTemplateEditorView } = await import("/client/features/template-editor/renderers.js");
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime } = await import("/client/features/template-editor/editor-runtime-adapter.js");
  const page = { id: "text-drag", type: "cover", settings: { editorMode: "document",
    documentHtml: `<div class="template-doc"><table style="width:600px"><tr><${cellTag} style="padding:20px;font-weight:normal;font-size:20px">가나다라마바사아자차</${cellTag}><td style="padding:20px;font-size:20px">다른 셀</td></tr></table></div>`,
  } };
  const template = { id: "text-drag-template", name: "텍스트 선택", paperPreset: "A4", orientation: "portrait", layout: { pages: [page] } };
  const appState = { templateEditor: { template, selectedPageId: page.id, dataTags: { groups: [] } } };
  const access = { permissions: { manageTemplates: true } };
  const root = document.querySelector("#editor");
  root.innerHTML = renderTemplateEditorView({ access, editor: appState.templateEditor });
  const editor = await mountTemplateEditorRuntime({ access, appState });
  const surface = root.querySelector("#templateEditorSurface");
  const cell = () => surface.querySelector("td, th");
  const point = (node, offset) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    return { x: rect.left + 0.2, y: rect.top + rect.height / 2 };
  };
  window.tableTextDrag = {
    points() { return { start: point(cell().firstChild, 2), end: point(cell().firstChild, 7), other: point(cell().nextElementSibling.firstChild, 2) }; },
    async inspect() {
      await new Promise(resolve => requestAnimationFrame(resolve));
      return { text: getSelection().toString(), cells: surface.querySelectorAll(".is-selected-cell").length };
    },
    bold() {
      editor.applyCommand("bold");
      const bold = [];
      const walker = document.createTreeWalker(cell(), NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        bold.push(...[...walker.currentNode.textContent].map(() => Number(getComputedStyle(walker.currentNode.parentElement).fontWeight) >= 600));
      }
      return { text: cell().textContent, bold, otherBold: Number(getComputedStyle(cell().nextElementSibling).fontWeight) >= 600 };
    },
    async undo() { editor.undo(); await new Promise(resolve => requestAnimationFrame(resolve)); },
    dispose: unmountTemplateEditorRuntime,
  };
}

module.exports = { runTableTextDragCheck };
