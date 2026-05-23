const {
  dispatchBrowserMouseClick,
  waitForCondition,
} = require("../../smoke-browser-cdp");

async function assertImageInsertPopover(client) {
  await dispatchBrowserMouseClick(client, "#templateEditorToolbarHost [data-template-image-insert-toggle]");
  await waitForCondition(
    client,
    `
      (() => {
        const panel = document.querySelector('#templateEditorToolbarHost .examlist-image-insert-panel');
        const labels = [...(panel?.querySelectorAll('button') || [])].map((button) => button.textContent.trim()).join('|');

        return Boolean(
          panel &&
            !panel.classList.contains('hidden') &&
            labels === '파일 선택|학교 로고'
        );
      })()
    `,
    "이미지 삽입 방식 팝오버 표시",
  );
  await dispatchBrowserMouseClick(client, "#templateEditorSurface");
  await waitForCondition(
    client,
    `document.querySelector('#templateEditorToolbarHost .examlist-image-insert-panel')?.classList.contains('hidden')`,
    "이미지 삽입 방식 팝오버 닫힘",
  );
}

module.exports = {
  assertImageInsertPopover,
};
