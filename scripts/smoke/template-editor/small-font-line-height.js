const assert = require('node:assert/strict');
const {evaluate} = require('../../smoke-browser-cdp');

async function runSmallFontLineHeightCheck(client) {
  const result = await evaluate(client, `(${checkSmallFonts.toString()})()`);
  for (const entry of result) {
    assert.ok(Math.abs(entry.height - (entry.size + 1) * 4 / 3) < 0.15, JSON.stringify(entry));
    assert.equal(entry.reloadedHeight, entry.height, 'Reload must retain the smaller line');
  }
}

async function checkSmallFonts() {
  const {renderTemplateEditorView} = await import('/client/features/template-editor/renderers.js');
  const {mountTemplateEditorRuntime, unmountTemplateEditorRuntime} = await import('/client/features/template-editor/editor-runtime-adapter.js');
  const page = {id:'small-font',type:'cover',settings:{editorMode:'document',documentHtml:'<div class="template-doc"><p>확인</p></div>'}};
  const template = {id:'small-font',name:'작은 글자',paperPreset:'A4',orientation:'portrait',layout:{pages:[page]}};
  const access = {permissions:{manageTemplates:true}};
  const appState = {templateEditor:{template,selectedPageId:page.id,dataTags:{groups:[]}}};
  const css = document.createElement('link'); css.rel='stylesheet'; css.href='/styles/features/template-editor.css';
  await new Promise(resolve=>{css.onload=resolve;document.head.append(css);});
  document.querySelector('#editor').innerHTML=renderTemplateEditorView({access,editor:appState.templateEditor});
  const editor=await mountTemplateEditorRuntime({access,appState});
  const surface=document.querySelector('#templateEditorSurface');
  const select=(element,collapsed=false)=>{
    surface.focus();const range=document.createRange();range.selectNodeContents(element);if(collapsed)range.collapse(true);
    getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));
  };
  const variants={
    plain:'확인',
    nested:'<b style="font-size:22pt"><i><span style="font-size:18pt">확인</span></i></b>',
    token:'<span class="template-token" contenteditable="false" data-template-tag-value="candidate.name" style="font-size:22pt">성명</span>',
    empty:'<br>',
  };
  const result=[];
  try {
    for(const [variant,html] of Object.entries(variants)) {
      for(const size of [1,2,4,8,22]) {
        editor.setHtml(`<div class="template-doc"><p id="probe">${html}</p></div>`);
        const before=surface.querySelector('#probe').getBoundingClientRect().height;
        select(surface.querySelector('#probe'),variant==='empty');
        editor.applyCommand('fontSizePx',String(size));
        const height=surface.querySelector('#probe').getBoundingClientRect().height;
        editor.undo();
        if(Math.abs(surface.querySelector('#probe').getBoundingClientRect().height-before)>0.1) throw new Error('Undo changed original line height');
        editor.redo();
        editor.setHtml(editor.getHtml());
        result.push({variant,size,height,reloadedHeight:surface.querySelector('#probe').getBoundingClientRect().height});
      }
    }
    editor.setHtml('<div class="template-doc"><p id="probe">유지 <span id="partial">선택</span></p></div>');
    const before=surface.querySelector('#probe').getBoundingClientRect().height;
    select(surface.querySelector('#partial'));
    editor.applyCommand('fontSizePx','1');
    if(surface.querySelector('#probe').getBoundingClientRect().height!==before) throw new Error('Partial formatting must preserve the unselected larger text');
  } finally { unmountTemplateEditorRuntime(); css.remove(); }
  return result;
}

module.exports={runSmallFontLineHeightCheck};
