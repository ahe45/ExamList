const { getEditorTableMetrics } = require("../../../smoke-browser-cdp");
const { dragCellColumnBoundary } = require("./drag");
const { expectCapturedTableMetrics } = require("./metrics");
const { setFixedThreeByThreeTable, setFullWidthThreeByThreeTable } = require("./setup");

async function runFullWidthSingleCellTinyShiftResizeCase(client) {
  await setFullWidthThreeByThreeTable(client, "Shift 미세 드래그 100% 표 초기화");
  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellColumnBoundary(client, 1, 1, 3, "100% 표 단일 셀 Shift 미세 확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      (() => {
        const beforeRowTotal = before.rows[0].reduce((sum, width) => sum + width, 0);
        const currentRowTotal = current.rows[0].reduce((sum, width) => sum + width, 0);

        return Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
          Math.abs(currentRowTotal - beforeRowTotal) <= 2;
      })()
    `,
    "100% 표 단일 셀 Shift 미세 확대 시 표 전체 너비 유지",
  );
}

async function runFixedSingleCellShiftColumnResizeCases(client) {
  await setFixedThreeByThreeTable(client, {
    description: "Shift 드래그 회귀 테스트용 표 초기화",
    verifyColumnWidths: true,
  });
  const beforeMetrics = await getEditorTableMetrics(client);

  await dragCellColumnBoundary(client, 1, 1, 2, "단일 셀 Shift 미세 확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.columnTotal - before.columnTotal) <= 0 &&
        current.tableStyleWidth === before.tableStyleWidth &&
        current.rows[0][0] >= before.rows[0][0] + 1 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2
    `,
    "단일 셀 Shift 미세 확대 시 표 전체 너비 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, -2, "단일 셀 Shift 미세 확대 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.columnTotal - before.columnTotal) <= 0 &&
        current.tableStyleWidth === before.tableStyleWidth &&
        Math.abs(current.rows[0][0] - before.rows[0][0]) <= 2 &&
        Math.abs(current.rows[0][1] - before.rows[0][1]) <= 2
    `,
    "단일 셀 Shift 미세 확대 후 복귀 시 표 전체 너비 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, -2, "단일 셀 Shift 미세 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.columnTotal - before.columnTotal) <= 0 &&
        current.tableStyleWidth === before.tableStyleWidth &&
        current.rows[0][0] <= before.rows[0][0] - 1 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2
    `,
    "단일 셀 Shift 미세 축소 시 표 전체 너비 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, 2, "단일 셀 Shift 미세 축소 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.columnTotal - before.columnTotal) <= 0 &&
        current.tableStyleWidth === before.tableStyleWidth &&
        Math.abs(current.rows[0][0] - before.rows[0][0]) <= 2 &&
        Math.abs(current.rows[0][1] - before.rows[0][1]) <= 2
    `,
    "단일 셀 Shift 미세 축소 후 복귀 시 표 전체 너비 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, 80, "단일 셀 Shift 확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        current.rows[0][0] >= before.rows[0][0] + 60 &&
        current.rows[0][1] <= before.rows[0][1] - 50 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2 &&
        Math.abs(current.rows[1][1] - before.rows[1][1]) <= 2
    `,
    "단일 셀 Shift 확대 시 표 전체 너비 및 다른 행 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, -80, "단일 셀 Shift 확대 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      current.columnCount === before.columnCount &&
        Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.rows[0][0] - before.rows[0][0]) <= 2 &&
        Math.abs(current.rows[0][1] - before.rows[0][1]) <= 2 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2
    `,
    "단일 셀 Shift 확대 후 복귀 시 분할 컬럼 정리",
  );

  await dragCellColumnBoundary(client, 1, 1, -90, "단일 셀 Shift 축소 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        current.rows[0][0] <= before.rows[0][0] - 70 &&
        current.rows[0][1] >= before.rows[0][1] + 70 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2
    `,
    "단일 셀 Shift 축소 시 다른 행 경계선 무시",
  );

  await dragCellColumnBoundary(client, 1, 1, 90, "단일 셀 Shift 축소 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      current.columnCount === before.columnCount &&
        Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.rows[0][0] - before.rows[0][0]) <= 2 &&
        Math.abs(current.rows[0][1] - before.rows[0][1]) <= 2
    `,
    "단일 셀 Shift 축소 후 복귀 시 표 전체 너비 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, 170, "단일 셀 Shift 대폭 확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        current.rows[0][0] >= before.rows[0][0] + 140 &&
        current.rows[0][1] >= 24 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2
    `,
    "단일 셀 Shift 대폭 확대 시 다음 컬럼으로 이동",
  );

  await dragCellColumnBoundary(client, 1, 1, -170, "단일 셀 Shift 대폭 확대 복귀 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        Math.abs(current.rows[0][0] - before.rows[0][0]) <= 2 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2
    `,
    "단일 셀 Shift 대폭 확대 후 같은 경계 복귀 시 표 전체 너비 유지",
  );

  await dragCellColumnBoundary(client, 1, 1, 80, "단일 셀 Shift 재확대 시작");
  await expectCapturedTableMetrics(
    client,
    beforeMetrics,
    `
      Math.abs(current.tableWidth - before.tableWidth) <= 2 &&
        current.rows[0][0] >= before.rows[0][0] + 60 &&
        Math.abs(current.rows[1][0] - before.rows[1][0]) <= 2 &&
        Math.abs(current.rows[1][1] - before.rows[1][1]) <= 2
    `,
    "단일 셀 Shift 복귀 후 재확대 시 표 전체 너비 유지",
  );
}

module.exports = {
  runFixedSingleCellShiftColumnResizeCases,
  runFullWidthSingleCellTinyShiftResizeCase,
};
