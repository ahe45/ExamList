const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { setRuntimeHtml } = require("./runtime");

async function runCompactLineHeightCase(client) {
  await setRuntimeHtml(client, '<div class="template-doc"><p id="lineHeightParagraph">줄 간격 확인 문단</p></div>');
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#lineHeightParagraph');
        const lineHeightToggle = document.querySelector('#templateEditorToolbarHost [data-template-line-height-toggle]');
        const lineHeightOption = document.querySelector('#templateEditorToolbarHost [data-template-line-height-option="0"]');

        if (!paragraph || !lineHeightToggle || !lineHeightOption) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        lineHeightToggle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        lineHeightToggle.click();
        lineHeightOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        lineHeightOption.click();
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
        const lineHeightToggle = document.querySelector('#templateEditorToolbarHost [data-template-line-height-toggle]');
        const lineHeightOption = document.querySelector('#templateEditorToolbarHost [data-template-line-height-option="1.5"]');

        if (!paragraph || !lineHeightToggle || !lineHeightOption) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        lineHeightToggle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        lineHeightToggle.click();
        lineHeightOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        lineHeightOption.click();
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
            paragraph.style.marginBottom === '1.5pt' &&
            Number.isFinite(lineSpacingPt) &&
            Math.abs(lineSpacingPt - 1.5) <= 0.05
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
