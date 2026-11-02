const assert=require('node:assert/strict');
const {evaluate,dispatchBrowserMouseDrag,waitForCondition}=require('../../smoke-browser-cdp');
const {setupTableSizing}=require('./table-row-boundary-resize');

async function runMultiCellColorCheck(client){
 // Application listeners belong to the document lifetime. Start a fresh page
 // so earlier scenarios' captured application state cannot act on this editor.
 await client.send('Page.navigate',{url:await evaluate(client,'location.href')});
 await waitForCondition(client,'window.ExamListTemplateEditorRuntimeLoader','editor loader');
 for(const modal of [false,true]){
  await evaluate(client,`(${setupTableSizing.toString()})(1,${modal},true)`);
  try{
   const points=await evaluate(client,`(async()=>{
    const surface=document.querySelector(${JSON.stringify(modal?'[data-candidate-block-modal-editor-surface]':'#templateEditorSurface')});
    const cells=[...surface.querySelector('table').rows[0].cells];
    cells.forEach((c,i)=>c.innerHTML='<span style="color:#123456">셀 '+i+'</span>');
    cells[0].textContent='일반 글자';
    cells[1].innerHTML='<b><span style="color:#123456">중첩 서식</span></b>';
    cells[2].innerHTML='<span class="template-token" contenteditable="false" data-template-tag-value="candidate.name" style="color:#123456">성명</span> 글자';
    surface.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'셀'}));
    await window.blockRowResize.settle();
    const current=[...surface.querySelector('table').rows[0].cells];
    const point=c=>{const r=c.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
    return{start:point(current[0]),end:point(current[2])};
   })()`);
   await dispatchBrowserMouseDrag(client,points.start,points.end);
   const result=await evaluate(client,`(async()=>{
    const surface=document.querySelector(${JSON.stringify(modal?'[data-candidate-block-modal-editor-surface]':'#templateEditorSurface')});
    const state=window.ExamListTemplateEditorRuntime.state.templateEditor;
    const count=()=>state.tableSelection?.selectedCells?.length||0;
    const selected=count();
    const input=document.querySelector('#templateEditorToolbarHost input[data-editor-color-command="foreColor"]');
    const click=el=>{el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));el.click()};
    click(document.querySelector('[data-editor-color-toggle="'+input.id+'"]'));
    input.showPicker=()=>input.focus({preventScroll:true});
    click(document.querySelector('[data-editor-color-direct][data-editor-color-input="'+input.id+'"]'));
    await window.blockRowResize.settle();
    const opened=count();
    const historyBefore=state.historyIndex;
    input.value='#be2345';input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,200));
    const dragging=count(),focus=document.activeElement===input;
    const historyDuring=state.historyIndex;
    const previewStyle=document.querySelector('style[data-editor-color-preview="'+input.id+'"]');
    const name=previewStyle?.sheet.cssRules[0].selectorText.slice('::highlight('.length,-1);
    const previewRanges=CSS.highlights.get(name)?.size||0;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    await window.blockRowResize.settle();
    const historyCommitted=state.historyIndex;
    const cells=[...surface.querySelector('table').rows[0].cells];
    const runs=cells.map(c=>{const colors=[],walker=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);while(walker.nextNode()){if(walker.currentNode.textContent.trim())colors.push(getComputedStyle(walker.currentNode.parentElement).color);}return colors;});
    return {selected,opened,dragging,focus,previewRanges,historyBefore,historyDuring,historyCommitted,committed:count(),runs,colors:cells.map(c=>getComputedStyle(c.querySelector('span')||c).color)};
   })()`);
   assert.equal(result.selected,3,JSON.stringify({modal,result}));
   assert.equal(result.opened,3,JSON.stringify({modal,result}));
   assert.equal(result.dragging,3,JSON.stringify({modal,result}));
   assert.equal(result.focus,true);
   assert.equal(result.previewRanges,3,'Live preview must cover all selected cells');
   assert.equal(result.historyDuring,result.historyBefore,'Dragging must not add undo steps');
   assert.equal(result.historyCommitted,result.historyBefore+1,'A completed choice must be one undo step');
   assert.deepEqual(result.colors.slice(0,3),Array(3).fill('rgb(190, 35, 69)'),JSON.stringify({modal,result}));
   assert.deepEqual(result.colors.slice(3),Array(2).fill('rgb(18, 52, 86)'));
   assert.ok(result.runs.slice(0,3).every(runs=>runs.length && runs.every(color=>color==='rgb(190, 35, 69)')));
  }finally{await evaluate(client,'window.blockRowResize.dispose()');}
 }
}
module.exports={runMultiCellColorCheck};
