const assert = require("node:assert/strict");
const { evaluate, dispatchBrowserMouseClick, dispatchBrowserMouseDrag } = require("../../smoke-browser-cdp");

async function setupObjectInline() {
  const { renderTemplateEditorView } = await import('/client/features/template-editor/renderers.js');
  const { mountTemplateEditorRuntime, unmountTemplateEditorRuntime, syncTemplateEditorRuntimeToState } = await import('/client/features/template-editor/editor-runtime-adapter.js');
  const { prepareObjectAlignmentItem, getObjectAlignmentCanvasMetrics, setObjectAlignmentItemPosition } = await import('/client/features/template-editor/object-alignment-runtime.js');
  const { syncTemplateEditorObjectFlowObjects } = await import('/client/features/template-editor/object-flow-reflow.js');
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/styles/features/template-editor.css';
  await new Promise(resolve => { css.onload = resolve; document.head.append(css); });
  const base = document.createElement('style'); base.textContent = '.hidden {display:none!important}'; document.head.append(base);
  const page = {id:'inline-page', type:'content', settings:{ editorMode:'document',
    documentHtml:'<div class="template-doc"><p>앞 문장</p><table id="inlineTable" style="position:absolute;left:20px;top:80px;width:200px;height:60px"><tr><td>표</td></tr></table>'+
      '<img id="inlineImage" style="position:absolute;left:20px;top:200px;width:80px;height:50px" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2250%22/%3E">'+
      '<div data-candidate-block-grid="true"></div><p>뒷 문장</p></div>',
    candidateBlockGrid:{enabled:true,variant:'photo',columns:1,rows:1,xPt:15,yPt:225,widthPt:165,heightPt:75,blockTemplateHtml:'<p>수험생</p>'} }};
  const template = {id:'inline-template',name:'개체 배치',paperPreset:'A4',orientation:'portrait',layout:{pages:[page]}};
  const appState = {templateEditor:{template,savedTemplateSnapshot:structuredClone(template),selectedPageId:page.id,dataTags:{groups:[]}}};
  const access = {permissions:{manageTemplates:true}}, root = document.querySelector('#editor');
  let editor;
  const mount = async () => { root.innerHTML = renderTemplateEditorView({access,editor:appState.templateEditor}); editor = await mountTemplateEditorRuntime({access,appState}); };
  await mount();
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const surface = () => root.querySelector('#templateEditorSurface');
  const doc = () => surface().querySelector('.template-doc');
  const object = kind => doc().querySelector(kind === 'table' ? ':scope > table' : kind === 'image' ? ':scope > img' : '[data-candidate-block-grid]');
  const checkbox = () => root.querySelector('[data-examlist-object-inline]');
  const select = async kinds => {
    doc().querySelectorAll('.is-selected-object,.is-selected-table-object,.is-selected-candidate-block-grid').forEach(el => el.classList.remove('is-selected-object','is-selected-table-object','is-selected-candidate-block-grid'));
    editor.state.templateEditor.selectedImageElement = null; editor.state.templateEditor.selectedTableElement = null;
    for (const kind of kinds) {
      const el = object(kind);
      el.classList.add(kind === 'grid' ? 'is-selected-candidate-block-grid' : kind === 'table' ? 'is-selected-table-object' : 'is-selected-object');
      if (kind === 'table') editor.state.templateEditor.selectedTableElement = el;
      if (kind === 'image') editor.state.templateEditor.selectedImageElement = el;
    }
    document.dispatchEvent(new Event('selectionchange')); await settle();
    return {checked:checkbox().checked,disabled:checkbox().disabled,mixed:checkbox().indeterminate};
  };
  const read = async () => {
    await settle();
    return {spacers:doc().querySelectorAll('[data-template-object-flow-spacer]').length,
      objects:Object.fromEntries(['table','image','grid'].map(kind => {
        const el=object(kind);return [kind,{top:parseFloat(el.style.top),left:parseFloat(el.style.left),inline:el.dataset.templateObjectInline !== 'false',flowId:el.dataset.templateObjectFlowId || ''}];
      }))};
  };
  window.objectInline = { select,read,
    async overlap() {
      const metrics = getObjectAlignmentCanvasMetrics(doc());
      for (const kind of ['table','image','grid']) {
        const item = prepareObjectAlignmentItem(object(kind),doc(),metrics);
        setObjectAlignmentItemPosition(item,30,120,metrics);
      }
      editor.sync(); syncTemplateEditorObjectFlowObjects(doc()); editor.sync();
      return read();
    },
    async reload() {
      syncTemplateEditorRuntimeToState({appState});
      const saved = page.settings.documentHtml;
      unmountTemplateEditorRuntime(); await mount(); await settle();
      return {saved,...await read()};
    },
    async imageDragPoint() {
      await select(['image']);
      const rect = object('image').getBoundingClientRect(); return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    },
    async history(command) { editor[command](); await settle(); return read(); },
    async readonly(value) { surface().setAttribute('contenteditable',String(!value)); await settle(); return checkbox().disabled; },
    dispose() {unmountTemplateEditorRuntime();css.remove();base.remove();},
  };
}

async function runObjectInlineCheck(client) {
  await evaluate(client, `(${setupObjectInline.toString()})()`);
  try {
    assert.equal((await evaluate(client,'window.objectInline.read()')).spacers,3);
    assert.equal((await evaluate(client,'window.objectInline.select([])')).disabled,true);
    for (const kind of ['table','image','grid']) {
      const control = await evaluate(client, `window.objectInline.select(['${kind}'])`);
      assert.equal(control.checked,true,kind); assert.equal(control.disabled,false,kind);
      await dispatchBrowserMouseClick(client,'[data-examlist-object-inline]');
      const after = await evaluate(client,'window.objectInline.read()');
      assert.equal(after.objects[kind].inline,false,JSON.stringify(after));
      assert.equal(after.objects[kind].flowId,'',JSON.stringify(after));
    }
    const overlapped = await evaluate(client,'window.objectInline.overlap()');
    assert.equal(overlapped.spacers,0);
    Object.values(overlapped.objects).forEach(object => assert.equal(object.inline,false,JSON.stringify(overlapped)));
    Object.values(overlapped.objects).forEach(object => assert.equal(object.top,120));
    let reloaded = await evaluate(client,'window.objectInline.reload()');
    assert.equal(reloaded.spacers,0,JSON.stringify(reloaded));
    assert.equal((reloaded.saved.match(/data-template-object-inline="false"/g)||[]).length,3,reloaded.saved);
    Object.values(reloaded.objects).forEach(object => assert.equal(object.top,120));
    // Dragging a free image over another object must not move its neighbours.
    const start = await evaluate(client,'window.objectInline.imageDragPoint()');
    await dispatchBrowserMouseDrag(client,start,{x:start.x+15,y:start.y+15});
    const moved = await evaluate(client,'window.objectInline.read()');
    assert.equal(moved.objects.table.top,120); assert.equal(moved.objects.grid.top,120);
    assert.equal(moved.spacers,0); assert.ok(moved.objects.image.top>120,JSON.stringify(moved));
    await evaluate(client,"window.objectInline.select(['table'])");
    await dispatchBrowserMouseClick(client,'[data-examlist-object-inline]');
    const inline = await evaluate(client,'window.objectInline.read()');
    assert.equal(inline.objects.table.inline,true); assert.equal(inline.spacers,1);
    const mixed = await evaluate(client,"window.objectInline.select(['table','image'])");
    assert.equal(mixed.mixed,true);
    await dispatchBrowserMouseClick(client,'[data-examlist-object-inline]');
    const allInline = await evaluate(client,'window.objectInline.read()');
    assert.equal(allInline.objects.table.inline,true); assert.equal(allInline.objects.image.inline,true);
    assert.equal(allInline.spacers,2);
    assert.equal(allInline.objects.grid.top,120,'Inline objects must not push a free grid');
    await evaluate(client,'window.objectInline.history("undo")');
    const undone = await evaluate(client,'window.objectInline.read()');
    assert.equal(undone.objects.image.inline,false,'Undo restores per-object wrapping');
    await evaluate(client,'window.objectInline.history("redo")');
    const redone = await evaluate(client,'window.objectInline.read()');
    assert.equal(redone.objects.image.inline,true,'Redo restores wrapping');
    await evaluate(client,"window.objectInline.select(['table'])");
    assert.equal(await evaluate(client,'window.objectInline.readonly(true)'),true);
    assert.equal(await evaluate(client,'window.objectInline.readonly(false)'),false);
  } finally {await evaluate(client,'window.objectInline.dispose()');}
}

module.exports = {runObjectInlineCheck};
