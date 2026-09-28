const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runTableEqualizeHeightsCheck(client) {
  for (const modal of [false, true]) {
    for (const [zoom, count, compact] of [1, 0.8, 1.25].flatMap(zoom => [2, 3, 5].flatMap(count => [false, true].map(compact => [zoom, count, compact])))) {
      await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, ${modal})`);
      try {
        const result = await evaluate(client, `(async () => {
          const selector = ${JSON.stringify(modal ? '[data-candidate-block-modal-editor-surface] table' : '#templateEditorSurface .template-doc table')};
          let table = document.querySelector(selector);
          const heights = ${JSON.stringify(compact ? [26,42,28,30,24] : [30,150,45,45,40])};
          const total = heights.reduce((sum, height) => sum + height, 0);
          table.innerHTML = '<colgroup><col style="width:175px"><col style="width:175px"></colgroup><tbody>' + heights.map((height,i) =>
            '<tr style="height:' + height + 'px">' +
            (i === 0 ? '<td rowspan="2" style="height:' + (heights[0] + heights[1]) + 'px;padding:0;border:1px solid black"><br></td>' :
             i === 1 ? '' : '<td style="height:' + height + 'px;padding:0;border:1px solid black"><br></td>') +
            '<td style="height:' + height + 'px;padding:0;border:1px solid black"><br></td></tr>').join('') + '</tbody>';
          table.style.height = total + 'px';
          table.tBodies[0].style.height = total + 'px';
          const read = () => {
            const scale = table.getBoundingClientRect().height / table.offsetHeight;
            return { width: table.offsetWidth, height: table.offsetHeight,
              heights: Array.from(table.rows, row => row.getBoundingClientRect().height / scale),
              mergedHeight: table.rows[0].cells[0].getBoundingClientRect().height / scale };
          };
          const apply = async () => {
            const cells = Array.from(table.rows).slice(0, ${count}).map(row => row.cells[row.cells.length - 1]);
            const editor = window.ExamListTemplateEditorRuntime;
            const range = document.createRange(); range.selectNodeContents(cells[0]); range.collapse(true);
            const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
            editor.state.templateEditor.savedRange = range.cloneRange();
            editor.state.templateEditor.activeCellElement = cells[0];
            editor.state.templateEditor.tableSelection = { table, anchorCell: cells[0], focusCell: cells[cells.length - 1], selectedCells: cells,
              startColIndex: 1, endColIndex: 1, startRowIndex: 0, endRowIndex: ${count - 1} };
            cells.forEach(cell => cell.classList.add('is-selected-cell'));
            document.dispatchEvent(new Event('selectionchange'));
            const button = document.querySelector('[data-template-table-action="equalize-row-heights"], [data-table-action="equalize-row-heights"]');
            if (!button) throw new Error('Equalize toolbar button missing');
            button.click();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return read();
          };
          const before = read(), after = await apply(), repeated = await apply();
          await window.blockRowResize.reload();
          table = document.querySelector(selector);
          return { before, after, repeated, reloaded: read() };
        })()`);
        const { before } = result;
        const expected = before.heights.slice(0, count).reduce((sum, height) => sum + height, 0) / count;
        for (const stage of ["after", "repeated", "reloaded"]) {
          const after = result[stage];
          const diagnostic = JSON.stringify({ modal, zoom, count, compact, stage, result });
          assert.ok(after.heights.slice(0, count).every(height => Math.abs(height - expected) <= 2), diagnostic);
          assert.ok(Math.abs(after.height - before.height) <= 2, diagnostic);
          assert.ok(Math.abs(after.width - before.width) <= 2, diagnostic);
          assert.ok(Math.abs(after.mergedHeight - after.heights[0] - after.heights[1]) <= 2, diagnostic);
          for (let i = count; i < 5; i++) assert.ok(Math.abs(after.heights[i] - before.heights[i]) <= 2, diagnostic);
        }
      } finally { await evaluate(client, "window.blockRowResize.dispose()"); }
    }
  }
}

module.exports = { runTableEqualizeHeightsCheck };
