const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");
const { createTemplate, normalizeTemplateLayout, renderPreviewDocument } = require("../../../server/modules/pdf-preview/renderer-test-helpers");

function createCases() {
  return [10, 11, 14, 18].flatMap(size => [300, 50, 25].flatMap(width => [false, true].flatMap(mixed =>
    [false, true].map(showIcon => ({size, width, mixed, showIcon})))));
}

function markup(cases, inTable) {
  return cases.map(({size, width, mixed, showIcon}, index) => {
    const token = `<span class="template-token${showIcon ? '' : ' template-token-icons-hidden'}" contenteditable="false" data-template-tag-value="candidate.name" data-template-tag-format-supported="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" /></svg>홍길동</span>`;
    const text = mixed ? `성명 ${token} 확인` : token;
    const p = `<p class="token-layout-probe" data-probe="${index}" style="font-size:${size}pt;line-height:calc(1em + 1pt);margin:0;padding:0">${text}</p>`;
    return `<div style="width:${width}px">${inTable ? `<table style="width:${width}px;border-collapse:collapse;table-layout:fixed"><tr><td style="padding:0;border:0">${p}</td></tr></table>` : p}</div>`;
  }).join("");
}

function measure(root) {
  const win = root.ownerDocument.defaultView;
  const scale = root.matches?.('[data-candidate-block-modal-editor-surface]') ? root.getBoundingClientRect().width / root.offsetWidth : 1;
  return Array.from(root.querySelectorAll('.token-layout-probe'), p => {
    const token = p.querySelector('.template-token, .template-data-fit');
    const rect = p.getBoundingClientRect();
    const tokenRect = token.getBoundingClientRect();
    return {height:rect.height / scale, width:rect.width / scale, tokenWidth:tokenRect.width / scale,
      fontSize:win.getComputedStyle(token).fontSize, text:p.textContent};
  });
}

async function runTokenLayoutCheck(client) {
  const cases = createCases();
  for (const modal of [false, true]) {
    await evaluate(client, `(${setupTableSizing.toString()})(1, ${modal})`);
    try {
      await evaluate(client, `(async () => {
        const css = document.createElement('link'); css.rel='stylesheet'; css.href='/styles/features/template-editor/data-tags.css'; css.id='token-layout-css';
        await new Promise(resolve => {css.onload=resolve;document.head.append(css)});
        await document.fonts.ready;
      })()`);
      for (const inTable of [false, true]) {
        const html = markup(cases, inTable);
        const layout = normalizeTemplateLayout({pages:[{id:'tokens',type:'cover',settings:{documentHtml:`<div class="template-doc">${html}</div>`,pageNumber:{enabled:false}}}]},{paperPreset:'A4',orientation:'portrait'},'tokens');
        const {html:pdfHtml} = renderPreviewDocument({template:createTemplate(layout),candidates:[{name:'홍길동'}]});
        const result = await evaluate(client, `(async () => {
          const root = document.querySelector(${JSON.stringify(modal ? '[data-candidate-block-modal-editor-surface]' : '#templateEditorSurface .template-doc')});
          root.innerHTML = ${JSON.stringify(html)};
          const measured = (${measure.toString()})(root);
          const frame=document.createElement('iframe');frame.style.cssText='position:fixed;left:0;top:0;width:1000px;height:1000px';
          await new Promise(resolve=>{frame.onload=resolve;frame.srcdoc=${JSON.stringify(pdfHtml)};document.body.append(frame)});
          await frame.contentDocument.fonts.ready;
          const printed = (${measure.toString()})(frame.contentDocument.body);
          frame.remove();
          return {measured, printed};
        })()`);
        assert.equal(result.measured.length, cases.length);
        assert.equal(result.printed.length, cases.length);
        result.measured.forEach((actual, index) => {
          const expected = result.printed[index];
          for (const dimension of ['height', 'width', 'tokenWidth']) {
            assert.ok(Math.abs(actual[dimension] - expected[dimension]) < 0.1,
              JSON.stringify({modal,inTable,...cases[index],dimension,actual,expected}));
          }
          assert.equal(actual.fontSize, expected.fontSize);
          assert.equal(actual.text, expected.text);
        });
      }
    } finally {
      await evaluate(client, `document.getElementById('token-layout-css')?.remove();window.blockRowResize.dispose()`);
    }
  }
}

module.exports = { runTokenLayoutCheck };
