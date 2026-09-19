const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { renderPreviewDocument } = require("../../../server/modules/pdf-preview/renderer");
const { buildKyungheeCoverText } = require("../../../server/modules/pdf-preview/kyunghee-cover");

async function checkCoverHeight(client) {
  for (const count of [1, 9, 18]) {
    const candidates = Array.from({ length: count }, (_, i) => ({ unit: `모집단위${i + 1}`, examNo: String(300100001 + i) }));
    const template = { id: "cover-height", name: "표지 글자 크기", paperPreset: "A4", orientation: "portrait", layout: { pages: [{ type: "cover", settings: {
      editorMode: "document", documentHtml: '<div class="template-doc"><table style="width:502px;height:548px"><colgroup><col style="width:132px"><col style="width:370px"></colgroup><tbody>' +
        '<tr style="height:417px"><td style="height:417px;font-size:14pt;border:1pt solid black;padding:2pt">수험번호</td>' +
        '<td class="cover-cell" style="height:417px;font-size:11pt;border:1pt solid black;padding:2pt;vertical-align:middle">' +
        '<span data-template-tag-value="document.kyungheeCover" style="font-size:11pt;line-height:16px">경희대 표지</span><br><p></p><p></p></td></tr>' +
        '<tr style="height:43px"><td style="height:43px">총 인원</td><td></td></tr><tr style="height:43px"><td style="height:43px">응시 인원</td><td></td></tr>' +
        '<tr style="height:44px"><td style="height:44px">결시 인원</td><td></td></tr></tbody></table></div>',
    } }] } };
    const { html } = renderPreviewDocument({ template, candidates: [], kyungheeCoverText: buildKyungheeCoverText(candidates) });
    const result = await evaluate(client, `(${measureCoverHeight.toString()})(${JSON.stringify(html)})`);
    assert.equal(result.ranges, count);
    assert.ok(result.fontSize >= (count === 18 ? 6 : 12.5), `cover text shrank excessively: ${JSON.stringify({ count, result })}`);
    if (count === 1) assert.ok(Math.abs(result.fontSize - 14.67) < 0.1, "short content must retain its configured 11pt font");
    if (count === 18) assert.ok(result.fontSize < 12.5, "genuine overflow must still scale to fit");
    assert.ok(result.height <= 426, `the cover cell must retain its saved height: ${JSON.stringify(result)}`);
    assert.ok(result.scrollHeight <= result.clientHeight + 2, "all departments must fit without clipping");
    assert.equal(result.fontSize, result.repeatedFontSize, "repeated preview fitting must not shrink text further");
  }
}

async function measureCoverHeight(html) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "width:1200px;height:1400px;border:0";
  const loaded = new Promise(resolve => frame.onload = resolve);
  frame.srcdoc = html;
  document.body.append(frame);
  try {
    await loaded;
    await frame.contentDocument.fonts.ready;
    await new Promise(resolve => frame.contentWindow.requestAnimationFrame(() => frame.contentWindow.requestAnimationFrame(resolve)));
    const cell = frame.contentDocument.querySelector(".cover-cell");
    const fit = cell.querySelector(".template-data-fit");
    const fontSize = parseFloat(frame.contentWindow.getComputedStyle(fit).fontSize);
    frame.contentWindow.ExamListPreviewDataFit.fit();
    return { fontSize, repeatedFontSize: parseFloat(frame.contentWindow.getComputedStyle(fit).fontSize),
      height: cell.getBoundingClientRect().height, scrollHeight: cell.scrollHeight, clientHeight: cell.clientHeight,
      ranges: cell.querySelectorAll(".kyunghee-cover-range").length };
  } finally { frame.remove(); }
}

module.exports = { checkCoverHeight };
