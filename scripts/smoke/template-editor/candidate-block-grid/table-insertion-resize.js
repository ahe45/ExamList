const {
  dispatchBrowserMouseClick,
  dispatchBrowserMouseClickAtPoint,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../../smoke-browser-cdp");

async function openCandidateBlockFocusEditor(client) {
  if (
    await evaluate(
      client,
      `Boolean(document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor'))`,
    )
  ) {
    return;
  }

  const point = await getBrowserPoint(
    client,
    `(() => {
      const block = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
      const rect = block?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`,
    "수험생 데이터 블록 확대 편집 시작",
  );

  await dispatchBrowserMouseClickAtPoint(client, point);
  await waitForCondition(
    client,
    `Boolean(document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor') && document.querySelector('[data-candidate-block-focus-layer]'))`,
    "수험생 데이터 블록 확대 편집 표시",
  );
}

async function closeCandidateBlockFocusEditor(client) {
  if (
    !(await evaluate(
      client,
      `Boolean(document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor'))`,
    ))
  ) {
    return;
  }

  await dispatchBrowserMouseClick(client, "[data-candidate-block-focus-close]");
  await waitForCondition(
    client,
    `!document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor') && !document.querySelector('[data-candidate-block-focus-layer]')`,
    "수험생 데이터 블록 확대 편집 닫기",
  );
}

async function configureCandidateBlockGridForTableSmoke(
  client,
  { columns, rows, columnGap = 4, rowGap = 4, height = null } = {},
) {
  await closeCandidateBlockFocusEditor(client);
  await waitForCondition(
    client,
    `Boolean(document.querySelector('[data-examlist-block-grid-setting="rows"]') && document.querySelector('[data-examlist-block-grid-create]'))`,
    "수험생 데이터 블록 표 테스트 설정 컨트롤 준비",
  );
  await evaluate(
    client,
    `
      (() => {
        const values = {
          columns: '${Math.max(1, Number(columns) || 1)}',
          rows: '${Math.max(1, Number(rows) || 1)}',
          gapXPt: '${Math.max(0, Number(columnGap) || 0)}',
          gapYPt: '${Math.max(0, Number(rowGap) || 0)}'
        };

        Object.entries(values).forEach(([name, value]) => {
          const control = document.querySelector('[data-examlist-block-grid-setting="' + name + '"]');

          if (!control) {
            return;
          }

          control.value = value;
          control.dispatchEvent(new Event('input', { bubbles: true }));
          control.dispatchEvent(new Event('change', { bubbles: true }));
        });

        if (!document.querySelector('#templateEditorSurface [data-candidate-block-grid]')) {
          document.querySelector('[data-examlist-block-grid-create]')?.click();
        }
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

        return Boolean(
          grid &&
            grid.dataset.candidateBlockColumns === '${Math.max(1, Number(columns) || 1)}' &&
            grid.dataset.candidateBlockRows === '${Math.max(1, Number(rows) || 1)}' &&
            grid.querySelectorAll('[data-candidate-block-instance]').length === ${Math.max(1, Number(columns) || 1) * Math.max(1, Number(rows) || 1)}
        );
      })()
    `,
    "수험생 데이터 블록 표 테스트 격자 구성",
  );
  if (height) {
    await evaluate(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          if (!grid) {
            return false;
          }

          grid.style.height = '${Math.max(1, Number(height) || 1)}px';
          grid.style.gridTemplateRows = 'repeat(${Math.max(1, Number(rows) || 1)}, minmax(0px, 1fr))';
          grid.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
          return true;
        })()
      `,
    );
  }
}

async function placeCandidateBlockTableInsertionCaret(client) {
  await evaluate(
    client,
    `
      (() => {
        const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

        if (!firstBlock) {
          return false;
        }

        firstBlock.innerHTML = '<p id="candidateBlockToolbarTableAnchor"><br></p>';
        const anchor = firstBlock.querySelector('#candidateBlockToolbarTableAnchor');
        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(anchor);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        firstBlock.focus();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
}

async function insertCandidateBlockToolbarTable(client, { columns, rows } = {}) {
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="table"]');
  await waitForCondition(
    client,
    `!document.querySelector('#templateEditorToolbarHost .template-table-insert-panel [data-template-insert="table-confirm"]')?.closest('.template-table-insert-panel')?.classList.contains('hidden')`,
    "수험생 데이터 블록 내부 표 삽입 패널 표시",
  );
  await evaluate(
    client,
    `
      (() => {
        const rowsInput = document.querySelector('#templateEditorToolbarHost .template-table-insert-panel input[id$="TableRows"]');
        const columnsInput = document.querySelector('#templateEditorToolbarHost .template-table-insert-panel input[id$="TableColumns"]');

        if (!rowsInput || !columnsInput) {
          return false;
        }

        rowsInput.value = '${Number(rows) || 1}';
        columnsInput.value = '${Number(columns) || 1}';
        rowsInput.dispatchEvent(new Event('input', { bubbles: true }));
        columnsInput.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `,
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="table-confirm"]');
}

async function assertCandidateBlockDefaultLineSpacing(client, selector, label) {
  await waitForCondition(
    client,
    `
      (() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        const style = element ? getComputedStyle(element) : null;
        const lineHeight = Number.parseFloat(style?.lineHeight || '');
        const fontSize = Number.parseFloat(style?.fontSize || '');
        const spacingPt = (lineHeight - fontSize) * 0.75;

        return Boolean(
          element &&
            Number.isFinite(lineHeight) &&
            Number.isFinite(fontSize) &&
            Math.abs(spacingPt - 1) <= 0.15
        );
      })()
    `,
    label,
  );
}

async function assertCandidateBlockTableCellDefaultPadding(client, selector, label) {
  await waitForCondition(
    client,
    `
      (() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        const style = element ? getComputedStyle(element) : null;
        const paddings = [
          Number.parseFloat(style?.paddingTop || ''),
          Number.parseFloat(style?.paddingRight || ''),
          Number.parseFloat(style?.paddingBottom || ''),
          Number.parseFloat(style?.paddingLeft || '')
        ];

        return Boolean(
          element &&
            paddings.every((padding) => Number.isFinite(padding) && Math.abs(padding) <= 0.1)
        );
      })()
    `,
    label,
  );
}

async function runTallCandidateBlockTableInsertionRegression(client) {
  await configureCandidateBlockGridForTableSmoke(client, { columns: 2, rows: 10, columnGap: 4, rowGap: 4 });
  await openCandidateBlockFocusEditor(client);
  await placeCandidateBlockTableInsertionCaret(client);
  await assertCandidateBlockDefaultLineSpacing(
    client,
    '#templateEditorSurface [data-candidate-block-modal-editor-surface] #candidateBlockToolbarTableAnchor',
    "수험생 데이터 블록 기본 줄 간격",
  );
  await insertCandidateBlockToolbarTable(client, { columns: 4, rows: 4 });
  await waitForCondition(
    client,
    `Boolean(document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface] table'))`,
    "수험생 데이터 블록 10행 기준 표 삽입",
  );
  await assertCandidateBlockDefaultLineSpacing(
    client,
    '#templateEditorSurface [data-candidate-block-modal-editor-surface] table td',
    "수험생 데이터 블록 표 셀 기본 줄 간격",
  );
  await assertCandidateBlockTableCellDefaultPadding(
    client,
    '#templateEditorSurface [data-candidate-block-modal-editor-surface] table td',
    "수험생 데이터 블록 표 셀 기본 여백",
  );
  await evaluate(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const cell = surface?.querySelector('table td');

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
  await waitForCondition(
    client,
    `
      (() => {
        const activeCell = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface] table td.is-active-cell');
        const activeStyle = activeCell ? getComputedStyle(activeCell) : null;

        return Boolean(
          activeCell &&
            activeStyle &&
            activeStyle.outlineStyle === 'none' &&
            activeStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
        );
      })()
    `,
    "수험생 데이터 블록 표 활성 셀 단독 강조 없음",
  );
  await evaluate(client, `new Promise((resolve) => window.setTimeout(resolve, 500))`);
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
        const table = surface?.querySelector('table');
        const surfaceRect = surface?.getBoundingClientRect();
        const tableRect = table?.getBoundingClientRect();
        const toastMessage = document.querySelector('#examlist-toast-root .toast-message')?.textContent || '';

        return Boolean(
          surface &&
            table &&
            surfaceRect &&
            tableRect &&
            surface.scrollWidth <= surface.clientWidth &&
            surface.scrollHeight <= surface.clientHeight &&
            tableRect.right <= surfaceRect.right + 0.5 &&
            tableRect.bottom <= surfaceRect.bottom + 0.5 &&
            !toastMessage.includes('데이터 블록 영역을 초과')
        );
      })()
    `,
    "수험생 데이터 블록 10행 표 삽입 직후 초과 없음",
  );
  await closeCandidateBlockFocusEditor(client);
}

async function runCandidateBlockGridTableInsertionResizeScenario(context) {
  const { client } = context;
    await runTallCandidateBlockTableInsertionRegression(client);
    await configureCandidateBlockGridForTableSmoke(client, { columns: 2, rows: 2, columnGap: 4, rowGap: 4, height: 260 });
    await evaluate(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          if (!grid) {
            return false;
          }

          grid.style.height = '260px';
          grid.style.gridTemplateRows = 'repeat(2, minmax(0px, 1fr))';
          grid.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
          const rect = block?.getBoundingClientRect();

          return Boolean(rect && rect.height > 110);
        })()
      `,
      "수험생 데이터 블록 표 리사이즈 검증 높이 확보",
    );
    await openCandidateBlockFocusEditor(client);
    await evaluate(
      client,
      `
        (() => {
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

          if (!firstBlock) {
            return false;
          }

          firstBlock.innerHTML = '<p id="candidateBlockToolbarTableAnchor"><br></p>';
          const anchor = firstBlock.querySelector('#candidateBlockToolbarTableAnchor');
          const selection = window.getSelection();
          const range = document.createRange();

          range.selectNodeContents(anchor);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          firstBlock.focus();
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="table"]');
    await waitForCondition(
      client,
      `!document.querySelector('#templateEditorToolbarHost .template-table-insert-panel [data-template-insert="table-confirm"]')?.closest('.template-table-insert-panel')?.classList.contains('hidden')`,
      "수험생 데이터 블록 내부 표 삽입 패널 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          const rowsInput = document.querySelector('#templateEditorToolbarHost .template-table-insert-panel input[id$="TableRows"]');
          const columnsInput = document.querySelector('#templateEditorToolbarHost .template-table-insert-panel input[id$="TableColumns"]');

          if (!rowsInput || !columnsInput) {
            return false;
          }

          rowsInput.value = '2';
          columnsInput.value = '2';
          return true;
        })()
      `,
    );
    await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="table-confirm"]');
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
          const firstBlock = blocks[0] || null;
          const focusedBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

          return Boolean(
            blocks.length === 4 &&
              focusedBlock?.querySelector('table td') &&
              firstBlock?.querySelector('table td') &&
              blocks.every((block) => block.querySelector('table')) &&
              !firstBlock.querySelector('.template-editor-image-selection, .template-editor-image-resize-handle, [data-candidate-block-grid-resize-handle]')
          );
        })()
      `,
      "수험생 데이터 블록 내부 툴바 표 삽입",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
          const focusedBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
          const focusedTable = focusedBlock?.querySelector('table');
          const focusedViewport = focusedBlock?.closest('.examlist-candidate-block-modal-editor-viewport');
          const focusedViewportRect = focusedViewport?.getBoundingClientRect();
          const focusedTableRect = focusedTable?.getBoundingClientRect();

          return Boolean(
            blocks.length === 4 &&
              focusedTable &&
              focusedViewportRect &&
              focusedTableRect &&
              focusedTableRect.right <= focusedViewportRect.right + 1 &&
              focusedTableRect.bottom <= focusedViewportRect.bottom + 1 &&
              blocks.every((block) => {
                const table = block.querySelector('table');
                const blockRect = block.getBoundingClientRect();
                const tableRect = table?.getBoundingClientRect();
                const style = table ? getComputedStyle(table) : null;
                const bottomGap = blockRect.bottom - tableRect.bottom;
                const rightGap = blockRect.right - tableRect.right;

                return Boolean(
                  table &&
                    table.dataset.candidateBlockTable === 'true' &&
                    tableRect.width <= blockRect.width + 1 &&
                    tableRect.height <= blockRect.height + 1 &&
                    bottomGap >= -1 &&
                    bottomGap <= 4 &&
                    rightGap >= -1 &&
                    rightGap <= 2 &&
                    style.width !== '0px' &&
                    style.height !== '0px'
                );
              })
          );
        })()
      `,
      "수험생 데이터 블록 내부 표 전체 영역 배치",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];
          const focusedBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
          const isEven = (values) =>
            values.length > 0 &&
              Math.max(...values) - Math.min(...values) <= 1 &&
              values.every((value) => Number.isFinite(value) && value > 0);

          return Boolean(
            blocks.length === 4 &&
              focusedBlock?.querySelector('table') &&
              blocks.every((block) => {
                const table = block.querySelector('table');
                const columnWidths = [...(table?.querySelectorAll('colgroup col') || [])].map((columnElement) =>
                  Number.parseFloat(columnElement.style.width || '0')
                );
                const rowHeights = [...(table?.rows || [])].map((rowElement) =>
                  Number.parseFloat(rowElement.style.height || '0')
                );
                const firstRowCellWidths = [...(table?.rows?.[0]?.cells || [])].map((cellElement) =>
                  Number.parseFloat(cellElement.style.width || '0')
                );

                return Boolean(
                  table &&
                    columnWidths.length === 2 &&
                    rowHeights.length === 2 &&
                    firstRowCellWidths.length === 2 &&
                    isEven(columnWidths) &&
                    isEven(rowHeights) &&
                    isEven(firstRowCellWidths)
                );
              })
          );
        })()
      `,
      "수험생 데이터 블록 내부 표 초기 행열 균등 배치",
    );
    const candidateBlockSourceTableBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const table = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table');
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.bottom + 2 };
      })()`,
      "수험생 데이터 블록 편집 기준 표 개체 호버 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockSourceTableBorderPoint.x,
      y: candidateBlockSourceTableBorderPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const sourceBlock = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const overlay = document.querySelector('.template-editor-table-selection:not(.hidden).is-hover-only');

          return Boolean(
            sourceBlock &&
              overlay &&
              sourceBlock.contains(overlay.__templateEditorTableElement) &&
              document.querySelector('#templateEditorSurface')?.classList.contains('is-table-object-border-hover')
          );
        })()
      `,
      "수험생 데이터 블록 편집 기준 표 개체 호버 표시",
    );
    await closeCandidateBlockFocusEditor(client);
    const candidateBlockPreviewTableBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const previewBlock = document.querySelectorAll('#templateEditorSurface [data-candidate-block-grid] [data-candidate-block-instance]')[1];
        const table = previewBlock?.querySelector('table');
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.bottom + 2 };
      })()`,
      "수험생 데이터 블록 미리보기 표 개체 호버 제외 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockPreviewTableBorderPoint.x,
      y: candidateBlockPreviewTableBorderPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const previewBlock = document.querySelectorAll('#templateEditorSurface [data-candidate-block-grid] [data-candidate-block-instance]')[1];
          const visibleOverlays = [...document.querySelectorAll('.template-editor-table-selection:not(.hidden)')];

          return Boolean(
            surface &&
              previewBlock &&
              !surface.classList.contains('is-table-object-border-hover') &&
              visibleOverlays.every((overlay) => !previewBlock.contains(overlay.__templateEditorTableElement))
          );
        })()
      `,
      "수험생 데이터 블록 미리보기 표 개체 호버 제외",
    );
    await openCandidateBlockFocusEditor(client);
    await waitForCondition(
      client,
      `
        (() => {
          const focusedBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
          const focusedViewport = focusedBlock?.closest('.examlist-candidate-block-modal-editor-viewport');
          const table = focusedBlock?.querySelector('table');
          const viewportRect = focusedViewport?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();
          const tolerance = 2;

          return Boolean(
            focusedBlock &&
              focusedViewport &&
              table &&
              viewportRect &&
              tableRect &&
              tableRect.right >= viewportRect.right - tolerance &&
              tableRect.bottom >= viewportRect.bottom - tolerance &&
              tableRect.right <= viewportRect.right + tolerance &&
              tableRect.bottom <= viewportRect.bottom + tolerance
          );
        })()
      `,
      "수험생 데이터 블록 표 재오픈 후 모달 영역 채움",
    );
    const candidateBlockCellOnlyColumnBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table');
            const firstRowWidths = [...(table?.rows?.[0]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));
            const secondRowWidths = [...(table?.rows?.[1]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));

            return {
              firstRowWidths,
              firstRowTotalWidth: firstRowWidths.reduce((sum, width) => sum + width, 0),
              secondRowWidths,
              tableWidth: Math.round(table?.getBoundingClientRect().width || 0)
            };
          })())
        `,
      ),
    );
    const candidateBlockColumnResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const cell = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table tr:first-child td:first-child');
        const rect = cell?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.right - 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 표 개별 열 리사이즈 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockColumnResizeStartPoint.x,
      y: candidateBlockColumnResizeStartPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const activeSurface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]') || surface;
          const cell = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table tr:first-child td:first-child');

          return Boolean(
            activeSurface?.classList.contains('is-table-column-hover') &&
              getComputedStyle(cell).cursor === 'col-resize'
          );
        })()
      `,
      "수험생 데이터 블록 표 열 리사이즈 커서",
    );
    await dispatchBrowserMouseDrag(
      client,
      candidateBlockColumnResizeStartPoint,
      { x: candidateBlockColumnResizeStartPoint.x + 36, y: candidateBlockColumnResizeStartPoint.y },
      { modifiers: 8 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const table = block?.querySelector('table');
          const before = ${JSON.stringify(candidateBlockCellOnlyColumnBefore)};
          const firstRowWidths = [...(table?.rows?.[0]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));
          const secondRowWidths = [...(table?.rows?.[1]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));
          const blockRect = block?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();
          const totalWidth = firstRowWidths.reduce((sum, width) => sum + width, 0);
          const resizedLeftDelta = firstRowWidths[0] - before.firstRowWidths[0];
          const resizedRightDelta = firstRowWidths[1] - before.firstRowWidths[1];

          return Boolean(
            block &&
              table &&
              firstRowWidths.length >= 2 &&
              secondRowWidths.length >= 2 &&
              resizedLeftDelta >= 8 &&
              resizedRightDelta <= -8 &&
              Math.abs(resizedLeftDelta + resizedRightDelta) <= 4 &&
              Math.abs(secondRowWidths[0] - before.secondRowWidths[0]) <= 4 &&
              Math.abs(secondRowWidths[1] - before.secondRowWidths[1]) <= 4 &&
              Math.abs(totalWidth - (before.firstRowTotalWidth || before.tableWidth)) <= 8 &&
              tableRect.width <= blockRect.width + 2.5 &&
              tableRect.height <= blockRect.height + 2.5
          );
        })()
      `,
      "수험생 데이터 블록 표 시프트 열 리사이즈",
    );
    const candidateBlockCellOnlyRowBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table');
            const topLeft = table?.rows?.[0]?.cells?.[0];
            const bottomLeft = table?.rows?.[1]?.cells?.[0];
            const topRight = table?.rows?.[0]?.cells?.[table.rows[0].cells.length - 1];
            const bottomRight = table?.rows?.[1]?.cells?.[table.rows[1].cells.length - 1];

            return {
              bottomLeftHeight: Math.round(bottomLeft?.getBoundingClientRect().height || 0),
              bottomRightHeight: Math.round(bottomRight?.getBoundingClientRect().height || 0),
              tableHeight: Math.round(table?.getBoundingClientRect().height || 0),
              topLeftHeight: Math.round(topLeft?.getBoundingClientRect().height || 0),
              topRightHeight: Math.round(topRight?.getBoundingClientRect().height || 0)
            };
          })())
        `,
      ),
    );
    const candidateBlockRowResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const cell = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table tr:first-child td:first-child');
        const rect = cell?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.bottom - 2 };
      })()`,
      "수험생 데이터 블록 표 개별 행 리사이즈 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockRowResizeStartPoint.x,
      y: candidateBlockRowResizeStartPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const activeSurface = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]') || surface;
          const cell = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table tr:first-child td:first-child');

          return Boolean(
            activeSurface?.classList.contains('is-table-row-hover') &&
              getComputedStyle(cell).cursor === 'row-resize'
          );
        })()
      `,
      "수험생 데이터 블록 표 행 리사이즈 커서",
    );
    await dispatchBrowserMouseDrag(
      client,
      candidateBlockRowResizeStartPoint,
      { x: candidateBlockRowResizeStartPoint.x, y: candidateBlockRowResizeStartPoint.y + 24 },
      { modifiers: 8 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const table = block?.querySelector('table');
          const before = ${JSON.stringify(candidateBlockCellOnlyRowBefore)};
          const topLeft = table?.rows?.[0]?.cells?.[0];
          const topRight = table?.rows?.[0]?.cells?.[table.rows[0].cells.length - 1];
          const bottomRight = table?.rows?.[1]?.cells?.[0];
          const bottomLeft = table?.rows?.[table.rows.length - 1]?.cells?.[0];
          const blockRect = block?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();
          const topLeftHeight = Math.round(topLeft?.getBoundingClientRect().height || 0);
          const bottomLeftHeight = Math.round(bottomLeft?.getBoundingClientRect().height || 0);
          const topRightHeight = Math.round(topRight?.getBoundingClientRect().height || 0);
          const bottomRightHeight = Math.round(bottomRight?.getBoundingClientRect().height || 0);

          return Boolean(
            block &&
              table &&
              table.rows.length >= 2 &&
              topLeftHeight >= before.topLeftHeight + 8 &&
              [bottomLeftHeight, topRightHeight, bottomRightHeight].some((height) =>
                Math.abs(height - before.bottomLeftHeight) >= 6 ||
                  Math.abs(height - before.topRightHeight) >= 6 ||
                  Math.abs(height - before.bottomRightHeight) >= 6
              ) &&
              tableRect.width <= blockRect.width + 2.5 &&
              tableRect.height <= blockRect.height + 2.5
          );
        })()
      `,
      "수험생 데이터 블록 표 시프트 행 리사이즈",
    );
    await closeCandidateBlockFocusEditor(client);
    await evaluate(
      client,
      `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;

          if (editor?.state?.templateEditor) {
            editor.state.templateEditor.selectedTableElement = null;
          }
          document.querySelectorAll('#templateEditorSurface .is-selected-table-object')
            .forEach((table) => table.classList.remove('is-selected-table-object'));
          document.querySelector('.template-editor-table-selection')?.classList.add('hidden');
          return true;
        })()
      `,
    );
    const candidateBlockGridTableBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
        const rect = grid?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 표 포함 외곽선 선택 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockGridTableBorderPoint.x,
      y: candidateBlockGridTableBorderPoint.y,
    });
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockGridTableBorderPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const handle = grid?.querySelector('[data-candidate-block-grid-resize-handle][data-candidate-block-grid-resize-corner="bottom-right"]');
          const rect = handle?.getBoundingClientRect();

          return Boolean(
            grid?.classList.contains('is-selected-candidate-block-grid') &&
              handle &&
              rect &&
              rect.width > 0 &&
              rect.height > 0 &&
              getComputedStyle(handle).display !== 'none'
          );
        })()
      `,
      "수험생 데이터 블록 표 포함 개체 선택",
    );
    const candidateBlockGridWithTableBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
            const firstBlock = grid?.querySelector('[data-candidate-block-instance]');
            const table = firstBlock?.querySelector('table');
            const gridRect = grid?.getBoundingClientRect();
            const blockRect = firstBlock?.getBoundingClientRect();
            const tableRect = table?.getBoundingClientRect();

            return {
              blockHeight: Math.round(blockRect?.height || 0),
              blockWidth: Math.round(blockRect?.width || 0),
              gridHeight: Math.round(gridRect?.height || 0),
              gridWidth: Math.round(gridRect?.width || 0),
              tableHeight: Math.round(tableRect?.height || 0),
              tableWidth: Math.round(tableRect?.width || 0)
            };
          })())
        `,
      ),
    );
    await evaluate(
      client,
      `
        (() => {
          const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-resize-handle][data-candidate-block-grid-resize-corner="bottom-right"]');
          const rect = handle?.getBoundingClientRect();

          if (!rect) {
            return false;
          }

          const pointerId = 301;
          const startX = rect.left + rect.width / 2;
          const startY = rect.top + rect.height / 2;
          const options = {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId,
            pointerType: 'mouse'
          };

          handle.dispatchEvent(new PointerEvent('pointerdown', {
            ...options,
            button: 0,
            buttons: 1,
            clientX: startX,
            clientY: startY
          }));
          window.dispatchEvent(new PointerEvent('pointermove', {
            ...options,
            button: 0,
            buttons: 1,
            clientX: startX - 36,
            clientY: startY - 24
          }));
          window.dispatchEvent(new PointerEvent('pointerup', {
            ...options,
            button: 0,
            buttons: 0,
            clientX: startX - 36,
            clientY: startY - 24
          }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const firstBlock = grid?.querySelector('[data-candidate-block-instance]');
          const table = firstBlock?.querySelector('table');
          const before = ${JSON.stringify(candidateBlockGridWithTableBefore)};
          const gridRect = grid?.getBoundingClientRect();
          const blockRect = firstBlock?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            grid &&
              firstBlock &&
              table &&
              Math.round(gridRect.width) <= before.gridWidth - 20 &&
              Math.round(gridRect.height) <= before.gridHeight - 12 &&
              tableRect.width <= blockRect.width + 1 &&
              tableRect.height <= blockRect.height + 1
          );
        })()
      `,
      "수험생 데이터 블록 리사이즈 시 내부 표 초과 제한",
    );
    const candidateBlockGridTableMinimum = JSON.parse(
      await evaluate(
        client,
        `
          (async () => {
            const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
            const config = await import('/client/features/template-editor/candidate-block-grid-config.js');
            const normalizer = await import('/client/features/template-editor/candidate-block-grid-table-normalizer.js');
            const tableMinimumSize = normalizer.getCandidateBlockGridTableMinimumSize(grid);
            const tableMinimumTolerance = 25;

            return JSON.stringify({
              height: Math.max(config.candidateBlockGridMinimumHeight, Math.floor(tableMinimumSize.height || 0) - tableMinimumTolerance),
              width: Math.max(config.candidateBlockGridMinimumWidth, Math.floor(tableMinimumSize.width || 0) - tableMinimumTolerance)
            });
          })()
        `,
      ),
    );
    await evaluate(
      client,
      `
        (() => {
          const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-resize-handle][data-candidate-block-grid-resize-corner="bottom-right"]');
          const rect = handle?.getBoundingClientRect();

          if (!rect) {
            return false;
          }

          const pointerId = 302;
          const startX = rect.left + rect.width / 2;
          const startY = rect.top + rect.height / 2;
          const options = {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId,
            pointerType: 'mouse'
          };

          handle.dispatchEvent(new PointerEvent('pointerdown', {
            ...options,
            button: 0,
            buttons: 1,
            clientX: startX,
            clientY: startY
          }));
          window.dispatchEvent(new PointerEvent('pointermove', {
            ...options,
            button: 0,
            buttons: 1,
            clientX: startX - 2000,
            clientY: startY - 2000
          }));
          window.dispatchEvent(new PointerEvent('pointerup', {
            ...options,
            button: 0,
            buttons: 0,
            clientX: startX - 2000,
            clientY: startY - 2000
          }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const firstBlock = grid?.querySelector('[data-candidate-block-instance]');
          const table = firstBlock?.querySelector('table');
          const minimum = ${JSON.stringify(candidateBlockGridTableMinimum)};
          const gridRect = grid?.getBoundingClientRect();
          const blockRect = firstBlock?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            grid &&
              table &&
              Math.round(gridRect.width) >= minimum.width - 2 &&
              Math.round(gridRect.height) >= minimum.height - 2 &&
              tableRect.width <= blockRect.width + 1 &&
              tableRect.height <= blockRect.height + 1
          );
        })()
      `,
      "수험생 데이터 블록 표 최소 크기 축소 제한",
    );
    await evaluate(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          if (!grid) {
            return false;
          }

          grid.style.height = '260px';
          grid.style.gridTemplateRows = 'repeat(2, minmax(0px, 1fr))';
          grid.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
          const table = block?.querySelector('table');
          const blockRect = block?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(blockRect && tableRect && blockRect.height > 110 && tableRect.height < blockRect.height - 8);
        })()
      `,
      "수험생 데이터 블록 표 개체 리사이즈 공간 확보",
    );
    await openCandidateBlockFocusEditor(client);
    await evaluate(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const table = block?.querySelector('table');

          if (!block || !table) {
            return false;
          }

          block.querySelector('#candidateBlockTableBoundarySpacer')?.remove();
          table.insertAdjacentHTML(
            'beforebegin',
            '<p id="candidateBlockTableBoundarySpacer" style="height:16px;line-height:16px;margin:0;padding:0;">위</p>'
          );

          const rows = [...(table.rows || [])];
          const targetHeight = 48;
          const rowHeight = Math.max(1, Math.floor(targetHeight / Math.max(rows.length, 1)));

          rows.forEach((row) => {
            row.style.height = rowHeight + 'px';
            [...(row.cells || [])].forEach((cell) => {
              cell.style.height = rowHeight + 'px';
              cell.style.minHeight = '0';
            });
          });
          table.style.height = targetHeight + 'px';
          table.style.maxHeight = '100%';
          block.classList.add('has-candidate-block-table');
          block.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const table = block?.querySelector('table');
          const blockRect = block?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            block &&
              table &&
              blockRect &&
              tableRect &&
              tableRect.top >= blockRect.top + 8 &&
              tableRect.height < blockRect.height - 24
          );
        })()
      `,
      "수험생 데이터 블록 표 하단 경계 테스트 배치",
    );
    const candidateBlockTableObjectResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
            const table = block?.querySelector('table');
            const blockRect = block?.getBoundingClientRect();
            const tableRect = table?.getBoundingClientRect();

            return {
              blockHeight: Math.round(blockRect?.height || 0),
              blockWidth: Math.round(blockRect?.width || 0),
              tableHeight: Math.round(tableRect?.height || 0),
              tableWidth: Math.round(tableRect?.width || 0)
            };
          })())
        `,
      ),
    );
    const candidateBlockTableObjectBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
        const table = block?.querySelector('table');
        const rect = table?.getBoundingClientRect();
        const blockRect = block?.getBoundingClientRect();

        if (!rect || !blockRect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: Math.max(blockRect.top + 1, rect.top - 2) };
      })()`,
      "수험생 데이터 블록 표 외곽 하단 선택 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockTableObjectBorderPoint.x,
      y: candidateBlockTableObjectBorderPoint.y,
    });
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockTableObjectBorderPoint);
    await waitForCondition(
      client,
      `
        document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="bottom"]')
      `,
      "수험생 데이터 블록 표 개체 하단 핸들 표시",
    );
    const candidateBlockTableObjectBottomHandlePoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="bottom"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 표 개체 하단 리사이즈 시작",
    );
    await dispatchBrowserMouseDrag(
      client,
      candidateBlockTableObjectBottomHandlePoint,
      { x: candidateBlockTableObjectBottomHandlePoint.x, y: candidateBlockTableObjectBottomHandlePoint.y + 12 },
      { steps: 6 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const table = block?.querySelector('table');
          const before = ${JSON.stringify(candidateBlockTableObjectResizeBefore)};
          const blockRect = block?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            block &&
              table &&
              tableRect.height >= before.tableHeight + 6 &&
              tableRect.height <= blockRect.height + 2.5 &&
              tableRect.width <= blockRect.width + 2.5
          );
        })()
      `,
      "수험생 데이터 블록 표 개체 하단 리사이즈",
    );
    const candidateBlockTableObjectBottomBoundaryPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="bottom"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 표 개체 하단 경계 리사이즈 시작",
    );
    await dispatchBrowserMouseDrag(
      client,
      candidateBlockTableObjectBottomBoundaryPoint,
      { x: candidateBlockTableObjectBottomBoundaryPoint.x, y: candidateBlockTableObjectBottomBoundaryPoint.y + 320 },
      { steps: 8 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const block = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const table = block?.querySelector('table');
          const blockRect = block?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();
          const logicalTop = Math.max(0, Math.round((tableRect?.top || 0) - (blockRect?.top || 0)));

          return Boolean(
            block &&
              table &&
              blockRect &&
              tableRect &&
              tableRect.top >= blockRect.top - 0.5 &&
              tableRect.bottom <= blockRect.bottom + 2.5 &&
              Math.round(tableRect.height) <= Math.round(blockRect.height - logicalTop) + 3
          );
        })()
      `,
      "수험생 데이터 블록 표 하단 확대 시 블록 경계 내부 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          const handle = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden) [data-template-table-object-handle-position="bottom"]');
          const previewBlock = document.querySelectorAll('#templateEditorSurface [data-candidate-block-grid] [data-candidate-block-instance]')[1];
          const handleRect = handle?.getBoundingClientRect();
          const previewRect = previewBlock?.getBoundingClientRect();

          if (!handleRect || !previewRect) {
            return false;
          }

          const pointerId = 503;
          const startX = handleRect.left + handleRect.width / 2;
          const startY = handleRect.top + handleRect.height / 2;
          const endX = previewRect.left + previewRect.width / 2;
          const endY = previewRect.top + previewRect.height / 2;
          const options = {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId,
            pointerType: 'mouse'
          };

          handle.dispatchEvent(new PointerEvent('pointerdown', {
            ...options,
            button: 0,
            buttons: 1,
            clientX: startX,
            clientY: startY
          }));
          previewBlock.dispatchEvent(new PointerEvent('pointermove', {
            ...options,
            button: 0,
            buttons: 1,
            clientX: endX,
            clientY: endY
          }));
          previewBlock.dispatchEvent(new PointerEvent('pointerup', {
            ...options,
            button: 0,
            buttons: 0,
            clientX: endX,
            clientY: endY
          }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const surface = document.querySelector('#templateEditorSurface');
          const overlay = document.querySelector('.template-editor-table-selection.is-selected:not(.hidden)');

          return Boolean(
            editor &&
              surface &&
              !editor.state?.templateEditor?.tableObjectResizeSession &&
              !surface.classList.contains('is-table-object-resizing') &&
              !overlay?.classList.contains('is-resizing')
          );
        })()
      `,
      "수험생 데이터 블록 표 개체 리사이즈 미리보기 영역 종료",
    );
    await closeCandidateBlockFocusEditor(client);
}

module.exports = { runCandidateBlockGridTableInsertionResizeScenario };
