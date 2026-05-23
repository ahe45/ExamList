const {
  dispatchBrowserKey,
  dispatchBrowserMouseClickAtPoint,
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

async function runCandidateBlockGridTableDeleteSyncScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (() => {
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-instance]');
          const firstTable = firstBlock?.querySelector('table');

          if (!firstBlock || !firstTable) {
            return false;
          }

          firstTable.style.width = '1800px';
          firstTable.style.height = '1800px';
          [...firstTable.rows].forEach((row) => {
            row.style.height = '900px';
            [...row.cells].forEach((cell) => {
              cell.style.height = '900px';
            });
          });
          firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatSetBlockTextDirection', data: null }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const documentElement = document.querySelector('#templateEditorSurface .template-doc');
          const blocks = [...document.querySelectorAll('#templateEditorSurface [data-candidate-block-instance]')];
          const gridRect = grid?.getBoundingClientRect();
          const documentRect = documentElement?.getBoundingClientRect();

          return Boolean(
            grid &&
              documentElement &&
              gridRect.bottom <= documentRect.bottom + 1 &&
              blocks.length === 4 &&
              blocks.every((block) => {
                const table = block.querySelector('table');
                const blockRect = block.getBoundingClientRect();
                const tableRect = table?.getBoundingClientRect();

                return Boolean(
                  table &&
                    Math.abs(tableRect.width - blockRect.width) <= 2 &&
                    Math.abs(tableRect.height - blockRect.height) <= 2
                );
              })
          );
        })()
      `,
      "수험생 데이터 블록 표 과대 크기 정규화",
    );
    await openCandidateBlockFocusEditor(client);
    const candidateBlockTableObjectBorderPoint = await getBrowserPoint(
      client,
      `(() => {
        const table = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table');
        const rect = table?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + 2 };
      })()`,
      "수험생 데이터 블록 표 외곽선 선택 시작",
    );

    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: candidateBlockTableObjectBorderPoint.x,
      y: candidateBlockTableObjectBorderPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const overlay = document.querySelector('.template-editor-table-selection:not(.hidden)');
          const hitElement = document.elementFromPoint(${JSON.stringify(candidateBlockTableObjectBorderPoint.x)}, ${JSON.stringify(candidateBlockTableObjectBorderPoint.y)});
          const cursor = hitElement ? getComputedStyle(hitElement).cursor : "";

          return Boolean(
            overlay &&
              overlay.classList.contains('is-hover-only') &&
              cursor === 'pointer'
          );
        })()
      `,
      "수험생 데이터 블록 표 외곽선 호버 표시",
    );
    await dispatchBrowserMouseClickAtPoint(client, candidateBlockTableObjectBorderPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const table = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor table');
          const handles = document.querySelectorAll('.template-editor-table-selection:not(.hidden).is-selected .template-editor-table-handle');

          return Boolean(
              editor?.state?.templateEditor?.selectedTableElement === table &&
              table?.classList.contains('is-selected-table-object') &&
              handles.length === 8
          );
        })()
      `,
      "수험생 데이터 블록 표 개체 선택",
    );
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const focusedBlock = document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor');
          const selectedGrid = document.querySelector('#templateEditorSurface [data-candidate-block-grid].is-selected-candidate-block-grid');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

          return Boolean(
            grid &&
              focusedBlock &&
              !selectedGrid &&
              document.querySelector('[data-candidate-block-focus-layer]') &&
              blocks.length === 4 &&
              !focusedBlock.querySelector('table') &&
              focusedBlock.querySelector('p') &&
              blocks.every((block) => !block.querySelector('table') && block.querySelector('p')) &&
              !document.querySelector('.template-editor-table-selection:not(.hidden).is-selected')
          );
        })()
      `,
      "수험생 데이터 블록 표 개체 Delete 삭제 후 확대 편집 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

          if (!firstBlock) {
            return false;
          }

          firstBlock.innerHTML = '<table><tbody><tr><td>전체 선택 삭제</td><td>전체 선택 삭제</td></tr><tr><td>전체 선택 삭제</td><td>전체 선택 삭제</td></tr></tbody></table>';
          firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertHTML', data: null }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

          return Boolean(blocks.length === 4 && blocks.every((block) => block.querySelector('table')));
        })()
      `,
      "수험생 데이터 블록 표 전체 선택 삭제 테스트용 표 복구",
    );
    await evaluate(
      client,
      `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const block = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
          const table = block?.querySelector('table');
          const cells = [...(table?.querySelectorAll('td, th') || [])];

          if (!editor?.state?.templateEditor || !block || !table || !cells.length) {
            return false;
          }

          cells.forEach((cell) => cell.classList.add('is-selected-cell'));
          editor.state.templateEditor.tableSelection = {
            table,
            anchorCell: cells[0],
            focusCell: cells[cells.length - 1],
            selectedCells: cells,
            startRowIndex: 0,
            endRowIndex: table.rows.length - 1,
            startColIndex: 0,
            endColIndex: Math.max(0, table.querySelectorAll('colgroup col').length - 1)
          };
          window.getSelection()?.removeAllRanges();
          block.focus({ preventScroll: true });
          return true;
        })()
      `,
    );
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const focusedBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

          return Boolean(
            grid &&
              blocks.length === 4 &&
              focusedBlock &&
              !focusedBlock.querySelector('table') &&
              focusedBlock.querySelector('p') &&
              blocks.every((block) => !block.querySelector('table') && block.querySelector('p'))
          );
        })()
      `,
      "수험생 데이터 블록 표 전체 선택 삭제",
    );
    await evaluate(
      client,
      `
        (() => {
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

          if (!firstBlock) {
            return false;
          }

          firstBlock.innerHTML = '<table><tbody><tr><td>동기화 확인</td></tr></tbody></table>';
          firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '동기화 확인' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

          return Boolean(
            blocks.length === 4 &&
              blocks.every((block) => block.innerHTML.includes('동기화 확인'))
          );
        })()
      `,
      "반복 블록 마스터 편집 동기화",
    );
    await evaluate(
      client,
      `
        (() => {
          const firstBlock = document.querySelector('#templateEditorSurface [data-candidate-block-modal-editor-surface]');

          if (!firstBlock) {
            return false;
          }

          firstBlock.innerHTML = '<p><br></p>';
          firstBlock.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const grid = document.querySelector('#templateEditorSurface [data-candidate-block-grid]');
          const blocks = [...(grid?.querySelectorAll('[data-candidate-block-instance]') || [])];

          return Boolean(
            blocks.length === 4 &&
              blocks.every((block) => !block.textContent.trim())
          );
        })()
      `,
      "반복 블록 저장 전 빈 상태 복원",
    );
    await evaluate(
      client,
      `
        (async () => {
          const focusEditor = await import('/client/features/template-editor/candidate-block-grid-focus-editor.js');

          focusEditor.closeCandidateBlockFocusEditor();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `!document.querySelector('#templateEditorSurface .is-candidate-block-focus-editor')`,
      "수험생 데이터 블록 표 삭제 테스트 후 확대 편집 닫기",
    );
}

module.exports = { runCandidateBlockGridTableDeleteSyncScenario };
