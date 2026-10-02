const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");

async function runDataTagFormatSaveCheck(client) {
  for (const modal of [false, true]) {
    await evaluate(client, `(${setup.toString()})(${modal})`);
    try {
      const result = await evaluate(client, "window.formatSave.change('YYYYMMDD')");
      assert.equal(result.dirty, true, JSON.stringify({modal,result}));
      assert.equal(result.disabled, false);
      assert.equal(result.format, 'YYYYMMDD', JSON.stringify({modal,result}));
      const reopened = await evaluate(client, "window.formatSave.reopen()");
      assert.equal(reopened, 'YYYYMMDD', 'Saved format must survive reopening');
      const cleared = await evaluate(client, "window.formatSave.change('')");
      assert.equal(cleared.dirty, true);
      assert.equal(cleared.disabled, false);
      assert.equal(cleared.format, '', 'Clearing format must also persist');
      assert.equal(await evaluate(client, "window.formatSave.reopen()"), '');
    } finally { await evaluate(client, "window.formatSave.dispose()"); }
  }
}

async function setup(modal) {
  const adapter = await import('/client/features/template-editor/editor-runtime-adapter.js');
  const { renderTemplateEditorView } = await import('/client/features/template-editor/renderers.js');
  const { createDataTagFormatActions } = await import('/client/features/template-editor/data-tag-format-actions.js');
  const { createTemplateEditorStateActions } = await import('/client/features/template-editor/template-editor-state-actions.js');
  const { serializeEditableDocumentRoot } = await import('/client/features/template-editor/document-editor.js');
  const { openCandidateBlockFocusEditor, closeCandidateBlockFocusEditor } = await import('/client/features/template-editor/candidate-block-grid-focus-editor.js');
  const token = '<p><span class="template-token" contenteditable="false" data-template-tag-value="candidate.examDate" data-template-tag-label="시험날짜">시험날짜</span></p>';
  const page = {id:'format-save',type:modal?'content':'cover',settings:{editorMode:'document',
    documentHtml:'<div class="template-doc">'+(modal?'<div data-candidate-block-grid="true"></div>':token)+'</div>',
    ...(modal?{candidateBlockGrid:{enabled:true,variant:'photo',columns:2,rows:1,widthPt:530,heightPt:240,blockTemplateHtml:token}}:{})}};
  const template = {id:'format-save',name:'형식 저장',paperPreset:'A4',orientation:'portrait',layout:{pages:[page]}};
  const appState = {templateEditor:{template,selectedPageId:page.id,dataTags:{groups:[{tags:[{key:'candidate.examDate',label:'시험날짜',type:'date'}]}]}}};
  const access = {permissions:{manageTemplates:true}};
  document.querySelector('#editor').innerHTML = renderTemplateEditorView({access,editor:appState.templateEditor});
  const editor = await adapter.mountTemplateEditorRuntime({access,appState});
  const surface = document.querySelector('#templateEditorSurface');
  appState.templateEditor.savedTemplateSnapshot = structuredClone(template);
  adapter.resetTemplateEditorRuntimeDirtyBaseline({appState});
  const selectedPage = () => appState.templateEditor.template.layout.pages[0];
  const open = () => openCandidateBlockFocusEditor({blockElement:surface.querySelector('[data-candidate-block-template-role="source"]'),editor,surfaceElement:surface,selectedPage:selectedPage(),onDirty(){adapter.syncTemplateEditorRuntimeToState({appState});}});
  const stateActions = createTemplateEditorStateActions({appState,canManageTemplates:()=>true,onStateChange:()=>{}});
  const actions = createDataTagFormatActions({appState,canManageTemplates:()=>true,
    onStateChange:async()=>{adapter.syncTemplateEditorRuntimeToState({appState});},
    syncSelectedPageDocumentHtml(){stateActions.updateSelectedPageDocumentHtml(serializeEditableDocumentRoot(surface), {render:false});}});
  if(modal) open();
  const activeSurface = () => modal ? window.ExamListCandidateBlockModalEditor.getActiveSurface() : surface;
  window.formatSave = {
    async change(format) {
      const target = activeSurface().querySelector('[data-template-tag-value="candidate.examDate"]');
      await actions.openDataTagFormatModal(target); actions.updateDataTagFormatDraftValue(format); await actions.saveDataTagFormatModal();
      if(modal) closeCandidateBlockFocusEditor();
      adapter.syncTemplateEditorRuntimeToState({appState});
      const html = modal?selectedPage().settings.candidateBlockGrid.blockTemplateHtml:selectedPage().settings.documentHtml;
      const probe = document.createElement('div');probe.innerHTML=html;
      return {dirty:appState.templateEditor.isDirty,disabled:document.querySelector('[data-action="save-template-layout"]').disabled,
        format:probe.querySelector('[data-template-tag-value="candidate.examDate"]')?.dataset.templateTagFormat || ''};
    },
    async reopen() {
      appState.templateEditor.savedTemplateSnapshot = structuredClone(appState.templateEditor.template);
      adapter.resetTemplateEditorRuntimeDirtyBaseline({appState});
      if(modal) open(); else editor.setHtml(selectedPage().settings.documentHtml);
      return activeSurface().querySelector('[data-template-tag-value="candidate.examDate"]')?.dataset.templateTagFormat || '';
    },
    dispose(){closeCandidateBlockFocusEditor();adapter.unmountTemplateEditorRuntime();},
  };
}
module.exports = {runDataTagFormatSaveCheck};
