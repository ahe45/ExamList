const assert = require("node:assert/strict");
const { evaluate, dispatchBrowserMouseClick } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runTableInsertionSizeCheck(client) {
  for (const modal of [false, true]) {
    for (const zoom of [1, 0.8, 1.25]) {
      await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, ${modal})`);
      try {
        const selector = modal ? '[data-candidate-block-modal-editor-surface] table' : '#templateEditorSurface .template-doc table';
        const read = `(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const table = document.querySelector(${JSON.stringify(selector)});
          const scale = table.getBoundingClientRect().height / table.offsetHeight;
          return { rows: Array.from(table.rows, row => row.getBoundingClientRect().height / scale),
            columns: Array.from(table.querySelectorAll('col'), col => parseFloat(col.style.width)),
            cells: Array.from(table.rows, row => Array.from(row.cells, cell => ({
              text: cell.textContent, colSpan:cell.colSpan, rowSpan:cell.rowSpan,
              width:cell.getBoundingClientRect().width / scale, height:cell.getBoundingClientRect().height / scale }))) };
        })()`;
        for (const axis of ['row', 'column']) {
          for (const position of ['before', 'after']) {
            for (const kind of ['regular', 'tiny', 'merged']) {
              const action = `insert-${axis}-${position}`;
              await evaluate(client, `(() => {
                const table = document.querySelector(${JSON.stringify(selector)});
                table.style.width = '180px'; table.style.height = '80px';
                const cell = (text, extra = '') => '<td '+extra+' style="padding:0;border:1px solid black">'+text+'</td>';
                let rows = [2,47,31].map((height, r) => '<tr style="height:'+height+'px">'+
                  [0,1,2].map(c => r === 0 ? cell('').replaceAll('td', 'th') : cell(r+':'+c)).join('')+'</tr>').join('');
                if (${JSON.stringify(kind)} === 'merged') {
                  if (${JSON.stringify(axis)} === 'column') {
                    rows = '<tr style="height:49px">'+cell('merged','colspan="2"')+cell('right')+'</tr>'+
                      '<tr style="height:31px">'+cell('a')+cell('b')+cell('c')+'</tr>';
                  } else {
                    rows = '<tr style="height:2px">'+cell('merged','rowspan="2"')+cell('a','colspan="2"')+'</tr>'+
                      '<tr style="height:47px">'+cell('b','colspan="2"')+'</tr>'+
                      '<tr style="height:31px">'+cell('c')+cell('d')+cell('e')+'</tr>';
                  }
                }
                table.innerHTML = '<colgroup><col style="width:2px"><col style="width:73px"><col style="width:105px"></colgroup><tbody>'+rows+'</tbody>';
              })()`);
              await evaluate(client, 'window.blockRowResize.reload()');
              const source = await evaluate(client, `(async () => {
                const table = document.querySelector(${JSON.stringify(selector)});
                const row = ${JSON.stringify(kind)} === 'regular' ? 1 : 0;
                const col = ${JSON.stringify(kind)} === 'regular' ? 1 : 0;
                const cell = table.rows[row].cells[col];
                const scale = table.getBoundingClientRect().height / table.offsetHeight;
                const range = document.createRange(); range.selectNodeContents(cell); range.collapse(true);
                document.querySelector('#templateEditorSurface').focus();
                getSelection().removeAllRanges(); getSelection().addRange(range);
                const state = window.ExamListTemplateEditorRuntime.state.templateEditor;
                state.activeCellElement = cell; state.savedRange = range.cloneRange();
                state.savedSelectionSnapshot = null; state.tableSelection = null;
                document.dispatchEvent(new Event('selectionchange'));
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                return {row, col, colSpan:cell.colSpan, rowSpan:cell.rowSpan,
                  width:cell.getBoundingClientRect().width / scale, height:cell.getBoundingClientRect().height / scale};
              })()`);
              const before = await evaluate(client, read);
              await dispatchBrowserMouseClick(client, '[data-template-table-action="'+action+'"]');
              const after = await evaluate(client, read);
              const dimension = axis === 'row' ? 'rows' : 'columns';
              const index = axis === 'row' ? source.row + (position === 'after' ? source.rowSpan : 0)
                : source.col + (position === 'after' ? source.colSpan : 0);
              const expected = axis === 'row' ? source.height : source.width;
              const context = JSON.stringify({modal,zoom,kind,action,source,before,after});
              assert.equal(after[dimension].length, before[dimension].length + 1, context);
              assert.ok(Math.abs(after[dimension][index] - expected) <= 0.15, context);
              const retained = after[dimension].filter((_, i) => i !== index);
              retained.forEach((size, i) => assert.ok(Math.abs(size - before[dimension][i]) <= 0.15, context));
              await evaluate(client, 'window.blockRowResize.reload()');
              const reloaded = await evaluate(client, read);
              reloaded[dimension].forEach((size, i) => assert.ok(Math.abs(size - after[dimension][i]) <= 0.15, 'Reload changed inserted sizes: '+context));
            }
          }
        }
      } finally { await evaluate(client, 'window.blockRowResize.dispose()'); }
    }
  }
}

module.exports = { runTableInsertionSizeCheck };
