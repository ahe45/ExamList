const { waitForCondition } = require("../../smoke-browser-cdp");

async function assertEditorWorkspaceShell(client) {
  await waitForCondition(
    client,
    `
      (() => {
        const sidebar = document.querySelector("#workspaceSidebar");
        const activeItem = document.querySelector('.workspace-nav-item.active');
        const items = [...document.querySelectorAll('.workspace-nav-item')].map((item) => item.textContent.trim()).join('|');
        const activeStyle = activeItem ? getComputedStyle(activeItem) : null;
        const sidebarRect = sidebar?.getBoundingClientRect();
        const pageShellRect = document.querySelector('.app-shell.workspace-mode .page-shell')?.getBoundingClientRect();

        return Boolean(
            !document.querySelector(".sidebar") &&
            !document.querySelector("#topbarNav") &&
            sidebar &&
            getComputedStyle(sidebar).display !== "none" &&
            sidebar.getAttribute('aria-hidden') === 'false' &&
            sidebarRect &&
            pageShellRect &&
            sidebarRect.right < pageShellRect.left &&
            items === "양식 관리|수험생 데이터|PDF 생성|PDF 작업 로그|데이터 삭제" &&
            activeItem?.dataset.goView === "templateManagement" &&
            activeStyle?.backgroundImage !== "none" &&
            activeStyle?.boxShadow.includes("inset")
        );
      })()
    `,
    "작업공간 좌측 사이드바 내비게이션 표시",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const logoutButton = document.querySelector('#logoutButton');
        const listButton = document.querySelector('#topbarTemplateListButton');
        const accountCard = document.querySelector('#currentUserMeta');
        const accountStyle = accountCard ? getComputedStyle(accountCard) : null;

        return Boolean(
          logoutButton &&
            listButton &&
            logoutButton.compareDocumentPosition(listButton) & Node.DOCUMENT_POSITION_FOLLOWING &&
            accountCard &&
            accountStyle?.borderRadius === '999px'
        );
      })()
    `,
    "작업공간 목록 버튼 및 계정 카드 표시",
  );
  await waitForCondition(
    client,
    "document.querySelector('[data-view-panel=\"templateEditor\"]:not(.hidden)')",
    "작업공간 양식 관리 패널 표시",
  );
}

module.exports = {
  assertEditorWorkspaceShell,
};
