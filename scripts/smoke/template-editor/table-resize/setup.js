const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");

const THREE_BY_THREE_TABLE_HTML =
  '<div class="template-doc"><table><tbody>' +
  '<tr><td></td><td></td><td></td></tr>' +
  '<tr><td></td><td></td><td></td></tr>' +
  '<tr><td></td><td></td><td></td></tr>' +
  "</tbody></table></div>";

async function setFullWidthThreeByThreeTable(client, description) {
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><table style="width:100%;"><tbody>' +
            '<tr><td></td><td></td><td></td></tr>' +
            '<tr><td></td><td></td><td></td></tr>' +
            '<tr><td></td><td></td><td></td></tr>' +
          '</tbody></table></div>',
          { resetHistory: false, notify: false }
        );
        return true;
      })()
    `,
  );
  await waitForThreeByThreeTable(client, description);
}

async function setFixedThreeByThreeTable(
  client,
  { description, rowHeight = 32, setRowHeight = false, verifyColumnWidths = false } = {},
) {
  const cellHeight = `${rowHeight}px`;

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          ${JSON.stringify(THREE_BY_THREE_TABLE_HTML)},
          { resetHistory: false, notify: false }
        );

        const table = document.querySelector('#templateEditorSurface .template-doc table');

        if (!table) {
          return false;
        }

        let colGroup = table.querySelector('colgroup');

        if (!colGroup) {
          colGroup = document.createElement('colgroup');
          table.insertBefore(colGroup, table.firstElementChild);
        }

        colGroup.innerHTML = '<col><col><col>';
        [...colGroup.children].forEach((column) => {
          column.style.width = '120px';
        });
        table.style.width = '360px';
        table.style.maxWidth = 'none';
        table.style.tableLayout = 'fixed';
        table.style.borderCollapse = 'collapse';
        [...table.rows].forEach((row) => {
          if (${JSON.stringify(setRowHeight)}) {
            row.style.height = ${JSON.stringify(cellHeight)};
          }
          [...row.cells].forEach((cell) => {
            cell.style.border = '1px solid #1f2937';
            cell.style.padding = '0';
            cell.style.height = ${JSON.stringify(cellHeight)};
            cell.style.minWidth = '0';
            cell.style.width = '';
          });
        });
        return true;
      })()
    `,
  );
  await waitForThreeByThreeTable(client, description || "표 리사이즈 테스트용 표 초기화");

  if (verifyColumnWidths) {
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const columns = [...(table?.querySelectorAll('colgroup col') || [])].map((column) =>
            Number.parseFloat(String(column.style.width || '').replace('px', '')) || 0
          );
          const firstRowWidths = [...(table?.rows?.[0]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));

          return Boolean(
            table &&
              table.style.width === '360px' &&
              columns.length === 3 &&
              columns.reduce((sum, width) => sum + width, 0) === 360 &&
              firstRowWidths.length === 3 &&
              firstRowWidths.every((width) => Math.abs(width - 120) <= 2)
          );
        })()
      `,
      "Shift 드래그 회귀 테스트용 표 폭 안정화",
    );
  }
}

async function waitForThreeByThreeTable(client, description) {
  await waitForCondition(
    client,
    `document.querySelector('#templateEditorSurface .template-doc table')?.rows.length === 3`,
    description,
  );
}

module.exports = {
  setFixedThreeByThreeTable,
  setFullWidthThreeByThreeTable,
  waitForThreeByThreeTable,
};
