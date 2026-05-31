const {
  dispatchBrowserKey,
  dispatchBrowserMouseClick,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runTableBasicEditingScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p><br /></p></div>',
            { resetHistory: false, notify: false }
          );
          return true;
        })()
      `,
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc') || surface;

          if (!surface || !documentElement) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.selectNodeContents(documentElement);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="table"]');
    await waitForCondition(
      client,
      `
        (() => {
          const panel = document.querySelector('#templateEditorToolbarHost .template-table-insert-panel');
          const toggle = document.querySelector('#templateEditorToolbarHost [data-template-insert="table"]');

          return Boolean(panel && toggle && !panel.classList.contains('hidden') && toggle.getAttribute('aria-expanded') === 'true');
        })()
      `,
      "표 삽입 버튼 패널 열림",
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
          columnsInput.value = '3';
          return true;
        })()
      `,
    );
    await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="table-confirm"]');
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const rows = [...(table?.rows || [])];

          return Boolean(
            table &&
              rows.length === 2 &&
              rows.every((row) => row.cells.length === 3) &&
              !table.querySelector('th') &&
              !table.textContent.trim() &&
              [...table.querySelectorAll('td')].every((cell) => !String(cell.style.background || cell.style.backgroundColor || '').trim())
          );
        })()
      `,
      "표 삽입 버튼 빈 표 생성",
    );
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
    await dispatchBrowserKey(client, "ArrowDown", { code: "ArrowDown", keyCode: 40 });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(2) td:first-child')?.classList.contains('is-active-cell')`,
      "표 방향키 아래 이동",
    );
    await dispatchBrowserKey(client, "ArrowRight", { code: "ArrowRight", keyCode: 39 });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(2) td:nth-child(2)')?.classList.contains('is-active-cell')`,
      "표 방향키 오른쪽 이동",
    );
    await dispatchBrowserKey(client, "ArrowUp", { code: "ArrowUp", keyCode: 38 });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:nth-child(2)')?.classList.contains('is-active-cell')`,
      "표 방향키 위 이동",
    );
    await dispatchBrowserKey(client, "ArrowLeft", { code: "ArrowLeft", keyCode: 37 });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child')?.classList.contains('is-active-cell')`,
      "표 방향키 왼쪽 이동",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const activeCell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child.is-active-cell');
          const activeStyle = activeCell ? getComputedStyle(activeCell) : null;

          return Boolean(
            activeCell &&
              activeStyle &&
              activeStyle.outlineStyle === 'none' &&
              activeStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
          );
        })()
      `,
      "표 활성 셀 단독 강조 없음",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');

          if (!surface || !cell) {
            return false;
          }

          cell.textContent = 'ABC';
          const textNode = cell.firstChild;
          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.setStart(textNode, 1);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserKey(client, "ArrowRight", { code: "ArrowRight", keyCode: 39 });
    await waitForCondition(
      client,
      `
        (() => {
          const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
          const selection = window.getSelection();

          return Boolean(
            cell?.classList.contains('is-active-cell') &&
              selection.anchorNode === cell.firstChild &&
              selection.anchorOffset === 2
          );
        })()
      `,
      "표 셀 텍스트 안쪽 오른쪽 방향키 커서 이동 우선",
    );
    await dispatchBrowserKey(client, "ArrowLeft", { code: "ArrowLeft", keyCode: 37 });
    await waitForCondition(
      client,
      `
        (() => {
          const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
          const selection = window.getSelection();

          return Boolean(
            cell?.classList.contains('is-active-cell') &&
              selection.anchorNode === cell.firstChild &&
              selection.anchorOffset === 1
          );
        })()
      `,
      "표 셀 텍스트 안쪽 왼쪽 방향키 커서 이동 우선",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');
          const textNode = cell?.firstChild;

          if (!surface || !cell || !textNode) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.setStart(textNode, textNode.textContent.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserKey(client, "ArrowRight", { code: "ArrowRight", keyCode: 39 });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:nth-child(2)')?.classList.contains('is-active-cell')`,
      "표 셀 텍스트 끝 오른쪽 방향키 셀 이동",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');

          if (!surface || !cell) {
            return false;
          }

          cell.innerHTML = '<div>Top line</div><div>Bottom line</div>';
          const firstLineText = cell.querySelector('div:first-child')?.firstChild;
          const selection = window.getSelection();
          const range = document.createRange();

          if (!firstLineText) {
            return false;
          }

          surface.focus();
          range.setStart(firstLineText, 1);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserKey(client, "ArrowDown", { code: "ArrowDown", keyCode: 40 });
    await waitForCondition(
      client,
      `
        (() => {
          const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
          const bottomText = cell?.querySelector('div:nth-child(2)')?.firstChild;
          const selection = window.getSelection();

          return Boolean(
            cell?.classList.contains('is-active-cell') &&
              bottomText &&
              selection.anchorNode === bottomText
          );
        })()
      `,
      "표 셀 여러 줄 텍스트 아래 방향키 커서 이동 우선",
    );
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');
          const bottomText = cell?.querySelector('div:nth-child(2)')?.firstChild;

          if (!surface || !cell || !bottomText) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.setStart(bottomText, bottomText.textContent.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserKey(client, "ArrowDown", { code: "ArrowDown", keyCode: 40 });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(2) td:first-child')?.classList.contains('is-active-cell')`,
      "표 셀 텍스트 마지막 줄 아래 방향키 셀 이동",
    );
    const selectionStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
        const rect = cell?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "표 선택 시작",
    );
    const selectionEndPoint = await getBrowserPoint(
      client,
      `(() => {
        const cell = document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(2) td:nth-child(3)');
        const rect = cell?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "표 선택 종료",
    );
    await dispatchBrowserMouseDrag(client, selectionStartPoint, selectionEndPoint);
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const selectedCells = [...document.querySelectorAll('#templateEditorSurface .template-doc table td.is-selected-cell')];
          const selectedStyle = selectedCells[0] ? getComputedStyle(selectedCells[0]) : null;

          return Boolean(
            surface &&
              selectedCells.length === 6 &&
              selectedStyle &&
              selectedStyle.outlineStyle === 'solid' &&
              selectedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
          );
        })()
      `,
      "표 셀 드래그 선택 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');

          if (!table) {
            return false;
          }

          let colGroup = table.querySelector('colgroup');

          if (!colGroup) {
            colGroup = document.createElement('colgroup');
            table.insertBefore(colGroup, table.firstElementChild);
          }

          while (colGroup.children.length < 3) {
            colGroup.appendChild(document.createElement('col'));
          }

          [...colGroup.children].forEach((column) => {
            column.style.width = '24px';
          });
          table.style.width = '100%';
          table.style.maxWidth = '';
          return true;
        })()
      `,
    );
    const resizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
        const rect = cell?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.right - 2, y: rect.top + rect.height / 2 };
      })()`,
      "표 열 리사이즈 시작",
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: resizeStartPoint.x,
      y: resizeStartPoint.y,
    });
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface')?.classList.contains('is-table-column-hover')`,
      "표 열 경계 리사이즈 커서 표시",
    );
    const resizeBeforeMetrics = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#templateEditorSurface .template-doc table');
            const widths = [...(table?.rows?.[0]?.cells || [])].map((cell) => cell.getBoundingClientRect().width);

            return {
              tableWidth: table?.getBoundingClientRect().width || 0,
              totalWidth: widths.reduce((sum, width) => sum + width, 0),
              widths
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(client, resizeStartPoint, { x: resizeStartPoint.x - 48, y: resizeStartPoint.y });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const widths = [...(table?.rows?.[0]?.cells || [])].map((cell) => cell.getBoundingClientRect().width);
          const totalWidth = widths.reduce((sum, width) => sum + width, 0);
          const tableWidth = table?.getBoundingClientRect().width || 0;
          const before = ${JSON.stringify(resizeBeforeMetrics)};

          return Boolean(
            table &&
              widths.length >= 3 &&
              widths[0] <= before.widths[0] - 30 &&
              widths[1] >= before.widths[1] + 30 &&
              Math.abs(totalWidth - before.totalWidth) <= 2 &&
              Math.abs(tableWidth - before.tableWidth) <= 2 &&
              table.style.width.endsWith('px') &&
              !document.querySelector('#templateEditorSurface')?.classList.contains('is-table-column-resizing')
          );
        })()
      `,
      "표 생성 직후 열 경계 드래그 축소",
    );
    const resizeExpandStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
        const rect = cell?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.right - 2, y: rect.top + rect.height / 2 };
      })()`,
      "표 열 확대 리사이즈 시작",
    );
    const resizeExpandBeforeMetrics = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#templateEditorSurface .template-doc table');
            const widths = [...(table?.rows?.[0]?.cells || [])].map((cell) => cell.getBoundingClientRect().width);

            return {
              tableWidth: table?.getBoundingClientRect().width || 0,
              totalWidth: widths.reduce((sum, width) => sum + width, 0),
              widths
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(client, resizeExpandStartPoint, {
      x: resizeExpandStartPoint.x + 64,
      y: resizeExpandStartPoint.y,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const table = document.querySelector('#templateEditorSurface .template-doc table');
          const widths = [...(table?.rows?.[0]?.cells || [])].map((cell) => cell.getBoundingClientRect().width);
          const totalWidth = widths.reduce((sum, width) => sum + width, 0);
          const tableWidth = table?.getBoundingClientRect().width || 0;
          const before = ${JSON.stringify(resizeExpandBeforeMetrics)};

          return Boolean(
            table &&
              widths.length >= 3 &&
              widths[0] >= before.widths[0] + 40 &&
              widths[1] <= before.widths[1] - 40 &&
              Math.abs(totalWidth - before.totalWidth) <= 2 &&
              Math.abs(tableWidth - before.tableWidth) <= 2 &&
              table.style.width.endsWith('px') &&
              !document.querySelector('#templateEditorSurface')?.classList.contains('is-table-column-resizing')
          );
        })()
      `,
      "표 열 경계 드래그 확대",
    );
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 2048,
      height: 1300,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const scrollInvariantMetrics = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            window.ExamListTemplateEditorRuntime?.setHtml?.(
              '<div class="template-doc"><table style="width: 100%; border-collapse: collapse; table-layout: fixed;"><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p></div>',
              { resetHistory: false, notify: false }
            );
            const documentElement = document.querySelector('#templateEditorSurface .template-doc');
            const table = documentElement?.querySelector('table');
            const targetWidth = Math.max(1, documentElement?.clientWidth || 0);

            if (table && targetWidth > 0) {
              table.style.width = targetWidth + 'px';
              table.style.maxWidth = 'none';
              table.querySelectorAll('colgroup').forEach((colGroup) => colGroup.remove());
              const colGroup = document.createElement('colgroup');
              const columnWidth = Math.floor(targetWidth / 2);

              [columnWidth, targetWidth - columnWidth].forEach((width) => {
                const col = document.createElement('col');

                col.style.width = width + 'px';
                colGroup.append(col);
              });
              table.insertBefore(colGroup, table.firstElementChild);
            }

            return {
              documentWidth: documentElement?.getBoundingClientRect().width || 0,
              tableRightGap: documentElement && table
                ? documentElement.getBoundingClientRect().right - table.getBoundingClientRect().right
                : null
            };
          })())
        `,
      ),
    );
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 2048,
      height: 650,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const canvas = document.querySelector('.template-editor-page');
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc');
          const table = documentElement?.querySelector('table');
          const before = ${JSON.stringify(scrollInvariantMetrics)};
          const documentRect = documentElement?.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();

          return Boolean(
            canvas &&
              surface &&
              documentElement &&
              table &&
              documentRect &&
              tableRect &&
              canvas.scrollHeight > canvas.clientHeight + 1 &&
              Math.abs(documentRect.width - before.documentWidth) <= 1 &&
              tableRect.right <= documentRect.right + 0.5 &&
              before.tableRightGap >= -0.5
          );
        })()
      `,
      "표 px 폭 세로 스크롤 시 여백 경계 유지",
    );
    await client.send("Emulation.clearDeviceMetricsOverride");
}

module.exports = { runTableBasicEditingScenario };
