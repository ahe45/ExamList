const { waitForCondition } = require("../../smoke-browser-cdp");

async function assertTopbarAccount(context) {
  const { client, loginId, loginRoleLabel } = context;

  await waitForCondition(
    client,
    `
      (() => {
        const meta = document.querySelector('#currentUserMeta');
        const userId = document.querySelector('#currentUserId');
        const role = document.querySelector('#currentUserRole');

        return Boolean(
          meta &&
            userId &&
            role &&
            userId.textContent.trim() === ${JSON.stringify(loginId)} &&
            role.textContent.trim() === ${JSON.stringify(loginRoleLabel)} &&
            getComputedStyle(role).color !== getComputedStyle(document.querySelector('#currentUserId')).color
        );
      })()
    `,
    "topbar 계정 정보 및 권한명 표시",
  );
}

async function assertTopbarSchoolMeta(context, schoolCode) {
  const { client } = context;
  const expectedCampusName = context.schoolCampusName || "";

  await waitForCondition(
    client,
    `
      (() => {
        const meta = document.querySelector('#currentSchoolMeta');
        const account = document.querySelector('#currentUserMeta');
        const logoutButton = document.querySelector('#logoutButton');
        const listButton = document.querySelector('#topbarTemplateListButton');
        const schoolName = document.querySelector('#currentSchoolName');
        const schoolCampusName = document.querySelector('#currentSchoolCampusName');
        const schoolAccountSeparator = document.querySelector('[data-topbar-separator="school-account"]');
        const logoutListSeparator = document.querySelector('[data-topbar-separator="logout-school-list"]');
        const schoolSeparatorStyle = schoolAccountSeparator ? getComputedStyle(schoolAccountSeparator) : null;
        const logoutSeparatorStyle = logoutListSeparator ? getComputedStyle(logoutListSeparator) : null;
        const accountRect = account?.getBoundingClientRect();
        const listRect = listButton?.getBoundingClientRect();
        const logoutRect = logoutButton?.getBoundingClientRect();
        const metaRect = meta?.getBoundingClientRect();
        const schoolSeparatorRect = schoolAccountSeparator?.getBoundingClientRect();
        const logoutSeparatorRect = logoutListSeparator?.getBoundingClientRect();
        const centerY = (rect) => rect ? rect.top + rect.height / 2 : 0;
        const text = meta?.textContent || '';

        return Boolean(
          meta &&
            account &&
            logoutButton &&
            listButton &&
            schoolName &&
            schoolCampusName &&
            !text.includes('현재 학교') &&
            !document.querySelector('#currentSchoolCode') &&
            schoolCampusName.textContent.trim() === ${JSON.stringify(expectedCampusName)} &&
            text.includes(${JSON.stringify(expectedCampusName)}) &&
            !text.includes(${JSON.stringify(schoolCode)}) &&
            schoolAccountSeparator &&
            logoutListSeparator &&
            schoolSeparatorStyle?.display !== 'none' &&
            logoutSeparatorStyle?.display !== 'none' &&
            schoolSeparatorStyle?.alignSelf === 'center' &&
            logoutSeparatorStyle?.alignSelf === 'center' &&
            schoolSeparatorRect?.height === 24 &&
            logoutSeparatorRect?.height === 24 &&
            Math.abs(centerY(metaRect) - centerY(schoolSeparatorRect)) <= 2 &&
            Math.abs(centerY(accountRect) - centerY(schoolSeparatorRect)) <= 2 &&
            Math.abs(centerY(logoutRect) - centerY(logoutSeparatorRect)) <= 2 &&
            Math.abs(centerY(listRect) - centerY(logoutSeparatorRect)) <= 2 &&
            meta.compareDocumentPosition(schoolAccountSeparator) & Node.DOCUMENT_POSITION_FOLLOWING &&
            schoolAccountSeparator.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING &&
            logoutButton.compareDocumentPosition(logoutListSeparator) & Node.DOCUMENT_POSITION_FOLLOWING &&
            logoutListSeparator.compareDocumentPosition(listButton) & Node.DOCUMENT_POSITION_FOLLOWING
        );
      })()
    `,
    "topbar 현재 학교 및 구분선 표시",
  );
}

async function assertTopbarLayout(context) {
  const { client } = context;

  await waitForCondition(
    client,
    `
      (() => {
        const button = document.querySelector('#logoutButton');
        const style = button ? getComputedStyle(button) : null;

        return Boolean(
          button &&
            style &&
            (style.display === "inline-flex" || style.display === "flex") &&
            parseFloat(style.width) === 40 &&
            parseFloat(style.height) === 40 &&
            parseFloat(style.borderRadius) >= 8 &&
            style.borderTopStyle !== "none"
        );
      })()
    `,
    "상단 로그아웃 아이콘 버튼 스타일",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const topbar = document.querySelector("#topbar");
        const rect = topbar?.getBoundingClientRect();
        const style = topbar ? getComputedStyle(topbar) : null;
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

        return Boolean(
          topbar &&
            rect &&
            style?.position === "fixed" &&
            rect.top >= -1 &&
            rect.left >= -1 &&
            Math.abs(rect.width - viewportWidth) <= 20 &&
            rect.height >= 58 &&
            rect.height <= 82
        );
      })()
    `,
    "topbar 고정 전체 너비 레이아웃",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const brand = document.querySelector('#brandHome');
        const badge = brand?.querySelector('.brand-badge');
        const title = brand?.querySelector('h1');
        const brandStyle = brand ? getComputedStyle(brand) : null;
        const badgeRect = badge?.getBoundingClientRect();
        const titleStyle = title ? getComputedStyle(title) : null;

        return Boolean(
          brand &&
            badgeRect &&
            brandStyle &&
            titleStyle &&
            badgeRect.width >= 40 &&
            badgeRect.height >= 40 &&
            parseFloat(brandStyle.columnGap || brandStyle.gap) >= 14 &&
            parseFloat(brandStyle.paddingLeft) === 0 &&
            parseFloat(titleStyle.fontSize) >= 17
        );
      })()
    `,
    "수험생확인대장 기준 brand 크기",
  );
  await waitForCondition(client, "document.querySelector('[data-action=\"edit-template\"]')", "양식 카드 액션 표시");
}

module.exports = {
  assertTopbarAccount,
  assertTopbarLayout,
  assertTopbarSchoolMeta,
};
