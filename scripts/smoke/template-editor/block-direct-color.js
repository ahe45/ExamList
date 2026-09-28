const assert = require("node:assert/strict");
const { evaluate, waitForCondition } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runBlockDirectColorCheck(client) {
  // Hit testing requires a clean viewport, without preceding drag tests' styles
  // or overlays. The runtime fixture is mounted again below.
  await client.send("Page.navigate", {url: await evaluate(client, "location.href")});
  await waitForCondition(client, "window.ExamListTemplateEditorRuntimeLoader", "editor loader");
  for (const {zoom, fallback} of [0.75, 1].flatMap(zoom => [false, true].map(fallback => ({zoom, fallback})))) {
    await evaluate(client, "window.scrollTo(0, 0)");
    await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, true)`);
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
        const inspect = () => {
          const layer = document.querySelector('[data-candidate-block-focus-layer]');
          const visible = ['cancel', 'apply'].every(action => {
            const button = document.querySelector('[data-candidate-block-focus-' + action + ']');
            const rect = button?.getBoundingClientRect();
            const hit = rect && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return !!rect && rect.height > 0 && (hit === button || button.contains(hit));
          });
          return { layer: !!layer, visible, scrollTop: document.scrollingElement.scrollTop };
        };
        const results = [];
        for (const input of inputs) {
          const surface = document.querySelector('[data-candidate-block-modal-editor-surface]');
          const cell = surface.querySelector('td'); cell.textContent = '색상 선택';
          const selection = window.getSelection(), range = document.createRange();
          range.selectNodeContents(cell); selection.removeAllRanges(); selection.addRange(range); surface.focus({preventScroll:true});
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
          // Canceling a native chooser emits no color change.
          surface.focus({preventScroll:true});
          await window.blockRowResize.settle();
          const canceled = inspect();
          direct.click();
          const opened = inspect();
          input.value = '#be2345'; input.dispatchEvent(new Event('input', {bubbles:true}));
          await new Promise(resolve => setTimeout(resolve, 200));
          const preview = inspect();
          input.dispatchEvent(new Event('change', {bubbles:true}));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          results.push({id:input.id, before, canceled, opened, preview, committed:inspect(), html:surface.querySelector('td').outerHTML});
        }
        return results;
      })()`);
      assert.equal(results.length, 4, JSON.stringify(results));
      for (const result of results) {
        for (const stage of ["canceled", "opened", "preview", "committed"]) {
          assert.ok(result[stage].visible, JSON.stringify({zoom, fallback, result}));
          assert.equal(result[stage].scrollTop, result.before.scrollTop, "native picker must not scroll the page");
        }
        const colorStyle = result.id.endsWith("BorderColor") ? "border: 1px solid" : result.id.endsWith("TextColor") ? "color:" : "background-color:";
        assert.ok(result.html.includes(colorStyle + " rgb(190, 35, 69)"), result.html);
      }
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
    } finally { await evaluate(client, "window.blockRowResize.dispose()"); }
  }
}

module.exports = { runBlockDirectColorCheck };
