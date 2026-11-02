const test=require('node:test');
const assert=require('node:assert/strict');
const {createTemplateEditorToolbarColorInteractionController}=require('./toolbar-color-interactions');

test('native color inputs pass their committed value explicitly to text and cell formatting',()=>{
 for(const action of [{editorColorCommand:'foreColor'},{editorColorCommand:'hiliteColor'},{editorColorTableAction:'apply-cell-shading'}]){
  const commands=[],tables=[],swatches=[];
  const controller=createTemplateEditorToolbarColorInteractionController({
   getElementById:()=>null,
   applyTemplateEditorCommand:(...args)=>commands.push(args),
   handleTemplateTableAction:(...args)=>tables.push(args),
   toolbar:{syncEditorToolbarColorControls:args=>swatches.push(args)},toolbarIds:{},
  });
  const input={id:'nativeColor',dataset:action,value:'#be2345',matches:selector=>selector==='input[type="color"]'};
  controller.applyToolbarColorTrigger(input);
  assert.equal(swatches[0].colorInputElement,input);
  assert.equal(swatches[0].colorValue,'#be2345');
  if(action.editorColorCommand)assert.deepEqual(commands,[[action.editorColorCommand,'#be2345']]);
  else assert.deepEqual(tables,[[action.editorColorTableAction,{colorValue:'#be2345'}]]);
 }
});
