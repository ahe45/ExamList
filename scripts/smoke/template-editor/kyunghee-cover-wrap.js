const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { renderPreviewDocument } = require("../../../server/modules/pdf-preview/renderer");
const { buildKyungheeCoverText } = require("../../../server/modules/pdf-preview/kyunghee-cover");
const { checkCoverHeight } = require("./kyunghee-cover-fit");

async function runKyungheeCoverWrapCheck(client) {
  try {
    for (const media of ["screen", "print"]) {
      await client.send("Emulation.setEmulatedMedia", { media });
      await checkCoverWidths(client);
      await checkCoverHeight(client);
    }
  } finally {
    await client.send("Emulation.setEmulatedMedia", { media: "" });
  }
}

async function checkCoverWidths(client) {
  const value = buildKyungheeCoverText([
    { unit: "빅데이터응용학과", examNo: "3001660001" }, { unit: "빅데이터응용학과", examNo: "3001660002" },
    { unit: "글로벌Hospitality·관광학과", examNo: "3001730001" }, { unit: "글로벌Hospitality·관광학과", examNo: "3001730004" },
  ]);
  for (const [width, fontSize] of [[420, 18], [450, 20], [700, 18]]) {
    const template = {
      id: "cover-wrap", name: "표지 줄바꿈", paperPreset: "A4", orientation: "portrait",
      layout: { pages: [{ type: "cover", settings: { editorMode: "document", documentHtml:
        `<div class="template-doc"><table style="width:${width}px;font:normal ${fontSize}px Arial,sans-serif"><tr><td style="padding:0">` +
        '<span data-template-tag-value="document.kyungheeCover">경희대 표지</span></td></tr>' +
        '<tr><td style="padding:0">{{document.kyungheeCover}}</td></tr></table></div>',
      } }] },
    };
    const { html } = renderPreviewDocument({ template, candidates: [], kyungheeCoverText: value });
    const result = await evaluate(client, `(${measureCoverWrap.toString()})(${JSON.stringify(html)})`);
    assert.equal(result.length, 4, "both editor tags and raw tokens must render two ranges");
    for (const [i, range] of result.entries()) {
      assert.equal(range.lines, 1, "first and last exam numbers must stay on the same line");
      assert.ok(range.right <= range.cellRight + 1, "exam number range must fit inside its cell");
      assert.ok(range.top > range.labelTop + 5, "every range must start below its department name, even in a wide cell");
      assert.ok(range.text.startsWith(": "), "the colon belongs on the number line");
      assert.ok(Math.abs(range.left - range.cellLeft) < 1, "the range must align with the department name");
      if (i % 2 === 1) assert.ok(range.labelTop - result[i - 1].top > fontSize * 1.5, "departments must have a blank line between them");
    }
  }
}

async function measureCoverWrap(html) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "width:1200px;height:1400px;border:0";
  const loaded = new Promise((resolve) => frame.onload = resolve);
  frame.srcdoc = html;
  document.body.append(frame);
  try {
    await loaded;
    await frame.contentDocument.fonts.ready;
    await new Promise((resolve) => frame.contentWindow.requestAnimationFrame(() => frame.contentWindow.requestAnimationFrame(resolve)));
    const doc = frame.contentDocument;
    return [...doc.querySelectorAll(".kyunghee-cover-range")].map((element) => {
      const rect = element.getBoundingClientRect();
      const cell = element.closest("td").getBoundingClientRect();
      const label = doc.createRange();
      const labelNode = element.previousSibling.previousSibling;
      label.selectNodeContents(labelNode);
      const text = doc.createRange();
      text.selectNodeContents(element);
      return { top: rect.top, left: rect.left, right: rect.right, cellLeft: cell.left, cellRight: cell.right,
        text: element.textContent, labelTop: label.getBoundingClientRect().top, lines: text.getClientRects().length };
    });
  } finally { frame.remove(); }
}

module.exports = { runKyungheeCoverWrapCheck };
