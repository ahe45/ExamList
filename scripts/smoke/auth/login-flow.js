const { evaluate, navigate, waitForCondition } = require("../../smoke-browser-cdp");

async function runLoginRedirectChecks(context) {
  const { baseUrl, client } = context;

  await navigate(client, `${baseUrl}/`);
  await waitForCondition(client, "location.pathname === '/login'", "기본 진입 로그인 페이지 이동");
  await waitForCondition(client, "document.querySelector('[data-login-form]')", "기본 로그인 폼 표시");
  await waitForCondition(client, "window.__examlistLoginReady === true", "기본 로그인 스크립트 준비");

  await navigate(client, `${baseUrl}/schools/0000/templates`);
  await waitForCondition(client, "location.pathname === '/login'", "미인증 학교 작업공간 로그인 페이지 이동");
  await waitForCondition(client, "document.querySelector('[data-login-form]')", "로그인 폼 표시");
  await waitForCondition(client, "window.__examlistLoginReady === true", "로그인 스크립트 준비");
  await waitForCondition(
    client,
    `
      (() => {
        const loginCard = document.querySelector(".login-card");
        return Boolean(loginCard && getComputedStyle(loginCard).display !== "none");
      })()
    `,
    "로그인 카드 레이아웃 표시",
  );
}

async function submitSmokeLogin(context) {
  const { client, loginId, loginPassword } = context;

  await evaluate(
    client,
    `
      (() => {
        document.querySelector('[name="username"]').value = ${JSON.stringify(loginId)};
        document.querySelector('[name="password"]').value = ${JSON.stringify(loginPassword)};
        document.querySelector('[data-login-form]').requestSubmit();
        return true;
      })()
    `,
  );
  await waitForCondition(client, "location.pathname === '/schools'", "로그인 후 학교 선택 화면 이동", 15000);
  await waitForCondition(
    client,
    `document.body.innerText.includes('학교 선택') && document.querySelector('[data-action="open-school-workspace"][data-school-code]')`,
    "학교 선택 목록 렌더링",
  );
}

async function assertSchoolSelectionShell(context) {
  const { client } = context;

  await waitForCondition(
    client,
    `
      (() => {
        const sidebar = document.querySelector("#workspaceSidebar");
        const nav = document.querySelector("#workspaceNav");
        const items = [...document.querySelectorAll('.workspace-nav-item')];
        const labels = items.map((item) => item.textContent.trim()).join('|');

        return Boolean(
          !document.querySelector(".sidebar") &&
            !document.querySelector("#topbarNav") &&
            sidebar &&
            nav &&
            document.documentElement.dataset.shellMode === "template-list" &&
            !document.querySelector('#topbarTemplateListButton') &&
            !document.querySelector('#currentSchoolMeta') &&
            getComputedStyle(sidebar).display === "none" &&
            sidebar.getAttribute('aria-hidden') === 'true' &&
            labels === "양식 관리|수험생 데이터|PDF 생성|PDF 작업 로그|데이터 삭제"
        );
      })()
    `,
    "학교 선택 사이드바 내비게이션 숨김",
  );
}

async function runLogoutScenario(context) {
  const { client } = context;

  await evaluate(client, "document.querySelector('#logoutButton').click()");
  await waitForCondition(
    client,
    "location.pathname === '/login' && location.search === ''",
    "로그아웃 후 redirect 없는 로그인 페이지 이동",
  );
}

module.exports = {
  assertSchoolSelectionShell,
  runLoginRedirectChecks,
  runLogoutScenario,
  submitSmokeLogin,
};
