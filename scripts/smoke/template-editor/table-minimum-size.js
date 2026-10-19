const assert = require("node:assert/strict");
const { evaluate, dispatchBrowserMouseDrag } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runTableMinimumSizeCheck(client) {
  for (const modal of [false, true]) {
    for (const zoom of [1, 0.8, 1.25]) {
      await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, ${modal})`);
      try {
        const selector = modal ? '[data-candidate-block-modal-editor-surface] table' : '#templateEditorSurface .template-doc table';
        const read = `(async () => {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const table = document.querySelector(${JSON.stringify(selector)});
          const cell = table.rows[0].cells[0], rect = cell.getBoundingClientRect();
          const scale = table.getBoundingClientRect().width / table.offsetWidth;
          const style = getComputedStyle(cell);
          // Collapsed borders occupy half their width on each side of a cell.
          return { width: rect.width / scale - (parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)) / 2,
            height: rect.height / scale - (parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)) / 2,
            lineHeight: style.lineHeight, empty: cell.hasAttribute('data-template-empty-cell'),
            point: {x:rect.right, y:rect.top + rect.height / 2},
            rowPoint: {x:rect.left + rect.width / 2, y:rect.bottom}, scale };
        })()`;
        for (const placeholder of ['', '<br>', '<p><br></p>', '<div><span><br></span></div>']) {
          await evaluate(client, `(() => {
            const table = document.querySelector(${JSON.stringify(selector)});
            table.style.width = '350px'; table.style.height = '100px';
            const cell = ${JSON.stringify('<td style="padding:0;border:1px solid black">' + placeholder + '</td>')};
            table.innerHTML = '<colgroup><col style="width:100px"><col style="width:250px"></colgroup><tbody>' +
              '<tr style="height:50px">' + cell.repeat(2) + '</tr>' +
              '<tr style="height:50px">' + cell.repeat(2) + '</tr></tbody>';
          })()`);
          // Save/reopen also runs the same normalization as loaded documents.
          await evaluate(client, 'window.blockRowResize.reload()');
          async function input(dimension, value) {
            await evaluate(client, `(async () => {
              const table = document.querySelector(${JSON.stringify(selector)}), cell = table.rows[0].cells[0];
              const range = document.createRange(); range.selectNodeContents(cell); range.collapse(true);
              const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
              const state = window.ExamListTemplateEditorRuntime.state.templateEditor;
              state.savedRange = range.cloneRange(); state.activeCellElement = cell;
              state.savedSelectionSnapshot = null; state.tableSelection = null;
              document.dispatchEvent(new Event('selectionchange'));
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              const input = document.querySelector('[data-template-cell-size-input="${dimension}"]');
              input.focus();
              input.value = '${value}'; input.dispatchEvent(new Event('input', {bubbles:true}));
            })()`);
          }
          await input('width', 1);
          await input('height', 1);
          let result = await evaluate(client, read);
          const check = stage => {
            assert.ok(Math.abs(result.width - 1) < 0.12, JSON.stringify({stage, modal, zoom, placeholder, result}));
            assert.ok(Math.abs(result.height - 1) < 0.12, JSON.stringify({stage, modal, zoom, placeholder, result}));
          };
          check('numeric');
          await evaluate(client, 'window.blockRowResize.reload()');
          result = await evaluate(client, read);
          check('reload');
          await input('width', 40);
          await input('height', 40);
          const before = await evaluate(client, read);
          await dispatchBrowserMouseDrag(client, before.rowPoint, {x:before.rowPoint.x, y:before.rowPoint.y - 100 * before.scale});
          result = await evaluate(client, read);
          assert.ok(Math.abs(result.height - 1) < 0.12, JSON.stringify({stage:'row drag', modal, zoom, placeholder, result}));
          // Restore a comfortable hit area before shrinking the column.
          await input('height', 40);
          const column = await evaluate(client, read);
          await dispatchBrowserMouseDrag(client, column.point, {x:column.point.x - 100 * column.scale, y:column.point.y});
          result = await evaluate(client, read);
          assert.ok(Math.abs(result.width - 1) < 0.12, JSON.stringify({stage:'column drag', modal, zoom, placeholder, result}));
          await evaluate(client, `(() => {
            const cell = document.querySelector(${JSON.stringify(selector)}).rows[0].cells[0];
            cell.textContent = 'Text';
            (cell.closest('[contenteditable="true"]') || document.querySelector('#templateEditorSurface'))
              .dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:'Text'}));
          })()`);
          result = await evaluate(client, read);
          assert.equal(result.empty, false, 'Typing must restore normal text line height: ' + JSON.stringify({modal,zoom,placeholder,result}));
          assert.notEqual(result.lineHeight, '1px');
        }
      } finally { await evaluate(client, 'window.blockRowResize.dispose()'); }
    }
  }
}

module.exports = { runTableMinimumSizeCheck };
