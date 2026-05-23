const { evaluate, waitForCondition } = require("../../smoke-browser-cdp");

async function openFirstSchoolWorkspace(context) {
  const { client } = context;
  const schoolCode = await evaluate(
    client,
    `
      (() => {
        const button = document.querySelector('[data-action="open-school-workspace"][data-school-code]');

        if (!button) {
          return "";
        }

        const code = button.dataset.schoolCode || "";
        button.click();
        return code;
      })()
    `,
  );

  if (!schoolCode) {
    throw new Error("학교 선택 테스트에 사용할 학교 코드가 없습니다.");
  }

  context.schoolCode = schoolCode;
  return schoolCode;
}

async function assertTemplateListPage(context, schoolCode) {
  const { client } = context;
  const encodedSchoolCode = encodeURIComponent(schoolCode);

  await waitForCondition(
    client,
    `location.pathname === ${JSON.stringify(`/schools/${encodedSchoolCode}/templates`)}`,
    "학교 선택 후 양식 목록 이동",
    15000,
  );
  await waitForCondition(client, "document.body.innerText.includes('수험생확인대장 양식')", "양식 목록 렌더링");
  await waitForCondition(
    client,
    "!document.querySelector('[data-template-filter-form]') && !document.body.innerText.includes('양식명 또는 설명')",
    "양식 관리 검색 필터 제거",
  );
  await waitForCondition(
    client,
    `
      (() => ![...document.querySelectorAll('.template-card .status-badge')]
        .some((badge) => /활성|비활성/.test(badge.textContent.trim())))()
    `,
    "양식 카드 활성 상태 배지 제거",
  );
  await waitForCondition(
    client,
    "document.querySelector('[data-action=\"create-template\"] .button-icon')",
    "관리자 새 양식 버튼 플러스 아이콘 표시",
  );
}

async function assertTemplateCardActions(context) {
  const { client } = context;

  await waitForCondition(
    client,
    `
      (() => {
        const card = document.querySelector('.template-card');
        const headerTools = card?.querySelector('.template-card-header-tools');
        const actions = card?.querySelector('.template-card-actions');
        const editButton = actions?.querySelector('[data-action="edit-template"]');
        const duplicateButton = actions?.querySelector('[data-action="duplicate-template"]');
        const deleteButton = actions?.querySelector('[data-action="delete-template"]');
        const actionTools = actions?.querySelector('.template-card-action-tools');
        const editRect = editButton?.getBoundingClientRect();
        const duplicateRect = duplicateButton?.getBoundingClientRect();
        const deleteRect = deleteButton?.getBoundingClientRect();

        return Boolean(
          card &&
            actions &&
            !headerTools &&
            editButton?.textContent.trim() === '수정' &&
            duplicateButton &&
            deleteButton &&
            actionTools?.contains(duplicateButton) &&
            actionTools?.contains(deleteButton) &&
            editRect &&
            duplicateRect &&
            deleteRect &&
            editRect.right <= duplicateRect.left + 1 &&
            duplicateRect.right <= deleteRect.left + 1
        );
      })()
    `,
    "양식 카드 하단 수정 복사 삭제 액션 배치",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const card = document.querySelector('.template-card');
        const updatedAt = card?.querySelector('.template-card-updated-at');

        return Boolean(
          card &&
            updatedAt &&
            /^최종수정일시 : \\d{4}년 \\d{2}월 \\d{2}일 \\d{2}시 \\d{2}분 \\d{2}초$/.test(updatedAt.textContent.trim()) &&
            !card.querySelector('.template-card-meta') &&
            !card.querySelector('.template-card-date')
        );
      })()
    `,
    "양식 카드 최종수정일시 표시 및 배지 제거",
  );
}

async function assertWorkspaceSidebar(context) {
  const { client } = context;

  await waitForCondition(
    client,
    `
      (() => {
        const sidebar = document.querySelector("#workspaceSidebar");
        const activeItem = document.querySelector('.workspace-nav-item.active');
        const items = [...document.querySelectorAll('.workspace-nav-item')];
        const labels = items.map((item) => item.textContent.trim()).join('|');
        const sidebarRect = sidebar?.getBoundingClientRect();
        const pageShellRect = document.querySelector('.app-shell.workspace-mode .page-shell')?.getBoundingClientRect();

        return Boolean(
          !document.querySelector(".sidebar") &&
            !document.querySelector("#topbarNav") &&
            sidebar &&
            document.documentElement.dataset.shellMode === "workspace" &&
            document.querySelector('#topbarTemplateListButton') &&
            getComputedStyle(sidebar).display !== "none" &&
            sidebar.getAttribute('aria-hidden') === 'false' &&
            sidebarRect &&
            pageShellRect &&
            sidebarRect.right < pageShellRect.left &&
            labels === "양식 관리|수험생 데이터|PDF 생성|PDF 작업 로그|데이터 삭제" &&
            activeItem?.dataset.goView === "templateManagement"
        );
      })()
    `,
    "학교 작업공간 좌측 사이드바 내비게이션 표시",
  );
}

module.exports = {
  assertTemplateCardActions,
  assertTemplateListPage,
  assertWorkspaceSidebar,
  openFirstSchoolWorkspace,
};
