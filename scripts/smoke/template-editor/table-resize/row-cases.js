const { evaluate, getEditorTableMetrics, waitForCondition } = require("../../../smoke-browser-cdp");
const {
  dragCellColumnBoundary,
  dragCellRowBoundary,
  dragCellRowBoundaryPlain,
  dragCellTopRowBoundaryPlain,
  dragLogicalCellColumnBoundary,
  dragLogicalCellRowBoundary,
} = require("./drag");
const { expectCapturedTableMetrics } = require("./metrics");
const { setFixedThreeByThreeTable } = require("./setup");

async function runFixedSingleCellShiftRowResizeCases(client) {
  await setFixedThreeByThreeTable(client, {
    description: "Shift 드래그 행 높이 회귀 테스트용 표 초기화",
    rowHeight: 40,
    setRowHeight: true,
  });
  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellRowBoundary(client, 1, 1, 2, "단일 셀 Shift 행 미세 확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        Math.abs(current.columnHeightTotals[0] - before.columnHeightTotals[0]) <= 2 &&
        current.columnCellHeights[0][0] >= before.columnCellHeights[0][0] + 1 &&
        current.columnCellHeights[0][1] <= before.columnCellHeights[0][1] - 1 &&
        Math.abs(current.columnCellHeights[1][0] - before.columnCellHeights[1][0]) <= 2 &&
        Math.abs(current.columnCellHeights[1][1] - before.columnCellHeights[1][1]) <= 2
    `,
    "단일 셀 Shift 행 미세 확대 시 표 전체 높이 유지",
  );

  await dragCellRowBoundary(client, 1, 1, -2, "단일 셀 Shift 행 미세 확대 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        Math.abs(current.columnCellHeights[0][0] - before.columnCellHeights[0][0]) <= 2 &&
        Math.abs(current.columnCellHeights[0][1] - before.columnCellHeights[0][1]) <= 2 &&
        Math.abs(current.columnCellHeights[1][0] - before.columnCellHeights[1][0]) <= 2
    `,
    "단일 셀 Shift 행 미세 확대 후 복귀 시 표 전체 높이 유지",
  );

  await dragCellRowBoundary(client, 1, 1, -10, "단일 셀 Shift 행 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        current.columnCellHeights[0][0] <= before.columnCellHeights[0][0] - 8 &&
        current.columnCellHeights[0][1] >= before.columnCellHeights[0][1] + 8 &&
        Math.abs(current.columnCellHeights[1][0] - before.columnCellHeights[1][0]) <= 2
    `,
    "단일 셀 Shift 행 축소 시 다른 열 높이 유지",
  );

  await dragCellRowBoundary(client, 1, 1, 10, "단일 셀 Shift 행 축소 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        Math.abs(current.columnCellHeights[0][0] - before.columnCellHeights[0][0]) <= 2 &&
        Math.abs(current.columnCellHeights[0][1] - before.columnCellHeights[0][1]) <= 2 &&
        Math.abs(current.columnCellHeights[1][1] - before.columnCellHeights[1][1]) <= 2
    `,
    "단일 셀 Shift 행 축소 후 복귀 시 표 전체 높이 유지",
  );

  await dragCellRowBoundary(client, 1, 1, 12, "단일 셀 Shift 행 확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        current.columnCellHeights[0][0] >= before.columnCellHeights[0][0] + 10 &&
        current.columnCellHeights[0][1] <= before.columnCellHeights[0][1] - 10 &&
        Math.abs(current.columnCellHeights[1][0] - before.columnCellHeights[1][0]) <= 2 &&
        Math.abs(current.columnCellHeights[1][1] - before.columnCellHeights[1][1]) <= 2
    `,
    "단일 셀 Shift 행 확대 시 표 전체 높이 및 다른 열 유지",
  );
}

async function runMixedRowThenColumnResizeCase(client) {
  await setFixedThreeByThreeTable(client, { rowHeight: 40, setRowHeight: true });
  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellRowBoundary(client, 1, 1, 12, "개별 행 높이 선적용 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        current.columnCellHeights[0][0] >= before.columnCellHeights[0][0] + 10 &&
        current.columnCellHeights[0][1] <= before.columnCellHeights[0][1] - 10
    `,
    "개별 행 높이 선적용",
  );

  const afterRowMetrics = await getEditorTableMetrics(client);
  await dragLogicalCellColumnBoundary(client, 3, 1, 12, "개별 행 높이 적용 후 다른 셀 너비 조정 시작");
  await expectCapturedTableMetrics(
    client,
    afterRowMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        current.logicalRowCellWidths[2][0] >= before.logicalRowCellWidths[2][0] + 10 &&
        Math.abs(current.columnCellHeights[0][0] - before.columnCellHeights[0][0]) <= 2 &&
        Math.abs(current.columnCellHeights[1][0] - before.columnCellHeights[1][0]) <= 2
    `,
    "개별 행 높이 적용 후 다른 셀 너비 조정",
  );
}

async function runMixedColumnThenRowResizeCase(client) {
  await setFixedThreeByThreeTable(client, { rowHeight: 40, setRowHeight: true });
  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellColumnBoundary(client, 1, 1, 80, "개별 열 너비 선적용 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        current.logicalRowCellWidths[0][0] >= before.logicalRowCellWidths[0][0] + 60 &&
        current.logicalRowCellWidths[1][0] <= before.logicalRowCellWidths[1][0] + 2
    `,
    "개별 열 너비 선적용",
  );

  const afterColumnMetrics = await getEditorTableMetrics(client);
  await dragLogicalCellRowBoundary(client, 2, 2, 10, "개별 열 너비 적용 후 다른 셀 높이 조정 시작");
  await expectCapturedTableMetrics(
    client,
    afterColumnMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.tableHeight - before.tableHeight) <= 2 &&
        current.columnCellHeights[1][1] >= before.columnCellHeights[1][1] + 8 &&
        current.columnCellHeights[1][2] <= before.columnCellHeights[1][2] - 8 &&
        Math.abs(current.logicalRowCellWidths[0][0] - before.logicalRowCellWidths[0][0]) <= 2
    `,
    "개별 열 너비 적용 후 다른 셀 높이 조정",
  );
}

async function runConfiguredHeightFirstRowShrinkCase(client) {
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc">' +
            '<table id="plainTableConfiguredRowShrinkSmoke" style="width:360px;height:520px;max-width:none;table-layout:fixed;border-collapse:collapse;">' +
              '<colgroup><col style="width:180px"><col style="width:180px"></colgroup>' +
              '<tbody>' +
                '<tr style="height:360px"><td style="border:1px solid #111;padding:0;height:360px"><br></td><td style="border:1px solid #111;padding:0;height:360px"><br></td></tr>' +
                '<tr><td style="border:1px solid #111;padding:0"><br></td><td style="border:1px solid #111;padding:0"><br></td></tr>' +
                '<tr><td style="border:1px solid #111;padding:0"><br></td><td style="border:1px solid #111;padding:0"><br></td></tr>' +
                '<tr><td style="border:1px solid #111;padding:0"><br></td><td style="border:1px solid #111;padding:0"><br></td></tr>' +
                '<tr><td style="border:1px solid #111;padding:0"><br></td><td style="border:1px solid #111;padding:0"><br></td></tr>' +
              '</tbody>' +
            '</table>' +
          '</div>',
          { resetHistory: false, notify: false }
        );
        const table = document.querySelector('#plainTableConfiguredRowShrinkSmoke');

        if (!table) {
          return false;
        }

        table.style.width = '360px';
        table.style.height = '520px';
        table.style.maxWidth = 'none';
        table.style.tableLayout = 'fixed';
        table.style.borderCollapse = 'collapse';
        table.tBodies[0].style.removeProperty('height');
        [...table.querySelectorAll('colgroup col')].forEach((column) => {
          column.style.width = '180px';
        });
        [...table.rows].forEach((row, rowIndex) => {
          if (rowIndex === 0) {
            row.style.height = '360px';
          } else {
            row.style.removeProperty('height');
          }

          [...row.cells].forEach((cell) => {
            cell.style.border = '1px solid #111';
            cell.style.padding = '0';
            cell.style.removeProperty('min-height');
            cell.style.textAlign = 'left';
            cell.style.verticalAlign = 'middle';

            if (rowIndex === 0) {
              cell.style.height = '360px';
            } else {
              cell.style.removeProperty('height');
            }
          });
        });
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const table = document.querySelector('#plainTableConfiguredRowShrinkSmoke');
        const firstCell = table?.rows?.[0]?.cells?.[0];
        const secondRowCell = table?.rows?.[1]?.cells?.[0];

        return Boolean(
          table &&
            Math.round(table.getBoundingClientRect().height) >= 500 &&
            Math.round(firstCell?.getBoundingClientRect?.().height || 0) >= 340 &&
            Math.round(secondRowCell?.getBoundingClientRect?.().height || 0) <= 60
        );
      })()
    `,
    "일반 표 행 축소 회귀 테스트 초기 행 높이 안정화",
  );

  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellRowBoundaryPlain(client, 1, 1, -300, "일반 표 첫 행 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      current.columnCellHeights[0][0] <= before.columnCellHeights[0][0] - 250 &&
        Math.abs(current.columnCellHeights[0][1] - before.columnCellHeights[0][1]) <= 3 &&
        Math.abs(current.columnCellHeights[0][2] - before.columnCellHeights[0][2]) <= 3 &&
        Math.abs(current.columnCellHeights[0][3] - before.columnCellHeights[0][3]) <= 3 &&
        Math.abs(current.columnCellHeights[0][4] - before.columnCellHeights[0][4]) <= 3 &&
        current.tableHeight <= before.tableHeight - 250
    `,
    "일반 표 첫 행 축소 시 다른 행 높이 유지",
  );
}

async function runStaleTableHeightMiddleRowShrinkCase(client) {
  await evaluate(
    client,
    `
      (() => {
        let rowsHtml = "";

        for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
          rowsHtml +=
            '<tr>' +
              '<td style="border:1px solid #111;padding:0"><br></td>' +
              '<td style="border:1px solid #111;padding:0"><br></td>' +
            '</tr>';
        }

        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc">' +
            '<table id="plainTableStaleRowHeightShrinkSmoke" style="width:360px;max-width:none;table-layout:fixed;border-collapse:collapse;">' +
              '<colgroup><col style="width:180px"><col style="width:180px"></colgroup>' +
              '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
          '</div>',
          { resetHistory: false, notify: false }
        );

        const table = document.querySelector('#plainTableStaleRowHeightShrinkSmoke');

        if (!table) {
          return false;
        }

        table.style.height = '400px';
        [...table.rows].forEach((row) => {
          row.style.height = '24px';
          [...row.cells].forEach((cell) => {
            cell.style.height = '24px';
            cell.style.removeProperty('min-height');
          });
        });
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const table = document.querySelector('#plainTableStaleRowHeightShrinkSmoke');
        const rows = [...(table?.rows || [])];

        return Boolean(
          table &&
            Math.round(table.getBoundingClientRect().height) >= 395 &&
            rows.length === 5 &&
            rows.every((row) => row.style.height === '24px') &&
            rows.every((row) => Math.round(row.getBoundingClientRect().height) >= 75)
        );
      })()
    `,
    "일반 표 stale 행 높이 회귀 테스트 초기 상태",
  );

  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellRowBoundaryPlain(client, 2, 1, -20, "일반 표 stale 중간 행 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      current.tableHeight >= before.tableHeight - 25 &&
        current.tableHeight <= before.tableHeight - 15 &&
        Math.abs(current.columnCellHeights[0][0] - before.columnCellHeights[0][0]) <= 3 &&
        current.columnCellHeights[0][1] <= before.columnCellHeights[0][1] - 15 &&
        Math.abs(current.columnCellHeights[0][2] - before.columnCellHeights[0][2]) <= 3 &&
        Math.abs(current.columnCellHeights[0][3] - before.columnCellHeights[0][3]) <= 3 &&
        Math.abs(current.columnCellHeights[0][4] - before.columnCellHeights[0][4]) <= 3
    `,
    "일반 표 stale 중간 행 축소 시 표 높이 접힘 방지",
  );
}

async function runPercentTableHeightMiddleRowShrinkCase(client) {
  await evaluate(
    client,
    `
      (() => {
        let rowsHtml = "";

        for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
          rowsHtml +=
            '<tr style="height:24px">' +
              '<td style="border:1px solid #111;padding:0;height:24px"><br></td>' +
              '<td style="border:1px solid #111;padding:0;height:24px"><br></td>' +
            '</tr>';
        }

        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc">' +
            '<div style="height:400px;width:360px">' +
              '<table id="plainTablePercentRowHeightShrinkSmoke" style="width:360px;height:100%;max-width:none;table-layout:fixed;border-collapse:collapse;">' +
                '<colgroup><col style="width:180px"><col style="width:180px"></colgroup>' +
                '<tbody>' + rowsHtml + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>',
          { resetHistory: false, notify: false }
        );
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const table = document.querySelector('#plainTablePercentRowHeightShrinkSmoke');
        const rows = [...(table?.rows || [])];

        return Boolean(
          table &&
            table.style.height === '100%' &&
            Math.round(table.getBoundingClientRect().height) >= 395 &&
            rows.length === 5 &&
            rows.every((row) => row.style.height === '24px') &&
            rows.every((row) => Math.round(row.getBoundingClientRect().height) >= 75)
        );
      })()
    `,
    "일반 표 퍼센트 높이 회귀 테스트 초기 상태",
  );

  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellRowBoundaryPlain(client, 2, 1, -20, "일반 표 퍼센트 높이 중간 행 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      current.tableHeight >= before.tableHeight - 25 &&
        current.tableHeight <= before.tableHeight - 15 &&
        Math.abs(current.columnCellHeights[0][0] - before.columnCellHeights[0][0]) <= 3 &&
        current.columnCellHeights[0][1] <= before.columnCellHeights[0][1] - 15 &&
        Math.abs(current.columnCellHeights[0][2] - before.columnCellHeights[0][2]) <= 3 &&
        Math.abs(current.columnCellHeights[0][3] - before.columnCellHeights[0][3]) <= 3 &&
        Math.abs(current.columnCellHeights[0][4] - before.columnCellHeights[0][4]) <= 3
    `,
    "일반 표 퍼센트 높이 중간 행 축소 시 표 높이 접힘 방지",
  );
}

async function runLowerEdgeRowResizeKeepsTargetRowAndFocusCase(client) {
  await evaluate(
    client,
    `
      (() => {
        const heights = [140, 80, 80];
        const rowsHtml = heights.map((height, rowIndex) =>
          '<tr style="height:' + height + 'px">' +
            '<td style="border:1px solid #111;padding:0;height:' + height + 'px">R' + (rowIndex + 1) + 'C1</td>' +
            '<td style="border:1px solid #111;padding:0;height:' + height + 'px">R' + (rowIndex + 1) + 'C2</td>' +
          '</tr>'
        ).join('');

        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc">' +
            '<table id="plainTableLowerEdgeRowResizeSmoke" style="width:360px;height:300px;max-width:none;table-layout:fixed;border-collapse:collapse;">' +
              '<colgroup><col style="width:180px"><col style="width:180px"></colgroup>' +
              '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
          '</div>',
          { resetHistory: false, notify: false }
        );

        const cell = document.querySelector('#plainTableLowerEdgeRowResizeSmoke tr:nth-child(1) td:nth-child(1)');
        const range = document.createRange();

        range.selectNodeContents(cell);
        range.collapse(true);

        const selection = window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
        window.ExamListTemplateEditorRuntime.state.templateEditor.savedRange = range.cloneRange();
        cell.classList.add('is-active-cell');
        window.ExamListTemplateEditorRuntime.state.templateEditor.activeCellElement = cell;
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const table = document.querySelector('#plainTableLowerEdgeRowResizeSmoke');
        const rows = [...(table?.rows || [])];
        const activeCell = window.ExamListTemplateEditorRuntime?.state?.templateEditor?.activeCellElement;

        return Boolean(
          table &&
            rows.length === 3 &&
            Math.round(rows[0].getBoundingClientRect().height) === 140 &&
            Math.round(rows[1].getBoundingClientRect().height) === 80 &&
            activeCell === rows[0].cells[0]
        );
      })()
    `,
    "일반 표 하단 경계 행 리사이즈 회귀 테스트 초기 상태",
  );

  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellTopRowBoundaryPlain(client, 2, 1, -12, "일반 표 하단 경계에서 1행 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      current.columnCellHeights[0][0] >= before.columnCellHeights[0][0] - 15 &&
        current.columnCellHeights[0][0] <= before.columnCellHeights[0][0] - 9 &&
        Math.abs(current.columnCellHeights[0][1] - before.columnCellHeights[0][1]) <= 2 &&
        Math.abs(current.columnCellHeights[0][2] - before.columnCellHeights[0][2]) <= 2
    `,
    "일반 표 하단 경계에서 1행 축소 시 2행 높이 기준 사용 방지",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const table = document.querySelector('#plainTableLowerEdgeRowResizeSmoke');
        const rows = [...(table?.rows || [])];
        const activeCell = window.ExamListTemplateEditorRuntime?.state?.templateEditor?.activeCellElement;
        const selectionCell = (() => {
          const node = window.getSelection()?.anchorNode || null;
          return (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest?.('td,th') || null;
        })();

        return Boolean(activeCell === rows[0]?.cells?.[0] && selectionCell === rows[0]?.cells?.[0]);
      })()
    `,
    "일반 표 하단 경계 리사이즈 후 기존 셀 포커스 유지",
  );
}

module.exports = {
  runConfiguredHeightFirstRowShrinkCase,
  runFixedSingleCellShiftRowResizeCases,
  runLowerEdgeRowResizeKeepsTargetRowAndFocusCase,
  runMixedColumnThenRowResizeCase,
  runMixedRowThenColumnResizeCase,
  runPercentTableHeightMiddleRowShrinkCase,
  runStaleTableHeightMiddleRowShrinkCase,
};
