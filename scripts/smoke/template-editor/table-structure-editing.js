const {
  dispatchBrowserMouseClick,
  evaluate,
  waitForCondition
} = require("../../smoke-browser-cdp");

const CELL_SPLIT_TOGGLE_SELECTOR = "#templateEditorToolbarHost [data-template-cell-split-toggle]";
const CELL_SPLIT_CONFIRM_SELECTOR = "#templateEditorToolbarHost [data-template-cell-split-confirm]";

async function ensureCellSplitPanelOpen(client) {
  await waitForCondition(
    client,
    `
      (() => {
        const tableGroup = document.querySelector('#templateEditorToolbarHost [data-editor-table-toolbar-group]');
        const toggle = document.querySelector(${JSON.stringify(CELL_SPLIT_TOGGLE_SELECTOR)});

        return Boolean(
          tableGroup &&
            tableGroup.getAttribute('aria-disabled') !== 'true' &&
            toggle &&
            !toggle.disabled &&
            toggle.getAttribute('aria-disabled') !== 'true'
        );
      })()
    `,
    "셀 분할 버튼 활성",
  );
  const isHidden = await evaluate(
    client,
    `document.querySelector('#templateEditorToolbarHost .template-toolbar-cell-split-panel')?.classList.contains('hidden') === true`,
  );

  if (isHidden) {
    await dispatchBrowserMouseClick(client, CELL_SPLIT_TOGGLE_SELECTOR);
  }

  await waitForCondition(
    client,
    `!document.querySelector('#templateEditorToolbarHost .template-toolbar-cell-split-panel')?.classList.contains('hidden')`,
    "셀 분할 패널 열림",
  );
}

async function confirmFirstCellSplit(client) {
  await evaluate(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');

        if (!surface || !cell) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        surface.focus();
        range.selectNodeContents(cell);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await dispatchBrowserMouseClick(client, CELL_SPLIT_CONFIRM_SELECTOR);
}

async function confirmCurrentCellSplit(client) {
  await dispatchBrowserMouseClick(client, CELL_SPLIT_CONFIRM_SELECTOR);
}

async function runTableStructureEditingScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><table style="width: 240px; table-layout: fixed;"><colgroup><col style="width: 120px;"><col style="width: 120px;"></colgroup><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table></div>',
            { resetHistory: false, notify: false }
          );

          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');

          if (!surface || !cell) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.selectNodeContents(cell);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await ensureCellSplitPanelOpen(client);
    await evaluate(
      client,
      `
        (() => {
          const panel = document.querySelector('#templateEditorToolbarHost .template-toolbar-cell-split-panel');
          const countInput = panel?.querySelector('input[type="number"]');
          const columnRadio = panel?.querySelector('input[type="radio"][value="column"]');

          if (!panel || !countInput || !columnRadio) {
            return false;
          }

          columnRadio.checked = true;
          countInput.value = '2';
          return true;
        })()
      `,
    );
    await ensureCellSplitPanelOpen(client);
    await confirmFirstCellSplit(client);
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const firstRow = table?.rows?.[0];
          const secondRow = table?.rows?.[1];
          const colWidths = [...(table?.querySelectorAll('colgroup > col') || [])]
            .map((col) => Number.parseFloat(col.style.width) || 0);
          const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);

          return Boolean(
            table &&
              table.rows.length === 2 &&
              colWidths.length === 3 &&
              Math.abs(totalWidth - 240) <= 2 &&
              Math.abs(colWidths[0] - 60) <= 2 &&
              Math.abs(colWidths[1] - 60) <= 2 &&
              Math.abs(colWidths[2] - 120) <= 2 &&
              firstRow?.cells.length === 3 &&
              firstRow.cells[0].textContent.trim() === 'A' &&
              Math.abs((Number.parseFloat(firstRow.cells[0].style.width) || 0) - 60) <= 2 &&
              Math.abs((Number.parseFloat(firstRow.cells[1].style.width) || 0) - 60) <= 2 &&
              secondRow?.cells.length === 2 &&
              secondRow.cells[0].colSpan === 2
          );
        })()
      `,
      "일반 표 셀 열 방향 분할",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><table style="width: 240px; table-layout: fixed;"><colgroup><col style="width: 120px;"><col style="width: 120px;"></colgroup><tbody><tr style="height: 80px;"><td style="height: 80px;">A</td><td style="height: 80px;">B</td></tr><tr style="height: 40px;"><td style="height: 40px;">C</td><td style="height: 40px;">D</td></tr></tbody></table></div>',
            { resetHistory: false, notify: false }
          );

          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');

          if (!surface || !cell) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.selectNodeContents(cell);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

          const panel = document.querySelector('#templateEditorToolbarHost .template-toolbar-cell-split-panel');
          const rowRadio = panel?.querySelector('input[type="radio"][value="row"]');
          const countInput = panel?.querySelector('input[type="number"]');

          if (!panel || !rowRadio || !countInput) {
            return false;
          }

          rowRadio.checked = true;
          countInput.value = '2';
          return true;
        })()
      `,
    );
    await ensureCellSplitPanelOpen(client);
    await confirmFirstCellSplit(client);
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const firstRow = table?.rows?.[0];
          const splitRow = table?.rows?.[1];
          const lastRow = table?.rows?.[2];
          const firstHeight = Number.parseFloat(firstRow?.style.height) || 0;
          const splitHeight = Number.parseFloat(splitRow?.style.height) || 0;

          return Boolean(
            table &&
              table.rows.length === 3 &&
              Math.abs(firstHeight - 40) <= 2 &&
              Math.abs(splitHeight - 40) <= 2 &&
              firstRow?.cells.length === 2 &&
              firstRow.cells[0].textContent.trim() === 'A' &&
              Math.abs((Number.parseFloat(firstRow.cells[0].style.height) || 0) - 40) <= 2 &&
              firstRow.cells[1].rowSpan === 2 &&
              splitRow?.cells.length === 1 &&
              Math.abs((Number.parseFloat(splitRow.cells[0].style.height) || 0) - 40) <= 2 &&
              lastRow?.cells.length === 2
          );
        })()
      `,
      "일반 표 셀 행 방향 분할",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><table style="width: 240px; table-layout: fixed;"><colgroup><col style="width: 120px;"><col style="width: 120px;"></colgroup><tbody><tr style="height: 24px;"><td style="height: 24px;">A</td><td style="height: 24px;">B</td></tr><tr style="height: 30px;"><td style="height: 30px;">C</td><td style="height: 30px;">D</td></tr></tbody></table></div>',
            { resetHistory: false, notify: false }
          );

          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');
          const panel = document.querySelector('#templateEditorToolbarHost .template-toolbar-cell-split-panel');
          const rowRadio = panel?.querySelector('input[type="radio"][value="row"]');
          const countInput = panel?.querySelector('input[type="number"]');

          if (!surface || !cell || !panel || !rowRadio || !countInput) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.selectNodeContents(cell);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

          rowRadio.checked = true;
          countInput.value = '2';
          return true;
        })()
      `,
    );
    await ensureCellSplitPanelOpen(client);
    await confirmFirstCellSplit(client);
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const firstRow = table?.rows?.[0];
          const splitRow = table?.rows?.[1];
          const lastRow = table?.rows?.[2];
          const firstHeight = Number.parseFloat(firstRow?.style.height) || 0;
          const splitHeight = Number.parseFloat(splitRow?.style.height) || 0;

          return Boolean(
            table &&
              table.rows.length === 3 &&
              Math.abs(firstHeight - 24) <= 1 &&
              Math.abs(splitHeight - 24) <= 1 &&
              firstRow?.cells.length === 2 &&
              firstRow.cells[1].rowSpan === 2 &&
              splitRow?.cells.length === 1 &&
              lastRow?.cells.length === 2
          );
        })()
      `,
      "최소 높이 셀 행 분할 시 같은 높이 행 추가",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><table style="width: 240px; table-layout: fixed;"><colgroup><col style="width: 120px;"><col style="width: 120px;"></colgroup><tbody><tr style="height: 80px;"><td style="height: 80px;">A</td><td style="height: 80px;">B</td></tr><tr style="height: 40px;"><td style="height: 40px;">C</td><td style="height: 40px;">D</td></tr></tbody></table></div>',
            { resetHistory: false, notify: false }
          );

          const editor = window.ExamListTemplateEditorRuntime;
          const surface = document.querySelector('#templateEditorSurface');
          const table = surface?.querySelector('.template-doc table');
          const firstCell = table?.rows?.[0]?.cells?.[0];
          const secondCell = table?.rows?.[0]?.cells?.[1];
          const panel = document.querySelector('#templateEditorToolbarHost .template-toolbar-cell-split-panel');
          const rowRadio = panel?.querySelector('input[type="radio"][value="row"]');
          const countInput = panel?.querySelector('input[type="number"]');

          if (!editor?.state?.templateEditor || !surface || !table || !firstCell || !secondCell || !panel || !rowRadio || !countInput) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.selectNodeContents(firstCell);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          firstCell.classList.add('is-active-cell', 'is-selected-cell');
          secondCell.classList.add('is-selected-cell');
          editor.state.templateEditor.savedRange = range.cloneRange();
          editor.state.templateEditor.activeCellElement = firstCell;
          editor.state.templateEditor.tableSelection = {
            table,
            anchorCell: firstCell,
            focusCell: secondCell,
            selectedCells: [firstCell, secondCell],
            startRowIndex: 0,
            endRowIndex: 0,
            startColIndex: 0,
            endColIndex: 1,
          };

          rowRadio.checked = true;
          countInput.value = '2';
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await ensureCellSplitPanelOpen(client);
    await confirmCurrentCellSplit(client);
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const firstRow = table?.rows?.[0];
          const splitRow = table?.rows?.[1];
          const lastRow = table?.rows?.[2];

          return Boolean(
            table &&
              table.rows.length === 3 &&
              firstRow?.cells.length === 2 &&
              splitRow?.cells.length === 2 &&
              lastRow?.cells.length === 2 &&
              firstRow.cells[0].textContent.trim() === 'A' &&
              firstRow.cells[1].textContent.trim() === 'B' &&
              firstRow.cells[0].rowSpan === 1 &&
              firstRow.cells[1].rowSpan === 1 &&
              splitRow.cells[0].rowSpan === 1 &&
              splitRow.cells[1].rowSpan === 1
          );
        })()
      `,
      "선택한 여러 셀 행 방향 동시 분할",
    );
}

module.exports = { runTableStructureEditingScenario };
