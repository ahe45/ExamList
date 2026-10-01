const assert = require("node:assert/strict");
const { evaluate } = require("../../../smoke-browser-cdp");
const { dragCellRowBoundaryPlain } = require("./drag");

async function runSavedMinimumHeightRowShrinkCase(client, zoom = 1) {
  // Geometry saved by the cover table object resize: both height and min-height
  // are recorded on cells, with a fixed height on the row group.
  const cell = '<td style="height:44px;min-height:44px;border:1px solid black;padding:5pt;font-size:14pt;line-height:20px">Text</td>';
  const html = '<div class="template-doc"><table id="savedMinimumTable" style="width:609px;height:132px;border-collapse:collapse;table-layout:fixed;position:absolute;left:56px;top:172px">' +
    '<colgroup><col style="width:157px"><col style="width:452px"></colgroup><tbody style="height:132px">' +
    `<tr style="height:44px">${cell.repeat(2)}</tr>`.repeat(3) + '</tbody></table></div>';
  await evaluate(client, `window.ExamListTemplateEditorRuntime.setHtml(${JSON.stringify(html)}, { resetHistory: false, notify: false })`);
  await evaluate(client, `document.getElementById('templateEditorSurface').style.transform = 'scale(${zoom})'`);
  const read = `(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const table = document.getElementById('savedMinimumTable');
    const scale = table.getBoundingClientRect().height / table.offsetHeight;
    return { height: table.offsetHeight, rows: Array.from(table.rows, row => row.getBoundingClientRect().height / scale),
      minimums: Array.from(table.rows, row => row.cells[0].style.minHeight) };
  })()`;
  const before = await evaluate(client, read);
  await dragCellRowBoundaryPlain(client, 1, 1, -100 * zoom, "saved cover first row minimum");
  const first = await evaluate(client, read);
  assert.ok(first.rows[0] < before.rows[0] - 5, JSON.stringify({ before, first }));
  await dragCellRowBoundaryPlain(client, 2, 1, -100 * zoom, "saved cover second row minimum");
  const second = await evaluate(client, read);
  assert.ok(Math.abs(first.height - before.height) <= 2, JSON.stringify({ before, first, second }));
  assert.ok(second.rows[0] < before.rows[0] - 5, JSON.stringify({ before, first, second }));
  assert.ok(second.rows[1] < before.rows[1] - 5, JSON.stringify({ before, first, second }));
  assert.ok(second.rows[2] > before.rows[2] + 10, "remaining height must go to the adjacent third row");
  assert.ok(Math.abs(second.height - before.height) <= 2, "second shrink must preserve table height");
  await evaluate(client, "window.ExamListTemplateEditorRuntime.setHtml(window.ExamListTemplateEditorRuntime.getHtml(), { resetHistory: false, notify: false })");
  const reopened = await evaluate(client, read);
  reopened.rows.forEach((height, index) => assert.ok(Math.abs(height - second.rows[index]) <= 2, "reopening must retain resized rows"));
  await evaluate(client, "document.getElementById('templateEditorSurface').style.transform = 'scale(1)'");
}

module.exports = { runSavedMinimumHeightRowShrinkCase };
