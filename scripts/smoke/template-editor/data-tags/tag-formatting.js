const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { clickTemplateTagButton, focusEditorSurface, setRuntimeHtml } = require("./runtime");

async function runKoreanDataTagInsertionCase(client) {
  await setRuntimeHtml(client, '<div class="template-doc"><p><br></p></div>');
  await focusEditorSurface(client);
  await clickTemplateTagButton(client, "#수험번호");
  await waitForCondition(
    client,
    `
      (() => {
        const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const tokenText = token?.textContent.trim() || '';

        return Boolean(token && (tokenText === '수험번호' || tokenText === token.dataset.templateTagExample));
      })()
    `,
    "한글 데이터 태그 삽입 표시",
  );
}

async function runDirectTokenFormattingCase(client) {
  await evaluate(
    client,
    `
      (() => {
        const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');

        if (!token) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNode(token);
        selection.removeAllRanges();
        selection.addRange(range);

        window.ExamListTemplateEditorRuntime?.applyCommand?.('fontSizePx', '28');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('bold');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('italic');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('underline');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('foreColor', '#dc2626');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('hiliteColor', '#fef08a');
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const tokenStyle = token ? getComputedStyle(token) : null;
        const tokenWeight = Number(tokenStyle?.fontWeight || 0);
        const expectedFontSize = 28 * 96 / 72;

        return Boolean(
          token &&
            tokenStyle &&
            Math.abs(Number.parseFloat(tokenStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            (tokenStyle.fontWeight === 'bold' || tokenWeight >= 700) &&
            tokenStyle.fontStyle === 'italic' &&
            tokenStyle.textDecorationLine.includes('underline') &&
            tokenStyle.color === 'rgb(220, 38, 38)' &&
            tokenStyle.backgroundColor === 'rgb(254, 240, 138)'
        );
      })()
    `,
    "데이터 태그 객체 글자 크기 및 스타일 적용",
  );
}

async function runMixedCommandFormattingCase(client) {
  await setRuntimeHtml(
    client,
    '<div class="template-doc"><p><span id="mixedFormatText">혼합텍스트</span><span class="template-token" contenteditable="false" data-template-tag-value="candidate.examNo" data-template-tag-label="#수험번호">#수험번호</span></p></div>',
  );
  await evaluate(
    client,
    `
      (() => {
        const paragraph = document.querySelector('#templateEditorSurface .template-doc p');

        if (!paragraph) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(paragraph);
        selection.removeAllRanges();
        selection.addRange(range);

        window.ExamListTemplateEditorRuntime?.applyCommand?.('fontSizePx', '24');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('bold');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('foreColor', '#dc2626');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('hiliteColor', '#fef08a');
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const text = document.querySelector('#mixedFormatText');
        const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const textStyle = text ? getComputedStyle(text) : null;
        const textWeightCarrier = text?.querySelector('b,strong,[style*="font-weight"]') || text;
        const textWeightStyle = textWeightCarrier ? getComputedStyle(textWeightCarrier) : null;
        const textColorCarrier = text?.closest('[style*="color"]') || text;
        const textBackgroundCarrier = text?.closest('[style*="background-color"]') || text;
        const textColorStyle = textColorCarrier ? getComputedStyle(textColorCarrier) : null;
        const textBackgroundStyle = textBackgroundCarrier ? getComputedStyle(textBackgroundCarrier) : null;
        const tokenStyle = token ? getComputedStyle(token) : null;
        const textWeight = Number(textWeightStyle?.fontWeight || 0);
        const tokenWeight = Number(tokenStyle?.fontWeight || 0);
        const expectedFontSize = 24 * 96 / 72;

        return Boolean(
          text &&
            token &&
            textStyle &&
            tokenStyle &&
            Math.abs(Number.parseFloat(textStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            Math.abs(Number.parseFloat(tokenStyle.fontSize || '0') - expectedFontSize) < 0.1 &&
            (textWeightStyle?.fontWeight === 'bold' || textWeight >= 600) &&
            (tokenStyle.fontWeight === 'bold' || tokenWeight >= 600) &&
            textColorStyle?.color === 'rgb(220, 38, 38)' &&
            textBackgroundStyle?.backgroundColor === 'rgb(254, 240, 138)' &&
            tokenStyle.color === 'rgb(220, 38, 38)' &&
            tokenStyle.backgroundColor === 'rgb(254, 240, 138)'
        );
      })()
    `,
    "텍스트와 데이터 태그 혼합 선택 서식 적용",
  );
}

async function runDataTagCommandFormattingCases(client) {
  await runKoreanDataTagInsertionCase(client);
  await runDirectTokenFormattingCase(client);
  await runMixedCommandFormattingCase(client);
}

module.exports = {
  runDataTagCommandFormattingCases,
  runDirectTokenFormattingCase,
  runKoreanDataTagInsertionCase,
  runMixedCommandFormattingCase,
};
