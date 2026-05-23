const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { setRuntimeHtml } = require("./runtime");

async function runCompactLineHeightCase(client) {
  await setRuntimeHtml(client, '<div class="template-doc"><p id="lineHeightParagraph">줄 간격 확인 문단</p></div>');
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#lineHeightParagraph');
        const lineHeightInput = document.querySelector('#templateEditorToolbarHost .template-toolbar-line-height-input');

        if (!paragraph || !lineHeightInput || lineHeightInput.min !== '0') {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        lineHeightInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        lineHeightInput.value = '0';
        lineHeightInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#lineHeightParagraph');
        const style = paragraph ? getComputedStyle(paragraph) : null;
        const lineSpacingPt =
          (Number.parseFloat(style?.lineHeight || '') - Number.parseFloat(style?.fontSize || '')) * 0.75;

        return Boolean(
          paragraph &&
            paragraph.style.lineHeight === '1' &&
            paragraph.style.marginBottom === '0pt' &&
            Number.isFinite(lineSpacingPt) &&
            Math.abs(lineSpacingPt) <= 0.05
        );
      })()
    `,
    "툴바 줄 간격 좁게 적용",
  );
}

async function runParagraphLineHeightCase(client) {
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#lineHeightParagraph');
        const lineHeightInput = document.querySelector('#templateEditorToolbarHost .template-toolbar-line-height-input');

        if (!paragraph || !lineHeightInput) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        lineHeightInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        lineHeightInput.value = '1.2';
        lineHeightInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
        lineHeightInput.stepUp();
        lineHeightInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#lineHeightParagraph');
        const style = paragraph ? getComputedStyle(paragraph) : null;
        const lineSpacingPt =
          (Number.parseFloat(style?.lineHeight || '') - Number.parseFloat(style?.fontSize || '')) * 0.75;

        return Boolean(
          paragraph &&
            paragraph.style.lineHeight &&
            paragraph.style.marginBottom === '1.3pt' &&
            Number.isFinite(lineSpacingPt) &&
            Math.abs(lineSpacingPt - 1.3) <= 0.05
        );
      })()
    `,
    "툴바 줄 간격 문단 적용",
  );
}

async function runDataTagLineHeightCases(client) {
  await runCompactLineHeightCase(client);
  await runParagraphLineHeightCase(client);
}

module.exports = {
  runCompactLineHeightCase,
  runDataTagLineHeightCases,
  runParagraphLineHeightCase,
};
