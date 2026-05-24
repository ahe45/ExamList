const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");
const { setRuntimeHtml } = require("./runtime");

async function setSampleDisplayOption(client, checked) {
  await evaluate(
    client,
    `
      (() => {
        const input = document.querySelector('[data-template-tag-view-option="showSampleData"]');

        if (!input) {
          return false;
        }

        if (input.checked !== ${JSON.stringify(Boolean(checked))}) {
          input.click();
        }

        return input.checked;
      })()
    `,
  );
}

async function readSampleDisplayOption(client) {
  return evaluate(
    client,
    `
      (() => {
        const input = document.querySelector('[data-template-tag-view-option="showSampleData"]');

        return Boolean(input?.checked);
      })()
    `,
  );
}

async function runDataTagSampleDisplaySyncCase(client) {
  const initialSampleDisplay = await readSampleDisplayOption(client);

  try {
    await waitForCondition(client, "Boolean(window.ExamListTemplateEditorRuntime?.setHtml)", "편집 런타임 준비");
    await setRuntimeHtml(
      client,
      '<div class="template-doc"><p><span class="template-token" contenteditable="false" data-template-tag-value="candidate.examNo">수험번호</span> 확인</p></div>',
    );
    await setSampleDisplayOption(client, true);
    await waitForCondition(
      client,
      `
        (() => {
          const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
          const example = token?.dataset.templateTagExample || '';

          return Boolean(token && example && token.textContent.trim() === example);
        })()
      `,
      "데이터 태그 샘플값 표시",
    );
    await waitForCondition(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.sync?.({ allowOverflow: true });
          const token = document.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');
          const example = token?.dataset.templateTagExample || '';
          const html = window.ExamListTemplateEditorRuntime?.getHtml?.() || '';
          const container = document.createElement('div');
          container.innerHTML = html;
          const serializedToken = container.querySelector('.template-token[data-template-tag-value="candidate.examNo"]');

          return Boolean(
              token &&
              serializedToken &&
              example &&
              token.textContent.trim() === example &&
              token.classList.contains('template-token-sample-display') &&
              serializedToken.textContent.trim() === '수험번호'
          );
        })()
      `,
      "동기화 후 데이터 태그 샘플값 표시 유지 및 저장값 라벨 유지",
    );
  } finally {
    await setSampleDisplayOption(client, initialSampleDisplay);
  }
}

module.exports = {
  runDataTagSampleDisplaySyncCase,
};
