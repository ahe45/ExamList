const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { setRuntimeHtml } = require("./runtime");

async function runInlineTokenTextHeightCase(client) {
  await waitForCondition(client, "Boolean(window.ExamListTemplateEditorRuntime?.setHtml)", "편집 런타임 준비");
  await setRuntimeHtml(
    client,
    '<div class="template-doc"><p id="tokenTextLine" style="font-size: 18pt; font-weight: 800; line-height: 1;"><span id="tokenTextLineTag" class="template-token" contenteditable="false" data-template-token="true" spellcheck="false" data-template-tag-value="candidate.examNo">수험번호</span> <span id="tokenTextLinePlain">수험생 확인대장</span></p><table><tbody><tr><td id="tokenTableLine" style="font-size: 18pt; font-weight: 800; line-height: 1;"><span id="tokenTableLineTag" class="template-token" contenteditable="false" data-template-token="true" spellcheck="false" data-template-tag-value="candidate.examNo">수험번호</span> <span id="tokenTableLinePlain">수험생 확인대장</span></td></tr></tbody></table></div>',
  );
  await evaluate(client, "window.ExamListTemplateEditorRuntime?.sync?.({ allowOverflow: true })");
  await waitForCondition(
    client,
    `
      (() => {
        const token = document.querySelector('#tokenTextLineTag');
        const plain = document.querySelector('#tokenTextLinePlain');
        const tableToken = document.querySelector('#tokenTableLineTag');
        const tablePlain = document.querySelector('#tokenTableLinePlain');

        if (!token || !plain || !tableToken || !tablePlain) {
          return false;
        }

        function textRect(element) {
          const textNode = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
          const range = document.createRange();

          range.selectNodeContents(textNode || element);
          return range.getBoundingClientRect();
        }

        const tokenTextRect = textRect(token);
        const plainRect = textRect(plain);
        const tableTokenTextRect = textRect(tableToken);
        const tablePlainRect = textRect(tablePlain);
        const tokenStyle = getComputedStyle(token);
        const plainStyle = getComputedStyle(plain);
        const fontSizeDiff = Math.abs(Number.parseFloat(tokenStyle.fontSize || '0') - Number.parseFloat(plainStyle.fontSize || '0'));
        const bottomDiff = Math.abs(tokenTextRect.bottom - plainRect.bottom);
        const centerDiff = Math.abs(((tokenTextRect.top + tokenTextRect.bottom) / 2) - ((plainRect.top + plainRect.bottom) / 2));
        const tableBottomDiff = Math.abs(tableTokenTextRect.bottom - tablePlainRect.bottom);
        const tableCenterDiff = Math.abs(((tableTokenTextRect.top + tableTokenTextRect.bottom) / 2) - ((tablePlainRect.top + tablePlainRect.bottom) / 2));

        return (
          tokenStyle.display === 'inline-block' &&
          fontSizeDiff <= 0.1 &&
          bottomDiff <= 0.2 &&
          centerDiff <= 0.2 &&
          tableBottomDiff <= 0.2 &&
          tableCenterDiff <= 0.2
        );
      })()
    `,
    "일반 캔버스 데이터 태그와 같은 행 텍스트 높이 정렬",
  );
}

async function runRepeatedTokenAlignmentCase(client) {
  await setRuntimeHtml(
    client,
    '<div class="template-doc"><p id="tokenAlignParagraph"><span class="template-token" contenteditable="false" data-template-token="true" spellcheck="false" data-template-tag-value="school.name" data-template-tag-label="#학교명">#학교명</span></p></div>',
  );
  await evaluate(
    client,
    `
      (() => {
        const token = document.querySelector('.template-token[data-template-tag-value="school.name"]');

        if (!token) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNode(token);
        selection.removeAllRanges();
        selection.addRange(range);

        window.ExamListTemplateEditorRuntime?.applyCommand?.('justifyCenter');
        window.ExamListTemplateEditorRuntime?.applyCommand?.('justifyCenter');
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const token = document.querySelector('.template-token[data-template-tag-value="school.name"]');
        const paragraph = document.querySelector('#tokenAlignParagraph');

        return Boolean(
            token &&
            paragraph &&
            token.textContent.trim() === '학교명' &&
            !token.textContent.includes('school.name') &&
            getComputedStyle(paragraph).textAlign === 'center'
        );
      })()
    `,
    "데이터 태그 동일 정렬 반복 적용 표시 유지",
  );
}

module.exports = {
  runInlineTokenTextHeightCase,
  runRepeatedTokenAlignmentCase,
};
