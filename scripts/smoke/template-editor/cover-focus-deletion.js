const assert = require('node:assert/strict');
const { evaluate } = require('../../smoke-browser-cdp');

async function runCoverFocusDeletionCheck(client, savedTemplate = null) {
  await evaluate(client, `(${setupCoverFocusDeletion.toString()})(${JSON.stringify(savedTemplate)})`);
  const read = () => evaluate(client, 'window.coverFocusDeletion.read()');
  const press = async (key, code, modifiers = 0) => {
    await client.send('Input.dispatchKeyEvent', {type:'keyDown',key,windowsVirtualKeyCode:code,modifiers});
    await client.send('Input.dispatchKeyEvent', {type:'keyUp',key,windowsVirtualKeyCode:code,modifiers});
    await evaluate(client, 'window.coverFocusDeletion.settle()');
  };
  try {
    const initial = await read();
    for (let i = 0; i < 3; i++) {
      await evaluate(client, 'window.coverFocusDeletion.blur()');
      const after = await read();
      assert.equal(after.tableHeight, initial.tableHeight, 'Focusout must retain the empty row height');
      assert.deepEqual(after.tableHeights, initial.tableHeights, 'Focusout must retain every table height');
      assert.equal(after.emptyCells, initial.emptyCells, 'Live sanitization must retain empty-cell presentation');
    }
    await evaluate(client, 'window.coverFocusDeletion.beforeLogo()');
    const beforeDelete = await read();
    await press('Delete', 46);
    const deleted = await read();
    assert.equal(deleted.authoredLine, false, 'Delete must remove the authored blank line before the logo');
    assert.equal(deleted.images, 1, 'Deleting a line must retain the logo');
    assert.equal(deleted.rows, initial.rows, 'Deleting a line must retain table rows');
    assert.ok(deleted.imageTop < beforeDelete.imageTop - 5, 'The logo must move up after deleting the blank line');
    for (let i = 0; i < 3; i++) await press('Delete', 46);
    assert.equal((await read()).breaks, deleted.breaks, 'Repeated Delete must not add line breaks at the spacer');
    await press('z', 90, 2);
    assert.equal((await read()).authoredLine, true, 'Undo must restore the blank line');
    await press('y', 89, 2);
    assert.equal((await read()).authoredLine, false, 'Redo must delete the blank line again');
    await evaluate(client, 'window.coverFocusDeletion.reload()');
    assert.equal((await read()).authoredLine, false, 'The deletion must survive serialization and reload');
    assert.equal((await read()).images, 1);
  } finally {
    await evaluate(client, 'window.coverFocusDeletion.dispose()');
  }
}

async function setupCoverFocusDeletion(savedTemplate) {
  const {renderTemplateEditorView} = await import('/client/features/template-editor/renderers.js');
  const {mountTemplateEditorRuntime, unmountTemplateEditorRuntime} = await import('/client/features/template-editor/editor-runtime-adapter.js');
  const {setupTemplateEditorActions} = await import('/client/features/template-editor/actions.js');
  const cell = '<td style="height:42px;padding:8pt 0;font-size:14pt;line-height:calc(1em + 1.33333px);border:1pt solid black"><br></td>';
  let page = {id:'cover-focus',type:'cover',settings:{editorMode:'document',documentHtml:
    '<div class="template-doc"><p>표지</p><table style="width:500px;height:84px"><tbody style="height:84px">'+
    `<tr style="height:42px">${cell.repeat(2)}</tr><tr style="height:42px">${cell.repeat(2)}</tr></tbody></table>`+
    '<p><br></p><p id="beforeLogo" style="margin:0"><br></p><img alt="logo" style="position:absolute;top:140px;left:0;width:80px;height:50px" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2250%22/%3E"><p><br></p></div>'}};
  const template = savedTemplate || {id:'cover-focus',name:'표지',paperPreset:'A4',orientation:'portrait',layout:{pages:[page]}};
  if (savedTemplate) {
    page=template.layout.pages.find(p=>p.type==='cover');
    const source=document.createElement('template'); source.innerHTML=page.settings.documentHtml;
    source.content.querySelector('img').previousElementSibling.id='beforeLogo';
    page.settings.documentHtml=source.innerHTML;
  }
  const access = {permissions:{manageTemplates:true}};
  const appState = {summary:access,templateEditor:{template,selectedPageId:page.id,dataTags:{groups:[]}}};
  setupTemplateEditorActions({appState,navigateToPath(){},onStateChange(){},templatesActions:{}});
  const css = document.createElement('link'); css.rel='stylesheet'; css.href='/styles/features/template-editor.css';
  await new Promise(resolve => {css.onload=resolve;document.head.append(css);});
  const root=document.querySelector('#editor');
  root.innerHTML=renderTemplateEditorView({access,editor:appState.templateEditor});
  const editor=await mountTemplateEditorRuntime({access,appState});
  const outside=document.createElement('button'); outside.textContent='outside'; document.body.prepend(outside);
  const surface=root.querySelector('#templateEditorSurface');
  const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const select=(node,atEnd=false)=>{
    surface.focus();const range=document.createRange();range.selectNodeContents(node);range.collapse(!atEnd);
    getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));
  };
  const read=()=>({tableHeight:surface.querySelector('table').getBoundingClientRect().height,
    tableHeights:Array.from(surface.querySelectorAll('table'), table=>table.getBoundingClientRect().height),
    emptyCells:surface.querySelectorAll('[data-template-empty-cell]').length,
    rows:surface.querySelector('table').rows.length,images:surface.querySelectorAll('img').length,
    imageTop:parseFloat(surface.querySelector('img').style.top),authoredLine:!!surface.querySelector('#beforeLogo'),
    breaks:surface.querySelectorAll('br').length});
  window.coverFocusDeletion={read,settle,
    async blur(){select(surface.querySelector('td'));outside.focus();await settle();},
    async beforeLogo(){select(surface.querySelector('#beforeLogo'));await settle();},
    async reload(){editor.setHtml(editor.getHtml());await settle();},
    dispose(){unmountTemplateEditorRuntime();css.remove();outside.remove();}};
  await settle();
}

module.exports={runCoverFocusDeletionCheck};
