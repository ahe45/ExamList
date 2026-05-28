const {
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../../smoke-browser-cdp");

async function assertTableBelowCandidateBlockKeepsExplicitBottomPosition(client) {
  const result = JSON.parse(
    await evaluate(
      client,
      `
        (async () => JSON.stringify(await (async () => {
          const editor = window.ExamListTemplateEditorRuntime;
          const { syncTemplateEditorObjectFlowObjects } = await import('/client/features/template-editor/object-flow-reflow.js');
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const originalHtml = editor?.getHtml?.() || "";

          try {
            if (!editor || !documentElement || typeof syncTemplateEditorObjectFlowObjects !== 'function') {
              return { ok: false, reason: 'missing-editor-runtime' };
            }

            documentElement.innerHTML = '';

            const grid = document.createElement('div');
            grid.className = 'examlist-candidate-block-grid';
            grid.dataset.candidateBlockGrid = 'true';
            grid.dataset.candidateBlockColumns = '2';
            grid.dataset.candidateBlockRows = '8';
            grid.dataset.candidateBlockVariant = 'photo';
            grid.dataset.candidateBlockObject = 'true';
            grid.setAttribute('contenteditable', 'false');
            grid.style.position = 'absolute';
            grid.style.left = '0px';
            grid.style.top = '104px';
            grid.style.width = '720px';
            grid.style.height = '824px';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
            grid.style.gridTemplateRows = 'repeat(8, minmax(52px, 1fr))';
            grid.style.gap = '4pt 4pt';
            grid.style.margin = '0';

            for (let index = 0; index < 16; index += 1) {
              const block = document.createElement('div');

              block.className = 'examlist-candidate-block';
              block.dataset.candidateBlockInstance = String(index + 1);
              block.innerHTML = '<p><br></p>';
              grid.append(block);
            }

            const table = document.createElement('table');

            table.innerHTML = '<tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody>';
            table.style.width = '720px';
            table.style.height = '58px';
            table.style.borderCollapse = 'collapse';
            table.style.tableLayout = 'fixed';
            table.style.position = 'absolute';
            table.style.left = '0px';
            table.style.top = '888px';
            table.style.margin = '0';
            table.style.maxWidth = 'none';
            table.style.zIndex = '2';
            table.querySelectorAll('td').forEach((cell) => {
              cell.style.border = '1px solid #111';
              cell.style.height = '28px';
              cell.style.padding = '0';
            });

            documentElement.append(grid, table);
            syncTemplateEditorObjectFlowObjects(documentElement);

            const beforeMoveTop = Number.parseFloat(table.style.top || '0') || 0;
            const tableHeight = Math.round(table.getBoundingClientRect().height || 58);
            const expectedTop = Math.max(0, documentElement.clientHeight - tableHeight - 6);

            table.style.top = expectedTop + 'px';
            syncTemplateEditorObjectFlowObjects(documentElement);

            const afterSyncTop = Number.parseFloat(table.style.top || '0') || 0;

            return {
              afterSyncTop,
              beforeMoveTop,
              expectedTop,
              ok: Math.abs(afterSyncTop - expectedTop) <= 1 && Math.abs(afterSyncTop - beforeMoveTop) > 1,
            };
          } finally {
            if (editor && originalHtml) {
              editor.setHtml(originalHtml, { resetHistory: false, notify: false });
            }
          }
        })()))()
      `,
    ),
  );

  if (!result.ok) {
    throw new Error(`데이터블록 하단 표 위치 유지 회귀 실패: ${JSON.stringify(result)}`);
  }
}

async function assertTableObjectMoveDoesNotSplitCandidateBlockGrid(client) {
  const result = JSON.parse(
    await evaluate(
      client,
      `
        (async () => JSON.stringify(await (async () => {
          const editor = window.ExamListTemplateEditorRuntime;
          const runtimeReflow = window.ExamListTemplateEditorObjectFlowReflow?.reflowTemplateEditorObjectRows;
          const appModule = await import('/client/features/template-editor/object-flow-reflow.js');
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const originalHtml = editor?.getHtml?.() || "";

          const createFixture = () => {
            documentElement.innerHTML = '';

            const grid = document.createElement('div');
            grid.className = 'examlist-candidate-block-grid';
            grid.dataset.candidateBlockGrid = 'true';
            grid.dataset.candidateBlockColumns = '2';
            grid.dataset.candidateBlockRows = '8';
            grid.dataset.candidateBlockVariant = 'photo';
            grid.dataset.candidateBlockObject = 'true';
            grid.setAttribute('contenteditable', 'false');
            grid.style.position = 'relative';
            grid.style.width = '720px';
            grid.style.height = '760px';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
            grid.style.gridTemplateRows = 'repeat(8, minmax(52px, 1fr))';
            grid.style.gap = '4pt 4pt';
            grid.style.margin = '0';

            for (let index = 0; index < 16; index += 1) {
              const block = document.createElement('div');

              block.className = 'examlist-candidate-block';
              block.dataset.candidateBlockInstance = String(index + 1);
              block.innerHTML = '<p><br></p>';
              grid.append(block);
            }

            const table = document.createElement('table');

            table.innerHTML = '<tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody>';
            table.style.width = '720px';
            table.style.height = '58px';
            table.style.borderCollapse = 'collapse';
            table.style.tableLayout = 'fixed';
            table.style.position = 'absolute';
            table.style.left = '0px';
            table.style.top = '820px';
            table.style.margin = '0';
            table.style.maxWidth = 'none';
            table.style.zIndex = '2';
            table.querySelectorAll('td').forEach((cell) => {
              cell.style.border = '1px solid #111';
              cell.style.height = '28px';
              cell.style.padding = '0';
            });

            documentElement.append(grid, table);
            return { grid, table };
          };

          const runCase = (name, reflow) => {
            if (typeof reflow !== 'function') {
              return { name, ok: false, reason: 'missing-reflow' };
            }

            const { grid, table } = createFixture();

            reflow(table, {
              activeHeight: 58,
              activeTop: 820,
              documentElement,
              minimumHeight: 5,
              movementY: 0,
              reorderByPosition: false,
            });
            table.style.top = '80px';
            reflow(table, {
              activeHeight: 58,
              activeTop: 80,
              documentElement,
              minimumHeight: 5,
              movementY: -740,
              reorderByPosition: false,
            });

            const grids = [...documentElement.querySelectorAll('[data-candidate-block-grid]')];
            const childOrder = [...documentElement.children]
              .slice(0, 8)
              .map((child) => child.matches('[data-template-object-flow-spacer]')
                ? 'spacer'
                : child.matches('[data-candidate-block-grid]')
                  ? 'candidate-grid'
                  : child.tagName.toLowerCase());

            return {
              name,
              blockCount: grid.querySelectorAll('[data-candidate-block-instance]').length,
              childOrder,
              gridCount: grids.length,
              gridConnected: grid.isConnected,
              ok: grid.isConnected &&
                grids.length === 1 &&
                grid.querySelectorAll('[data-candidate-block-instance]').length === 16 &&
                table.isConnected,
            };
          };

          try {
            if (!editor || !documentElement) {
              return { ok: false, results: [{ name: 'setup', ok: false, reason: 'missing-editor-runtime' }] };
            }

            const results = [
              runCase('runtime-global', runtimeReflow),
              runCase('app-module', appModule.reflowTemplateEditorObjectRows),
            ];

            return { ok: results.every((entry) => entry.ok), results };
          } finally {
            if (editor && originalHtml) {
              editor.setHtml(originalHtml, { resetHistory: false, notify: false });
            }
          }
        })()))()
      `,
    ),
  );

  if (!result.ok) {
    throw new Error(`표 이동 중 데이터블록 분해 회귀 실패: ${JSON.stringify(result)}`);
  }
}

async function runCandidateBlockGridMoveResizeScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (async () => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const documentElement = grid?.closest('.template-doc');

          if (!grid || !documentElement) {
            return false;
          }

          const selection = await import('/client/features/template-editor/candidate-block-grid-selection.js');

          grid.style.position = 'absolute';
          grid.style.left = '120px';
          grid.style.top = '120px';
          grid.style.width = '280px';
          grid.style.height = '240px';
          grid.style.margin = '0';
          grid.style.maxWidth = 'none';
          selection.selectCandidateBlockGridElement(grid);
          return true;
        })()
      `,
    );
    const candidateBlockRightResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-resize-handle][data-candidate-block-grid-resize-corner="right"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 우측 핸들 리사이즈 시작",
    );
    const candidateBlockRightResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
            const rect = grid?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(client, candidateBlockRightResizeStartPoint, {
      x: candidateBlockRightResizeStartPoint.x - 42,
      y: candidateBlockRightResizeStartPoint.y + 24,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const rect = grid?.getBoundingClientRect();
          const before = ${JSON.stringify(candidateBlockRightResizeBefore)};

          return Boolean(
            grid &&
              rect &&
              Math.round(rect.width) <= before.width - 30 &&
              Math.abs(Math.round(rect.height) - before.height) <= 3
          );
        })()
      `,
      "수험생 데이터 블록 우측 핸들 단일축 리사이즈",
    );
    const candidateBlockTopResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
            const rect = grid?.getBoundingClientRect();

            return {
              bottom: Math.round(rect?.bottom || 0),
              height: Math.round(rect?.height || 0),
              top: Math.round(rect?.top || 0)
            };
          })())
        `,
      ),
    );
    const candidateBlockTopResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-resize-handle][data-candidate-block-grid-resize-corner="top"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 상단 핸들 리사이즈 시작",
    );
    await dispatchBrowserMouseDrag(client, candidateBlockTopResizeStartPoint, {
      x: candidateBlockTopResizeStartPoint.x,
      y: candidateBlockTopResizeStartPoint.y + 32,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const rect = grid?.getBoundingClientRect();
          const before = ${JSON.stringify(candidateBlockTopResizeBefore)};

          return Boolean(
            grid &&
              rect &&
              Math.round(rect.top) >= before.top + 20 &&
              Math.abs(Math.round(rect.bottom) - before.bottom) <= 3 &&
              Math.round(rect.height) <= before.height - 20
          );
        })()
      `,
      "수험생 데이터 블록 상단 핸들 반대편 고정 리사이즈",
    );
    await evaluate(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          if (!grid) {
            return false;
          }

          let paragraph = document.querySelector('#candidateBlockFlowTextSmoke');

          if (!paragraph) {
            paragraph = document.createElement('p');
            paragraph.id = 'candidateBlockFlowTextSmoke';
            grid.after(paragraph);
          }

          paragraph.textContent = '데이터블록 아래 일반 텍스트';
          paragraph.style.margin = '0';
          return true;
        })()
      `,
    );
    const candidateBlockMoveStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-move-handle]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 이동 시작",
    );
    const candidateBlockMoveBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
            const rect = grid?.getBoundingClientRect();

            return {
              left: Math.round(rect?.left || 0),
              top: Math.round(rect?.top || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(client, candidateBlockMoveStartPoint, {
      x: candidateBlockMoveStartPoint.x + 38,
      y: candidateBlockMoveStartPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const flowText = document.querySelector('#candidateBlockFlowTextSmoke');
          const rect = grid?.getBoundingClientRect();
          const textRect = flowText?.getBoundingClientRect();
          const before = ${JSON.stringify(candidateBlockMoveBefore)};
          const flowSpacers = [...(grid?.closest('.template-doc')?.querySelectorAll('[data-template-object-flow-spacer]') || [])]
            .filter((spacer) => spacer.dataset.templateObjectFlowKind === 'candidate-block-grid');

          return Boolean(
            grid &&
              flowText &&
              rect &&
              textRect &&
              grid.style.position === 'absolute' &&
              Math.round(rect.left) >= before.left + 25 &&
              textRect.top < rect.bottom - 1 &&
              flowSpacers.length === 0 &&
              !grid.dataset.templateObjectFlowId &&
              Number.parseFloat(grid.style.left || '0') >= 25
          );
        })()
      `,
      "수험생 데이터 블록 이동 핸들 드래그",
    );
    const candidateBlockResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-resize-handle]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 모음 리사이즈 시작",
    );
    await dispatchBrowserMouseDrag(client, candidateBlockResizeStartPoint, {
      x: candidateBlockResizeStartPoint.x + 36,
      y: candidateBlockResizeStartPoint.y + 28,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');

          return Boolean(
            grid &&
              (Number.parseFloat(grid.style.width) || 0) >= 120 &&
              (Number.parseFloat(grid.style.height) || 0) >= 80
          );
        })()
      `,
      "수험생 데이터 블록 모음 크기 변경",
    );
    const candidateBlockBoundaryResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('#templateEditorSurface [data-candidate-block-grid-resize-handle]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "수험생 데이터 블록 하단 경계 리사이즈 시작",
    );
    await dispatchBrowserMouseDrag(client, candidateBlockBoundaryResizeStartPoint, {
      x: candidateBlockBoundaryResizeStartPoint.x + 48,
      y: candidateBlockBoundaryResizeStartPoint.y + 2000,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const documentElement = grid?.closest('.template-doc');

          if (!grid || !documentElement) {
            return false;
          }

          const gridRect = grid.getBoundingClientRect();
          const documentRect = documentElement.getBoundingClientRect();

          return gridRect.bottom <= documentRect.bottom + 1;
        })()
      `,
      "수험생 데이터 블록 하단 여백 경계 제한",
    );
    await evaluate(
      client,
      `
        (async () => {
          const selection = await import('/client/features/template-editor/candidate-block-grid-selection.js');
          const controls = await import('/client/features/template-editor/candidate-block-grid-object-controls.js');
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const documentElement = grid?.closest('.template-doc');

          if (!grid || !documentElement) {
            return false;
          }

          controls.ensureCandidateBlockGridObjectControls(grid);
          grid.style.position = 'absolute';
          grid.style.left = '48px';
          grid.style.top = '24px';
          grid.style.width = Math.min(Math.max(240, documentElement.clientWidth - 96), 420) + 'px';
          grid.style.height = '520px';
          grid.style.margin = '0';
          grid.style.maxWidth = 'none';
          grid.style.zIndex = '2';

          let paragraph = documentElement.querySelector('#candidateBlockTextBelowSmoke');

          if (!paragraph) {
            paragraph = document.createElement('p');
            paragraph.id = 'candidateBlockTextBelowSmoke';
            documentElement.append(paragraph);
          }

          paragraph.textContent = '감독관 (서명)';
          paragraph.style.left = '48px';
          paragraph.style.margin = '0';
          paragraph.style.position = 'absolute';
          paragraph.style.top = '568px';

          selection.selectCandidateBlockGridElement(grid);
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const paper = grid?.closest('.editor-paper');
          const moveHandle = grid?.querySelector('[data-candidate-block-grid-move-handle]');
          const handles = [...(grid?.querySelectorAll('[data-candidate-block-grid-resize-handle]') || [])];
          const gridRect = grid?.getBoundingClientRect();
          const paperRect = paper?.getBoundingClientRect();
          const isHandleVisible = (handle) => {
            const rect = handle?.getBoundingClientRect();

            if (!rect || rect.width <= 0 || rect.height <= 0 || !paperRect) {
              return false;
            }

            return rect.left >= paperRect.left &&
              rect.right <= paperRect.right &&
              rect.top >= paperRect.top &&
              rect.bottom <= paperRect.bottom &&
              getComputedStyle(handle).display !== 'none';
          };

          return Boolean(
            grid &&
              gridRect &&
              paperRect &&
              grid.classList.contains('is-selected-candidate-block-grid') &&
              getComputedStyle(grid).zIndex === '30' &&
              moveHandle &&
              getComputedStyle(moveHandle).display !== 'none' &&
              handles.length === 8 &&
              isHandleVisible(moveHandle) &&
              handles.every(isHandleVisible)
          );
        })()
      `,
      "수험생 데이터 블록 아래 텍스트 입력 후 개체 핸들 표시",
    );
    await assertTableBelowCandidateBlockKeepsExplicitBottomPosition(client);
    await assertTableObjectMoveDoesNotSplitCandidateBlockGrid(client);
}

module.exports = { runCandidateBlockGridMoveResizeScenario };
