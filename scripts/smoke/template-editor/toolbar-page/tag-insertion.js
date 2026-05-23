const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");

async function runEmptyCanvasTagInsertionCase(client) {
  await evaluate(
    client,
    `
      (() => {
        window.__examlistSmokeTagInsertionOriginalHtml = window.ExamListTemplateEditorRuntime?.getHtml?.() || "";
        window.ExamListTemplateEditorRuntime?.setHtml?.('<div class="template-doc"></div>', { resetHistory: false, notify: false });

        const tagButton = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
          .find((button) => button.dataset.templateTag === '#수험번호');

        tagButton?.click();
        return true;
      })()
    `,
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
            token.textContent.trim() === '수험번호' &&
            tokenIcon &&
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
