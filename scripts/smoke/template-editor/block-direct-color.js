const assert = require("node:assert/strict");
const { evaluate, waitForCondition } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runBlockDirectColorCheck(client) {
  // Hit testing requires a clean viewport, without preceding drag tests' styles
  // or overlays. The runtime fixture is mounted again below.
  const resetPage = async () => {
    await client.send("Page.navigate", {url: await evaluate(client, "location.href")});
    await waitForCondition(client, "window.ExamListTemplateEditorRuntimeLoader", "editor loader");
  };
  for (const {zoom, fallback, modal} of [0.75, 1].flatMap(zoom => [false, true].flatMap(fallback =>
    [false, true].map(modal => ({zoom, fallback, modal}))))) {
    await resetPage();
    await evaluate(client, "window.scrollTo(0, 0)");
    await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, ${modal}, true)`);
    try {
      // This fixture loads document CSS only. Size the canvas to the scaled paper,
      // as the application's surrounding layout does.
      await evaluate(client, `(async () => {
        const paper = document.querySelector('#templateEditorSurface');
        const canvas = paper.closest('.template-editor-page');
        const width = paper.offsetWidth, height = paper.offsetHeight;
        paper.style.width = width + 'px';
        paper.style.transformOrigin = 'top left';
        canvas.style.width = width * ${zoom} + 'px';
        canvas.style.height = height * ${zoom} + 'px';
        window.dispatchEvent(new Event('resize'));
        await window.blockRowResize.settle();
      })()`);
      const results = await evaluate(client, `(async () => {
        const inputs = Array.from(document.querySelectorAll('#templateEditorToolbarHost input[type="color"]'));
        const surfaceSelector = ${JSON.stringify(modal ? '[data-candidate-block-modal-editor-surface]' : '#templateEditorSurface')};
        const originalLayer = document.querySelector('[data-candidate-block-focus-layer]');
        const originalSurface = document.querySelector(surfaceSelector);
        const inspect = () => {
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const surface = document.querySelector(surfaceSelector);
          const surfaceRect = surface?.getBoundingClientRect();
          const visible = !${modal} || ['cancel', 'apply'].every(action => {
            const button = document.querySelector('[data-candidate-block-focus-' + action + ']');
            const rect = button?.getBoundingClientRect();
            const hit = rect && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return !!rect && rect.height > 0 && (hit === button || button.contains(hit));
          });
          return { layer: !!layer, visible, scrollTop: document.scrollingElement.scrollTop,
            nativeInputFocused: document.activeElement?.matches('input[type="color"]'),
            colorPanelOpen: !!document.querySelector('.template-toolbar-color-panel:not(.hidden)'),
            sameNodes: layer === originalLayer && surface === originalSurface,
            tabs: layer?.querySelectorAll('[data-candidate-block-focus-tab]').length,
            closeButton: !!layer?.querySelector('[data-candidate-block-focus-close]'),
            text: surface?.textContent?.replace(/\\s+/g, ' ').trim(),
            geometry: Array.from(surface?.querySelectorAll('table, td') || [], element => {
              const rect = element.getBoundingClientRect();
              return [rect.x - surfaceRect.x, rect.y - surfaceRect.y, rect.width, rect.height];
            }) };
        };
        const results = [];
        for (const input of inputs) {
          const surface = document.querySelector(surfaceSelector);
          const cell = surface.querySelector('td[colspan]'); cell.textContent = '앞 asdsad 뒤';
          surface.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:cell.textContent}));
          await window.blockRowResize.settle();
          const selection = window.getSelection(), range = document.createRange();
          range.setStart(cell.firstChild, 2); range.setEnd(cell.firstChild, 8);
          selection.removeAllRanges(); selection.addRange(range); surface.focus({preventScroll:true});
          window.ExamListTemplateEditorRuntime.state.templateEditor.savedRange = range.cloneRange();
          document.dispatchEvent(new Event('selectionchange'));
          document.querySelector('[data-editor-color-toggle="' + input.id + '"]').click();
          const direct = document.querySelector('[data-editor-color-direct][data-editor-color-input="' + input.id + '"]');
          // The OS chooser is replaced only at its boundary; all application
          // click, focus, input and change handlers run normally.
          if (${fallback}) {
            input.showPicker = undefined;
            input.click = () => { input.focus(); };
          } else input.showPicker = () => { input.focus(); };
          const before = inspect();
          direct.click();
          const originalValue=input.value;
          input.value='#345678';input.dispatchEvent(new Event('input',{bubbles:true}));
          if(!document.querySelector('style[data-editor-color-preview]')) throw new Error('Native color input must paint synchronously');
          // Canceling a native chooser emits no color change.
          input.value=originalValue;
          surface.focus({preventScroll:true});
          // A headless page can change activeElement without firing focusout.
          input.dispatchEvent(new FocusEvent('focusout',{bubbles:true,relatedTarget:surface}));
          await window.blockRowResize.settle();
          if(document.querySelector('style[data-editor-color-preview]')) throw new Error('Canceling a chooser must clear its preview');
          const canceled = inspect();
          direct.click();
          const opened = inspect();
          await window.blockRowResize.settle();
          const htmlBeforeDrag = surface.innerHTML;
          for (const value of ['#123456','#56789a','#be2345']) {
            input.value = value; input.dispatchEvent(new Event('input', {bubbles:true}));
            if (!document.querySelector('style[data-editor-color-preview="'+input.id+'"]')) throw new Error('Color preview must not wait for a timer');
            await new Promise(resolve => setTimeout(resolve, 200));
            if (document.activeElement !== input) throw new Error('Dragging color stole focus from the native picker: '+input.id);
            const previewStyle=document.querySelector('style[data-editor-color-preview="'+input.id+'"]');
            if (!previewStyle) throw new Error('Dragging must preview the selected color immediately: '+input.id);
            const command=input.dataset.editorColorCommand;
            const expected=document.createElement('span');expected.style.color=value;
            if(command){
              const rule=previewStyle.sheet.cssRules[0];
              const property=command==='foreColor'?'color':'background-color';
              if(rule.style.getPropertyValue(property)!==expected.style.color) throw new Error('Live text preview has the wrong color');
              const name=rule.selectorText.slice('::highlight('.length,-1);
              if(!CSS.highlights.get(name)?.size) throw new Error('Live text preview has no selected ranges');
            }else{
              const computed=getComputedStyle(cell);
              const property=input.dataset.editorColorTableAction==='apply-cell-border'?'borderTopColor':'backgroundColor';
              if(computed[property]!==expected.style.color) throw new Error('Live cell preview has the wrong color: '+input.id);
            }
          }
          const preview = inspect();
          if (surface.innerHTML !== htmlBeforeDrag) {
            const after=surface.innerHTML;let at=0;while(at<after.length && after[at]===htmlBeforeDrag[at])at++;
            throw new Error('Dragging must not rewrite the live document: '+input.id+' '+JSON.stringify({before:htmlBeforeDrag.slice(Math.max(0,at-80),at+180),after:after.slice(Math.max(0,at-80),at+180)}));
          }
          input.dispatchEvent(new Event('change', {bubbles:true}));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          if(document.querySelector('style[data-editor-color-preview]')) throw new Error('Committed colors must clear their temporary preview');
          results.push({id:input.id, before, canceled, opened, preview, committed:inspect(), html:surface.querySelector('td[colspan]').outerHTML});
        }
        return results;
      })()`);
      assert.equal(results.length, 4, JSON.stringify(results));
      for (const result of results) {
        assert.equal(result.preview.nativeInputFocused, true, 'Dragging must retain native chooser focus');
        assert.equal(result.preview.colorPanelOpen, true, 'Dragging must retain the color popover');
        for (const stage of ["canceled", "opened", "preview", "committed"]) {
          assert.ok(result[stage].visible, JSON.stringify({zoom, fallback, result}));
          assert.equal(result[stage].scrollTop, result.before.scrollTop, "native picker must not scroll the page");
          assert.equal(result[stage].sameNodes, true, "color selection must retain live modal nodes");
          assert.equal(result[stage].tabs, modal ? 3 : undefined, "all modal tabs must remain");
          assert.equal(result[stage].closeButton, modal);
          assert.equal(result[stage].text, result.before.text, "color selection must preserve all text");
          assert.equal(result[stage].geometry.length, result.before.geometry.length);
          result[stage].geometry.forEach((rect, index) => rect.forEach((value, axis) => {
            assert.ok(Math.abs(value - result.before.geometry[index][axis]) <= 1,
              JSON.stringify({message:"color selection moved or resized a table/cell", zoom, fallback, id:result.id, stage, before:result.before.geometry, after:result[stage].geometry}));
          }));
        }
        const colorStyle = result.id.endsWith("BorderColor") ? "border: 1px solid" : result.id.endsWith("TextColor") ? "color:" : "background-color:";
        assert.ok(result.html.includes(colorStyle + " rgb(190, 35, 69)"), result.html);
      }
      if (modal) {
        const actions = await evaluate(client, `(async () => {
        const press = action => document.querySelector('[data-candidate-block-focus-' + action + ']').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true, button:0}));
        press('apply');
        const applied = !document.querySelector('[data-candidate-block-focus-layer]') && document.querySelector('[data-candidate-block-template-role="source"]').innerHTML.includes('rgb(190, 35, 69)');
        await window.blockRowResize.reload();
        document.querySelector('[data-candidate-block-modal-editor-surface] td').textContent = 'discard-color-test';
        press('cancel');
        const canceled = !document.querySelector('[data-candidate-block-focus-layer]') && !document.querySelector('[data-candidate-block-template-role="source"]').textContent.includes('discard-color-test');
        return {applied, canceled};
        })()`);
        assert.deepEqual(actions, {applied:true, canceled:true});
      }
    } finally { await evaluate(client, "window.blockRowResize.dispose()"); }
  }
  // The application listeners live on document for the page's lifetime.
  await resetPage();
}

module.exports = { runBlockDirectColorCheck };
