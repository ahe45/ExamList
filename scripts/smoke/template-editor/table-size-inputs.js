const assert = require("node:assert/strict");
const { evaluate, dispatchBrowserMouseClick, dispatchBrowserMouseDrag } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runTableSizeInputsCheck(client) {
  await runCellSizeFocusCheck(client);
  for (const modal of [false, true]) {
    for (const zoom of [1, 0.8, 1.25]) {
      await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, ${modal})`);
      try {
        const selector = modal ? '[data-candidate-block-modal-editor-surface] table' : '#templateEditorSurface .template-doc table';
        const prefix = JSON.stringify(selector);
        await evaluate(client, `(() => {
          const table = document.querySelector(${prefix});
          table.innerHTML = '<colgroup><col style="width:140px"><col style="width:210px"></colgroup><tbody style="height:160px">' +
            [60,100].map(height => '<tr style="height:'+height+'px">' +
              [2,5].map(padding => '<td style="height:'+height+'px;min-height:'+height+'px;padding:'+padding+'pt;border:1px solid black">Text</td>').join('')+'</tr>').join('') + '</tbody>';
          table.style.height = '160px';
          if (document.querySelector('[data-template-table-size], [data-template-cell-size-scope]')) throw new Error('Manual apply/scope controls must be removed');
          const size = document.querySelector('.template-toolbar-cell-size-section');
          const padding = document.querySelector('.template-toolbar-cell-padding-section');
          if (size.getBoundingClientRect().bottom > padding.getBoundingClientRect().top) throw new Error('Size must appear above padding');
          if (Array.from(size.querySelectorAll('.template-toolbar-size-input-wrap > span')).some(el => el.textContent !== 'px')) throw new Error('Size units must be inside input wrappers');
          if (Array.from(padding.querySelectorAll('.template-toolbar-cell-padding-unit')).some(el => el.textContent !== 'px')) throw new Error('Padding units must be px');
        })()`);
        async function select(indices) {
          await evaluate(client, `(async () => {
            const table = document.querySelector(${prefix});
            const cells = ${JSON.stringify(indices)}.map(([row,col]) => table.rows[row].cells[col]);
            const range = document.createRange(); range.selectNodeContents(cells[0]); range.collapse(true);
            document.querySelector('#templateEditorSurface').focus();
            const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
            const state = window.ExamListTemplateEditorRuntime.state.templateEditor;
            state.savedRange = range.cloneRange(); state.activeCellElement = cells[0];
            state.savedSelectionSnapshot = null;
            state.tableSelection = cells.length > 1 ? { table, anchorCell: cells[0], focusCell: cells.at(-1), selectedCells: cells,
              startRowIndex:0, endRowIndex:1, startColIndex:0, endColIndex:1 } : null;
            document.dispatchEvent(new Event('selectionchange'));
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          })()`);
        }
        const read = `(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const table = document.querySelector(${prefix});
          const scale = table.getBoundingClientRect().height / table.offsetHeight;
          const width = document.querySelector('[data-template-cell-size-input="width"]');
          const height = document.querySelector('[data-template-cell-size-input="height"]');
          return { rows: Array.from(table.rows, row => row.getBoundingClientRect().height / scale),
            widths: Array.from(table.rows[0].cells, cell => cell.getBoundingClientRect().width / scale),
            width:width.value || width.placeholder, height:height.value || height.placeholder,
            padding:Array.from(table.rows, row => Array.from(row.cells, cell => parseFloat(getComputedStyle(cell).paddingTop))),
            paddingDisplay:document.querySelector('[data-editor-cell-padding-current]').textContent,
            focus:document.activeElement?.dataset.templateCellSizeInput };
        })()`;
        async function input(dimension, value) {
          const selector = `[data-template-cell-size-input="${dimension}"]`;
          await dispatchBrowserMouseClick(client, selector);
          await evaluate(client, `(() => {
            const input = document.querySelector(${JSON.stringify(selector)});
            input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('input', {bubbles:true}));
          })()`);
          return evaluate(client, read);
        }
        await select([[0,0]]);
        const initial = await evaluate(client, read);
        assert.equal(initial.width, '140', JSON.stringify({modal,zoom,initial}));
        assert.equal(initial.height, '60');
        assert.equal(initial.paddingDisplay, '2.67');
        const one = await input('width','120');
        assert.ok(Math.abs(one.widths[0]-120)<=2, JSON.stringify({modal,zoom,one}));
        assert.equal(one.focus,'width','Live edits must keep input focus');
        one.rows.forEach((height,index)=>assert.ok(Math.abs(height-initial.rows[index])<1,'Changing width must not apply height'));
        const shortened = await input('height','50');
        assert.ok(Math.abs(shortened.rows[0]-50)<=2, JSON.stringify(shortened));
        assert.ok(Math.abs(shortened.rows[1]-100)<=2);
        assert.equal(shortened.focus,'height');
        await select([[0,0],[0,1]]);
        const sameHeight = await evaluate(client, read);
        assert.equal(sameHeight.width,'혼합');
        assert.equal(sameHeight.height,'50');
        await select([[0,0],[0,1],[1,0],[1,1]]);
        const mixed = await evaluate(client, read);
        assert.equal(mixed.width,'혼합',JSON.stringify(mixed));
        assert.equal(mixed.height,'혼합');
        assert.equal(mixed.paddingDisplay,'혼합');
        const widths = await input('width','155');
        assert.ok(widths.widths.every(width=>Math.abs(width-155)<=2),JSON.stringify(widths));
        widths.rows.forEach((height,index)=>assert.ok(Math.abs(height-shortened.rows[index])<1));
        const heights = await input('height','70');
        assert.ok(heights.rows.every(height=>Math.abs(height-70)<=2),JSON.stringify(heights));
        const invalid = await input('height','10');
        assert.deepEqual(invalid.rows,heights.rows,'Incomplete/invalid input must not resize');
        await select([[0,0]]);
        const paddingBefore = await evaluate(client, read);
        await dispatchBrowserMouseClick(client, '[data-editor-cell-padding-toggle]');
        await dispatchBrowserMouseClick(client, '.template-toolbar-cell-padding-menu:not(.hidden) [data-editor-cell-padding-option="4"]');
        const padded = await evaluate(client, read);
        assert.equal(padded.padding[0][0],4,'Padding dropdown must apply pixels');
        assert.equal(padded.padding[0][1],paddingBefore.padding[0][1],'Other cells must retain old pt padding');
        await evaluate(client, 'window.blockRowResize.reload()');
        const reloaded = await evaluate(client, read);
        assert.deepEqual(reloaded.padding,padded.padding);
        reloaded.rows.forEach((height,index)=>assert.ok(Math.abs(height-padded.rows[index])<=2));
        reloaded.widths.forEach((width,index)=>assert.ok(Math.abs(width-padded.widths[index])<=2));
        await evaluate(client, `(() => {
          const table = document.querySelector(${prefix});
          table.rows[0].cells[0].rowSpan = 2;
          table.rows[1].cells[0].remove();
        })()`);
        await select([[0,0]]);
        const merged = await input('height','120');
        assert.ok(Math.abs(merged.rows[0]+merged.rows[1]-120)<=2,JSON.stringify({modal,zoom,merged}));
      } finally { await evaluate(client, 'window.blockRowResize.dispose()'); }
    }
  }
}

async function runCellSizeFocusCheck(client) {
  await evaluate(client, `(${setupTableSizing.toString()})(1, false, true)`);
  try {
    const points = await evaluate(client, `(() => {
      const table = document.querySelector('#templateEditorSurface .template-doc table');
      for (const cell of table.querySelectorAll('td')) cell.textContent = '셀';
      table.insertAdjacentHTML('afterbegin', '<colgroup>'+ '<col style="width:70px">'.repeat(5)+'</colgroup>');
      const paragraph = document.createElement('p'); paragraph.textContent = '표지'; table.before(paragraph);
      document.querySelector('#templateEditorSurface').focus();
      const range = document.createRange(); range.selectNodeContents(paragraph); range.collapse(true);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
      table.scrollIntoView({block:'center'});
      return [table.rows[0].cells[0], table.rows[0].cells[2]].map(cell => {
        const rect = cell.getBoundingClientRect();
        return {x:rect.left+rect.width/2, y:rect.top+rect.height/2};
      });
    })()`);
    await dispatchBrowserMouseDrag(client, points[0], points[1]);
    const read = `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
      const state = window.ExamListTemplateEditorRuntime.state.templateEditor;
      const input = document.querySelector('[data-template-cell-size-input="width"]');
      resolve({selected:state.tableSelection?.selectedCells.length || 0, disabled:input.disabled, focus:document.activeElement===input, active:document.activeElement?.id});
    })))`;
    const before = await evaluate(client, read);
    assert.equal(before.selected, 3, JSON.stringify(before));
    assert.equal(before.disabled, false);
    // Chromium may expose a root caret when focus leaves a cell drag with no text range.
    await evaluate(client, `(() => {
      const input = document.querySelector('[data-template-cell-size-input="width"]');
      input.addEventListener('mousedown', () => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('#templateEditorSurface .template-doc'));
        range.collapse(true);
        window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
      }, {once:true});
    })()`);
    await dispatchBrowserMouseClick(client, '[data-template-cell-size-input="width"]');
    const after = await evaluate(client, read);
    assert.equal(after.disabled, false, 'Clicking size input must not disable it: '+JSON.stringify(after));
    assert.equal(after.selected, 3, 'Toolbar focus must retain dragged cell selection');
    assert.equal(after.focus, true, JSON.stringify(after));
    const unselectedWidth = await evaluate(client, `document.querySelector('#templateEditorSurface .template-doc table').rows[0].cells[3].getBoundingClientRect().width`);
    await evaluate(client, `(() => {
      const input = document.querySelector('[data-template-cell-size-input="width"]');
      input.value = '80'; input.dispatchEvent(new Event('input', {bubbles:true}));
    })()`);
    const resized = await evaluate(client, `(() => {
      const table = document.querySelector('#templateEditorSurface .template-doc table');
      return Array.from(table.rows[0].cells, cell => cell.getBoundingClientRect().width);
    })()`);
    assert.ok(resized.slice(0,3).every(width=>Math.abs(width-80)<=2), JSON.stringify(resized));
    assert.ok(Math.abs(resized[3]-unselectedWidth)<=2, 'Unselected columns must retain their widths: '+JSON.stringify({resized,unselectedWidth}));
    await dispatchBrowserMouseClick(client, '[data-template-cell-size-input="height"]');
    const heightFocus = await evaluate(client, `({disabled:document.querySelector('[data-template-cell-size-input="height"]').disabled,
      focus:document.activeElement?.dataset.templateCellSizeInput,
      selected:window.ExamListTemplateEditorRuntime.state.templateEditor.tableSelection?.selectedCells.length})`);
    assert.deepEqual(heightFocus, {disabled:false, focus:'height', selected:3});
  } finally { await evaluate(client, 'window.blockRowResize.dispose()'); }
}

module.exports = { runTableSizeInputsCheck };
