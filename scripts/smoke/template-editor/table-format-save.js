const {
  dispatchBrowserMouseClick,
  evaluate,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runTableFormatSaveScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const cell = surface?.querySelector('.template-doc table tr:first-child td:first-child');
          const lineHeightInput = document.querySelector('#templateEditorToolbarHost .template-toolbar-line-height-input');

          if (!surface || !cell || !lineHeightInput) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          surface.focus();
          range.selectNodeContents(cell);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

          lineHeightInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
          lineHeightInput.value = '1.25';
          lineHeightInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
          const style = cell ? getComputedStyle(cell) : null;
          const lineSpacingPt =
            (Number.parseFloat(style?.lineHeight || '') - Number.parseFloat(style?.fontSize || '')) * 0.75;

        return Boolean(
            cell &&
              cell.style.lineHeight &&
              Number.isFinite(lineSpacingPt) &&
              Math.abs(lineSpacingPt - 1.25) <= 0.05
          );
        })()
      `,
      "툴바 줄 간격 표 셀 적용",
    );
    const tableWidthPersistenceMetrics = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const table = document.querySelector('#templateEditorSurface .template-doc table');
            const columns = [...(table?.querySelectorAll('colgroup col') || [])];
            const visualWidths = [...(table?.rows?.[0]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));

            return {
              colWidths: columns.map((column) => Math.round(parseFloat(column.style.width) || 0)),
              tableWidth: Math.round(parseFloat(table?.style.width) || table?.getBoundingClientRect().width || 0),
              visualWidths
            };
          })())
        `,
      ),
    );
    await evaluate(
      client,
      `
        (() => {
          window.__examlistSmokeLastTemplatePatch = null;
          window.__examlistSmokeLastTemplatePatchError = '';
          return true;
        })()
      `,
    );
    await dispatchBrowserMouseClick(client, '[data-action="save-template-layout"]');
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const table = surface?.querySelector('.template-doc table');
          const payload = window.__examlistSmokeLastTemplatePatch;
          const pageId = surface?.dataset.pageId || '';
          const savedPage = payload?.layout?.pages?.find((page) => page.id === pageId) || null;
          const savedHtml = String(savedPage?.settings?.documentHtml || '');
          const recognitionMarks = savedPage?.settings?.recognitionMarks || null;
          const columns = [...(table?.querySelectorAll('colgroup col') || [])];
          const colWidths = columns.map((column) => Math.round(parseFloat(column.style.width) || 0));
          const visualWidths = [...(table?.rows?.[0]?.cells || [])].map((cell) => Math.round(cell.getBoundingClientRect().width));
          const firstCell = table?.rows?.[0]?.cells?.[0] || null;
          const firstCellStyle = firstCell ? getComputedStyle(firstCell) : null;
          const saveButton = document.querySelector('[data-action="save-template-layout"]');
          const firstCellLineSpacingPt =
            (Number.parseFloat(firstCellStyle?.lineHeight || '') - Number.parseFloat(firstCellStyle?.fontSize || '')) * 0.75;
          const savedLineHeightMatches =
            /line-height:\\s*calc\\(1em \\+ [^)]+\\)/i.test(savedHtml);
          const before = ${JSON.stringify(tableWidthPersistenceMetrics)};
          const toast = document.querySelector('.toast-root.has-toast .toast-message');
          const widthsMatch =
            colWidths.length === before.colWidths.length &&
            colWidths.every((width, index) => Math.abs(width - before.colWidths[index]) <= 2);
          const visualWidthsMatch =
            visualWidths.length === before.visualWidths.length &&
            visualWidths.every((width, index) => Math.abs(width - before.visualWidths[index]) <= 4);

          return Boolean(
            surface &&
              table &&
              payload &&
              recognitionMarks &&
              recognitionMarks.enabled === true &&
              Math.abs(Number(recognitionMarks.offsetXPt) - (12 * 72 / 25.4)) <= 0.1 &&
              Math.abs(Number(recognitionMarks.offsetYPt) - (8 * 72 / 25.4)) <= 0.1 &&
              savedHtml.includes('<colgroup') &&
              /<col/i.test(savedHtml) &&
              /width:\\s*\\d+px/i.test(savedHtml) &&
              savedLineHeightMatches &&
              widthsMatch &&
              visualWidthsMatch &&
              firstCell &&
              firstCell.style.lineHeight &&
              Number.isFinite(firstCellLineSpacingPt) &&
              Math.abs(firstCellLineSpacingPt - 1.25) <= 0.05 &&
              saveButton &&
              !saveButton.disabled &&
              toast &&
              toast.textContent.trim() === '양식을 저장했습니다.'
          );
        })()
      `,
      "표 열 너비 저장 후 재렌더링 유지",
    );
}

module.exports = { runTableFormatSaveScenario };
