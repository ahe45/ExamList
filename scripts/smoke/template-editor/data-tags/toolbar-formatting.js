const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { setRuntimeHtml } = require("./runtime");

async function runMixedToolbarFormattingCase(client) {
  await setRuntimeHtml(
    client,
    '<div class="template-doc"><p><span id="mixedToolbarFormatText">툴바혼합텍스트</span><span class="template-token" contenteditable="false" data-template-tag-value="candidate.examNo" data-template-tag-label="#수험번호">#수험번호</span></p></div>',
  );
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#templateEditorSurface .template-doc p');
        const fontSizeInput = document.querySelector('#templateEditorToolbarHost .template-toolbar-font-size-input');
        const boldButton = document.querySelector('#templateEditorToolbarHost [data-template-command="bold"]');

        if (!paragraph || !fontSizeInput || !boldButton) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        fontSizeInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        fontSizeInput.value = '27';
        fontSizeInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

        boldButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        boldButton.click();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const text = document.querySelector('#mixedToolbarFormatText');
        const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const textStyle = text ? getComputedStyle(text) : null;
        const textWeightCarrier = text?.querySelector('b,strong,[style*="font-weight"]') || text;
        const textWeightStyle = textWeightCarrier ? getComputedStyle(textWeightCarrier) : null;
        const tokenStyle = token ? getComputedStyle(token) : null;
        const textWeight = Number(textWeightStyle?.fontWeight || 0);
        const tokenWeight = Number(tokenStyle?.fontWeight || 0);
        const expectedFontSize = 27 * 96 / 72;

        return Boolean(
          text &&
            token &&
            textStyle &&
            tokenStyle &&
            Math.abs(Number.parseFloat(textStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            Math.abs(Number.parseFloat(tokenStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            (textWeightStyle?.fontWeight === 'bold' || textWeight >= 600) &&
            (tokenStyle.fontWeight === 'bold' || tokenWeight >= 600)
        );
      })()
    `,
    "툴바에서 텍스트와 데이터 태그 혼합 선택 서식 적용",
  );
}

async function runToolbarFontSizeStepperCase(client) {
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#templateEditorSurface .template-doc p');
        const fontSizeInput = document.querySelector('#templateEditorToolbarHost .template-toolbar-font-size-input');

        if (!paragraph || !fontSizeInput || fontSizeInput.type !== 'number') {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        fontSizeInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        fontSizeInput.stepUp();
        fontSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
        fontSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const text = document.querySelector('#mixedToolbarFormatText');
        const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const textStyle = text ? getComputedStyle(text) : null;
        const tokenStyle = token ? getComputedStyle(token) : null;
        const expectedFontSize = 28 * 96 / 72;

        return Boolean(
          text &&
            token &&
            textStyle &&
            tokenStyle &&
            Math.abs(Number.parseFloat(textStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            Math.abs(Number.parseFloat(tokenStyle.fontSize || '0') - expectedFontSize) < 0.1
        );
      })()
    `,
    "툴바 글자 크기 스핀 버튼 적용",
  );
}

async function runRawTextAndDataTagFontSizeStepperCase(client) {
  await setRuntimeHtml(
    client,
    '<div class="template-doc"><p id="rawTextTokenFontSizeLine">AAA <span class="template-token" contenteditable="false" data-template-tag-value="candidate.examNo" data-template-tag-label="#수험번호">#수험번호</span> BBB</p></div>',
  );
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#rawTextTokenFontSizeLine');
        const token = paragraph?.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const fontSizeInput = document.querySelector('#templateEditorToolbarHost .template-toolbar-font-size-input');

        if (!paragraph || !token || !fontSizeInput || fontSizeInput.type !== 'number') {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.setStart(paragraph.firstChild, 0);
        range.setEndAfter(token);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        fontSizeInput.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        fontSizeInput.stepUp();
        fontSizeInput.dispatchEvent(new Event('input', { bubbles: true }));
        fontSizeInput.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
        fontSizeInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#rawTextTokenFontSizeLine');
        const token = paragraph?.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const styledText = [...(paragraph?.querySelectorAll('span') || [])]
          .find((element) => !element.classList.contains('template-token') && element.textContent.includes('AAA'));
        const tokenStyle = token ? getComputedStyle(token) : null;
        const styledTextStyle = styledText ? getComputedStyle(styledText) : null;
        const expectedFontSize = 12 * 96 / 72;

        return Boolean(
          token &&
            styledText &&
            tokenStyle &&
            styledTextStyle &&
            Math.abs(Number.parseFloat(tokenStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            Math.abs(Number.parseFloat(styledTextStyle.fontSize || '0') - expectedFontSize) < 0.1
        );
      })()
    `,
    "원시 텍스트와 데이터 태그 혼합 선택 글자 크기 스핀 버튼 적용",
  );
}

async function runDataTagToolbarFormattingCases(client) {
  await runMixedToolbarFormattingCase(client);
  await runToolbarFontSizeStepperCase(client);
  await runRawTextAndDataTagFontSizeStepperCase(client);
}

module.exports = {
  runDataTagToolbarFormattingCases,
  runMixedToolbarFormattingCase,
  runRawTextAndDataTagFontSizeStepperCase,
  runToolbarFontSizeStepperCase,
};
