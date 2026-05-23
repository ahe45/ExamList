
const { evaluate, waitForCondition } = require("../smoke-browser-cdp");

async function runTemplateListScenario(context) {
  const { client } = context;
    await waitForCondition(
      client,
      `
        (() => {
          const firstCard = document.querySelector('.template-card');
          return Boolean(
            firstCard &&
              firstCard.querySelector('[data-action="edit-template-card-meta"][data-template-field="name"]') &&
              firstCard.querySelector('[data-action="edit-template-card-meta"][data-template-field="description"]')
          );
        })()
      `,
      "양식 카드 이름/설명 수정 버튼 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          document.querySelector('.template-card [data-action="edit-template-card-meta"][data-template-field="name"]')?.click();
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const input = document.querySelector('.template-card [data-template-card-input][data-template-field="name"]');
          return Boolean(
            input &&
              input instanceof HTMLInputElement &&
              document.querySelector('.template-card [data-action="save-template-card-meta"][data-template-field="name"]') &&
              document.querySelector('.template-card [data-action="cancel-template-card-meta"][data-template-field="name"]')
          );
        })()
      `,
      "양식 카드 이름 인라인 편집 UI 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          const input = document.querySelector('.template-card [data-template-card-input][data-template-field="name"]');
          if (input) {
            input.value = '브라우저 스모크 양식명';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          document.querySelector('.template-card [data-action="cancel-template-card-meta"][data-template-field="name"]')?.click();
        })()
      `,
    );
    await waitForCondition(
      client,
      "!document.querySelector('.template-card [data-template-card-input]')",
      "양식 카드 이름 인라인 편집 취소",
    );
    await evaluate(
      client,
      `
        (() => {
          document.querySelector('.template-card [data-action="edit-template-card-meta"][data-template-field="description"]')?.click();
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const input = document.querySelector('.template-card [data-template-card-input][data-template-field="description"]');
          return Boolean(input && input instanceof HTMLInputElement);
        })()
      `,
      "양식 카드 설명 인라인 편집 UI 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          document.querySelector('.template-card [data-action="cancel-template-card-meta"][data-template-field="description"]')?.click();
        })()
      `,
    );
    await waitForCondition(
      client,
      "!document.querySelector('.template-card [data-template-card-input]')",
      "양식 카드 설명 인라인 편집 취소",
    );

    await evaluate(client, "document.querySelector('[data-action=\"edit-template\"]').click()");
    await waitForCondition(client, "location.pathname.includes('/edit')", "양식 관리 화면 이동");
    await waitForCondition(client, "document.querySelector('.template-editor-grid #templateEditorSurface')", "양식 편집기 화면 렌더링");
}

module.exports = { runTemplateListScenario };
