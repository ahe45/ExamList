const { getEditorTableMetrics } = require("../../../smoke-browser-cdp");
const {
  dragCellColumnBoundary,
  dragCellRowBoundary,
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

module.exports = {
  runFixedSingleCellShiftRowResizeCases,
  runMixedColumnThenRowResizeCase,
  runMixedRowThenColumnResizeCase,
};
