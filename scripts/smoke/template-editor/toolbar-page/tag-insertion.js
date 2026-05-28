const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { dispatchBrowserMouseClick } = require("../../../smoke/browser-input");

async function dispatchBrowserCtrlShortcut(client, key, code, keyCode) {
  const params = {
    code,
    key,
    modifiers: 2,
    nativeVirtualKeyCode: keyCode,
    windowsVirtualKeyCode: keyCode,
  };

  await client.send("Input.dispatchKeyEvent", { ...params, type: "rawKeyDown" });
  await client.send("Input.dispatchKeyEvent", { ...params, type: "keyUp" });
}

async function runEmptyCanvasTagInsertionCase(client) {
  await evaluate(
    client,
    `
      (() => {
        window.__examlistSmokeTagInsertionOriginalHtml = window.ExamListTemplateEditorRuntime?.getHtml?.() || "";
        window.ExamListTemplateEditorRuntime?.setHtml?.('<div class="template-doc"></div>', { resetHistory: false, notify: false });

        const tagButton = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
          .find((button) => button.dataset.templateTag === '#수험번호');

        if (tagButton) {
          const groupElement = tagButton.closest('.template-tag-accordion-group');

          if (groupElement) {
            groupElement.open = true;
          }
        }
        return true;
      })()
    `,
  );

  await dispatchBrowserMouseClick(
    client,
    '#templateTagStrip .template-tag-button[data-template-tag="#수험번호"]',
  );
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const documentElement = surface?.querySelector('.template-doc');
        const token = surface?.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
        const tokenIcon = token?.querySelector('svg');
        const tokenStyle = token ? getComputedStyle(token) : null;
        const documentRect = documentElement?.getBoundingClientRect();
        const surfaceRect = surface?.getBoundingClientRect();
        const tokenRect = token?.getBoundingClientRect();
        const tokenText = token?.textContent.trim() || '';
        const tokenUsesHiddenIcons = Boolean(token?.classList.contains('template-token-icons-hidden'));

        return Boolean(
          surface &&
            documentElement &&
            token &&
            tokenStyle &&
            documentRect &&
            surfaceRect &&
            tokenRect &&
            documentElement.contains(token) &&
            token.closest('p') &&
            tokenRect.top - documentRect.top < 80 &&
            surfaceRect.bottom - tokenRect.bottom > 100 &&
            token.dataset.templateTagValue === 'candidate.examNo' &&
            token.dataset.templateTagLabel === '수험번호' &&
            Boolean(token.dataset.templateTagExample) &&
            (tokenText === '수험번호' || tokenText === token.dataset.templateTagExample) &&
            (tokenUsesHiddenIcons ? !tokenIcon : Boolean(tokenIcon)) &&
            tokenStyle.display === 'inline-flex' &&
            tokenStyle.borderTopWidth === '1px' &&
            tokenStyle.borderTopLeftRadius === '8px' &&
            tokenStyle.textDecorationLine === 'none' &&
            tokenStyle.userSelect === 'all'
        );
      })()
    `,
    "빈 캔버스 데이터 태그 문서 내부 객체 삽입",
  );

  await dispatchBrowserMouseClick(
    client,
    '#templateTagStrip .template-tag-button[data-template-tag="#수험번호"]',
  );
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const documentElement = surface?.querySelector('.template-doc');
        const tokens = [...(documentElement?.querySelectorAll('.template-token[data-template-tag-value="candidate.examNo"]') || [])];
        const [firstToken, secondToken] = tokens;
        const firstRect = firstToken?.getBoundingClientRect();
        const secondRect = secondToken?.getBoundingClientRect();

        return Boolean(
          surface &&
            documentElement &&
            tokens.length === 2 &&
            firstToken.closest('p') &&
            firstToken.parentElement === secondToken.parentElement &&
            documentElement.contains(firstToken) &&
            documentElement.contains(secondToken) &&
            Math.abs(firstRect.top - secondRect.top) < 2 &&
            Math.abs(firstRect.left - secondRect.left) > 1 &&
            documentElement.querySelectorAll('.template-editor-image-selection, .template-editor-table-selection').length === 0
        );
      })()
    `,
    "빈 캔버스 데이터 태그 연속 삽입 첫 줄 유지",
  );

  const accordionTagSelectors = JSON.parse(await evaluate(
    client,
    `
      JSON.stringify((() => {
        const groups = [...document.querySelectorAll('#templateTagStrip .template-tag-accordion-group')]
          .filter((groupElement) => groupElement.querySelector('.template-tag-button'));

        groups.forEach((groupElement) => {
          groupElement.open = false;
        });
        window.ExamListTemplateEditorRuntime?.setHtml?.('<div class="template-doc"><p><br></p></div>', {
          resetHistory: false,
          notify: false
        });

        const surface = document.querySelector('#templateEditorSurface');
        const paragraph = surface?.querySelector('.template-doc p');

        if (surface && paragraph) {
          const selection = window.getSelection();
          const range = document.createRange();

          range.setStart(paragraph, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          surface.focus();
        }

        const firstGroup = groups[0] || null;
        const secondGroup = groups.find((groupElement) => groupElement !== firstGroup) || firstGroup;
        const firstButton = firstGroup?.querySelector('.template-tag-button') || null;
        const secondButton = secondGroup?.querySelector('.template-tag-button') || null;
        const firstIndex = groups.indexOf(firstGroup) + 1;
        const secondIndex = groups.indexOf(secondGroup) + 1;
        const buildButtonSelector = (buttonElement) =>
          '#templateTagStrip .template-tag-button[data-template-tag=' +
            JSON.stringify(buttonElement?.dataset.templateTag || '') +
          ']';

        return {
          firstButton: buildButtonSelector(firstButton),
          firstSummary: '#templateTagStrip .template-tag-accordion-group:nth-of-type(' +
            firstIndex +
          ') .template-tag-accordion-summary',
          secondButton: buildButtonSelector(secondButton),
          secondSummary: '#templateTagStrip .template-tag-accordion-group:nth-of-type(' +
            secondIndex +
          ') .template-tag-accordion-summary'
        };
      })())
    `,
  ));

  await dispatchBrowserMouseClick(client, accordionTagSelectors.firstSummary);
  await waitForCondition(
    client,
    `
      document.querySelector(${JSON.stringify(accordionTagSelectors.firstSummary)})
        ?.closest('.template-tag-accordion-group')
        ?.open === true
    `,
    "데이터 태그 아코디언 첫 그룹 펼침",
  );
  await dispatchBrowserMouseClick(client, accordionTagSelectors.firstButton);
  await waitForCondition(
    client,
    `document.querySelectorAll('#templateEditorSurface .template-doc .template-token[data-template-tag-value]').length === 1`,
    "아코디언 펼침 후 첫 데이터 태그 삽입",
  );
  await dispatchBrowserMouseClick(client, accordionTagSelectors.secondSummary);
  await waitForCondition(
    client,
    `
      (() => {
        const secondGroup = document.querySelector(${JSON.stringify(accordionTagSelectors.secondSummary)})
          ?.closest('.template-tag-accordion-group');
        const token = document.querySelector('#templateEditorSurface .template-doc .template-token[data-template-tag-value]');
        const paragraph = token?.closest('p');
        const selection = window.getSelection?.();
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;

        return Boolean(
          secondGroup?.open &&
            paragraph &&
            range &&
            (range.startContainer === paragraph || paragraph.contains(range.startContainer))
        );
      })()
    `,
    "데이터 태그 아코디언 토글 후 삽입 위치 보존",
  );
  await dispatchBrowserMouseClick(client, accordionTagSelectors.secondButton);
  await waitForCondition(
    client,
    `
      (() => {
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');
        const tokens = [...(documentElement?.querySelectorAll('.template-token[data-template-tag-value]') || [])];
        const [firstToken, secondToken] = tokens;
        const firstRect = firstToken?.getBoundingClientRect();
        const secondRect = secondToken?.getBoundingClientRect();

        return Boolean(
          documentElement &&
            tokens.length === 2 &&
            firstToken.closest('p') &&
            firstToken.parentElement === secondToken.parentElement &&
            Math.abs(firstRect.top - secondRect.top) < 2 &&
            Math.abs(firstRect.left - secondRect.left) > 1 &&
            documentElement.querySelectorAll('.template-editor-image-selection, .template-editor-table-selection').length === 0
        );
      })()
    `,
    "아코디언 토글 직후 데이터 태그 삽입 첫 줄 유지",
  );

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.('<div class="template-doc"><p><br></p></div>', {
          resetHistory: true,
          notify: false
        });

        const surface = document.querySelector('#templateEditorSurface');
        const paragraph = surface?.querySelector('.template-doc p');

        if (surface && paragraph) {
          const selection = window.getSelection();
          const range = document.createRange();

          range.setStart(paragraph, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          surface.focus();
        }
        return true;
      })()
    `,
  );
  await client.send("Input.insertText", { text: "A" });
  await waitForCondition(
    client,
    `
      (() => {
        const state = window.ExamListTemplateEditorRuntime?.state?.templateEditor;
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');

        return Boolean(
          documentElement?.textContent.trim() === 'A' &&
            state?.historyEntries?.length >= 2 &&
            state.historyIndex === state.historyEntries.length - 1
        );
      })()
    `,
    "실행취소 회귀 기준 입력 기록",
  );
  await evaluate(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const paragraph = surface?.querySelector('.template-doc p');

        if (!surface || !paragraph) {
          return false;
        }

        paragraph.textContent = 'AB';

        const textNode = paragraph.firstChild;
        const selection = window.getSelection();
        const range = document.createRange();

        range.setStart(textNode, textNode.textContent.length);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        surface.focus();
        return true;
      })()
    `,
  );
  await dispatchBrowserCtrlShortcut(client, "z", "KeyZ", 90);
  await waitForCondition(
    client,
    `
      (() => {
        const state = window.ExamListTemplateEditorRuntime?.state?.templateEditor;
        const documentElement = document.querySelector('#templateEditorSurface .template-doc');

        return Boolean(
          documentElement?.textContent.trim() === 'A' &&
            state?.historyEntries?.some((entry) => {
              const container = document.createElement('div');
              container.innerHTML = entry.html || '';
              return container.textContent.trim() === 'AB';
            })
        );
      })()
    `,
    "실행취소 직전 미기록 상태 히스토리 보존",
  );
  await dispatchBrowserCtrlShortcut(client, "y", "KeyY", 89);
  await waitForCondition(
    client,
    `
      document.querySelector('#templateEditorSurface .template-doc')?.textContent.trim() === 'AB'
    `,
    "다시 실행으로 미기록 상태 복구",
  );
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(window.__examlistSmokeTagInsertionOriginalHtml || "", {
          resetHistory: false,
          notify: false
        });
        return true;
      })()
    `,
  );
}

module.exports = {
  runEmptyCanvasTagInsertionCase,
};
