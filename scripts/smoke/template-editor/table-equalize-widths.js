const assert = require("node:assert/strict");
const { evaluate } = require("../../smoke-browser-cdp");
const { setupTableSizing } = require("./table-row-boundary-resize");

async function runTableEqualizeWidthsCheck(client) {
  for (const modal of [false, true]) {
    for (const [zoom, count] of [1, 0.8, 1.25].flatMap(zoom => [2, 3, 5].map(count => [zoom, count]))) {
      await evaluate(client, `(${setupTableSizing.toString()})(${zoom}, ${modal})`);
      try {
        const result = await evaluate(client, `(async () => {
          let table = document.querySelector(${JSON.stringify(modal ? '[data-candidate-block-modal-editor-surface] table' : '#templateEditorSurface .template-doc table')});
          const host = table.closest('[data-candidate-block-instance]') || table.closest('.template-doc');
          const width = host.clientWidth - 1;
          const widths = [0.1, 0.5, 0.15, 0.15, 0.1].map(value => Math.floor(value * width));
          widths[4] += width - widths.reduce((a,b) => a+b, 0);
          table.style.width = width + 'px';
          table.querySelector('colgroup')?.remove();
          const group = document.createElement('colgroup');
          widths.forEach(value => { const col = document.createElement('col'); col.style.width = value + 'px'; group.append(col); });
          table.prepend(group);
          Array.from(table.rows[0].cells).forEach((cell, i) => cell.style.width = widths[i] + 'px');
          table.rows[1].cells[0].style.width = width + 'px';
          const read = () => {
            const scale = table.getBoundingClientRect().width / table.offsetWidth;
            return { width: table.offsetWidth, height: table.offsetHeight,
              widths: Array.from(table.rows[0].cells, cell => cell.getBoundingClientRect().width / scale) };
          };
          const before = read();
          const apply = async () => {
            const cells = Array.from(table.rows[0].cells).slice(0, ${count});
            const editor = window.ExamListTemplateEditorRuntime;
            const range = document.createRange(); range.selectNodeContents(cells[0]); range.collapse(true);
            const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
            editor.state.templateEditor.savedRange = range.cloneRange();
            editor.state.templateEditor.activeCellElement = cells[0];
            editor.state.templateEditor.tableSelection = { table, anchorCell: cells[0], focusCell: cells[cells.length - 1], selectedCells: cells,
              startColIndex: 0, endColIndex: ${count - 1}, startRowIndex: 0, endRowIndex: 0 };
            cells.forEach(cell => cell.classList.add('is-selected-cell'));
            document.dispatchEvent(new Event('selectionchange'));
            const button = document.querySelector('[data-template-table-action="equalize-column-widths"], [data-table-action="equalize-column-widths"]');
            if (!button) throw new Error('Equalize toolbar button missing');
            button.click();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return read();
          };
          const after = await apply(), repeated = await apply();
          await window.blockRowResize.reload();
          table = document.querySelector(${JSON.stringify(modal ? '[data-candidate-block-modal-editor-surface] table' : '#templateEditorSurface .template-doc table')});
          return { before, after, repeated, reloaded: read() };
        })()`);
        const { before, after } = result;
        const expected = before.widths.slice(0, count).reduce((sum, width) => sum + width, 0) / count;
        assert.ok(after.widths.slice(0, count).every(width => Math.abs(width - expected) <= 2), JSON.stringify({ modal, zoom, count, result }));
        assert.ok(Math.abs(after.width - before.width) <= 2, "equalizing must retain table width");
        assert.ok(Math.abs(after.height - before.height) <= 2, "equalizing must retain table height");
        for (let i = count; i < 5; i++) assert.ok(Math.abs(after.widths[i] - before.widths[i]) <= 2, "unselected columns must retain width");
        assert.ok(Math.abs(result.repeated.width - after.width) <= 2, "repeated equalizing retains table width");
        after.widths.forEach((width, i) => assert.ok(Math.abs(result.repeated.widths[i] - width) <= 1, "repeated equalizing is stable"));
        assert.ok(Math.abs(result.reloaded.width - after.width) <= 2, "table width survives reload");
        after.widths.forEach((width, i) => assert.ok(Math.abs(result.reloaded.widths[i] - width) <= 2, "equalized widths survive reload"));
      } finally { await evaluate(client, "window.blockRowResize.dispose()"); }
    }
  }
}

module.exports = { runTableEqualizeWidthsCheck };
