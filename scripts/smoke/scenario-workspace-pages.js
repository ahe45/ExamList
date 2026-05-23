
const { evaluate, navigate, waitForCondition } = require("../smoke-browser-cdp");

async function runWorkspacePagesScenario(context) {
  const { baseUrl, client, schoolCode } = context;
    const workspaceSchoolCode =
      (await evaluate(client, "decodeURIComponent(location.pathname.match(/^\\/schools\\/([^/]+)/)?.[1] || '')")) ||
      schoolCode;
    const encodedWorkspaceSchoolCode = encodeURIComponent(workspaceSchoolCode);
    const workspacePages = [
      { pathname: `/schools/${encodedWorkspaceSchoolCode}/candidates`, navLabel: "수험생 데이터", text: "수험생 데이터" },
      { pathname: `/schools/${encodedWorkspaceSchoolCode}/pdf-generations`, navLabel: "PDF 생성", text: "PDF 생성" },
      { pathname: `/schools/${encodedWorkspaceSchoolCode}/pdf-history`, navLabel: "PDF 작업 로그", text: "PDF 작업 로그" },
      { pathname: `/schools/${encodedWorkspaceSchoolCode}/data-deletion`, navLabel: "데이터 삭제", text: "데이터 삭제" },
    ];

    for (const page of workspacePages) {
      await navigate(client, `${baseUrl}${page.pathname}`);
      await waitForCondition(client, `document.body.innerText.includes(${JSON.stringify(page.text)})`, `${page.text} 화면 렌더링`);
      await waitForCondition(client, "document.querySelector('#logoutButton')", `${page.text} 화면 topbar 유지`);
      await waitForCondition(client, "document.querySelector('#topbarTemplateListButton')", `${page.text} 화면 목록 버튼 유지`);
      await waitForCondition(
        client,
        `document.querySelector('.workspace-nav-item.active')?.textContent.trim() === ${JSON.stringify(page.navLabel)}`,
        `${page.text} 사이드바 내비게이션 활성 표시`,
      );
      await waitForCondition(
        client,
        `
          (() => {
            const pageShell = document.querySelector('.app-shell.workspace-mode .page-shell');
            const appShell = document.querySelector('.app-shell.workspace-mode');
            const sidebar = document.querySelector('#workspaceSidebar');
            const pageShellRect = pageShell?.getBoundingClientRect();
            const appShellRect = appShell?.getBoundingClientRect();
            const sidebarRect = sidebar?.getBoundingClientRect();
            const appShellStyle = appShell ? getComputedStyle(appShell) : null;
            const appShellPaddingRight = Number.parseFloat(appShellStyle?.paddingRight || '0') || 0;
            const appShellColumnGap = Number.parseFloat(appShellStyle?.columnGap || appShellStyle?.gap || '0') || 0;
            const expectedPageShellWidth = appShellRect && sidebarRect
              ? appShellRect.right - appShellPaddingRight - sidebarRect.right - appShellColumnGap
              : 0;

            return Boolean(
              pageShell &&
                pageShellRect &&
                sidebarRect &&
                getComputedStyle(pageShell).maxWidth === 'none' &&
                pageShellRect.left > sidebarRect.right &&
                expectedPageShellWidth > 0 &&
                pageShellRect.width >= expectedPageShellWidth - 4
            );
          })()
        `,
        `${page.text} 본문 영역 전체 폭 사용`,
      );

      if (page.text === "수험생 데이터") {
        await waitForCondition(
          client,
          `
            (() => {
              const filterCard = document.querySelector('.candidate-filter-card');
              const tableCard = document.querySelector('.candidate-data-table');
              const headerActions = [...document.querySelectorAll('.table-header-actions button')].map((button) => button.textContent.trim()).join('|');
              const headers = [
                document.querySelector('.candidate-grid-table thead .row-number-col')?.textContent.trim(),
                ...[...document.querySelectorAll('.candidate-grid-table thead .table-header-label')].map((cell) => cell.textContent.trim()),
              ].filter(Boolean).join('|');
              const pageShell = document.querySelector('.app-shell.workspace-mode .page-shell');
              const appShell = document.querySelector('.app-shell.workspace-mode');
              const sidebar = document.querySelector('#workspaceSidebar');
              const pageShellRect = pageShell?.getBoundingClientRect();
              const appShellRect = appShell?.getBoundingClientRect();
              const sidebarRect = sidebar?.getBoundingClientRect();
              const appShellStyle = appShell ? getComputedStyle(appShell) : null;
              const appShellPaddingRight = Number.parseFloat(appShellStyle?.paddingRight || '0') || 0;
              const appShellColumnGap = Number.parseFloat(appShellStyle?.columnGap || appShellStyle?.gap || '0') || 0;
              const expectedPageShellWidth = appShellRect && sidebarRect
                ? appShellRect.right - appShellPaddingRight - sidebarRect.right - appShellColumnGap
                : 0;
              const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
              const pageShellFullWidth = Boolean(
                document.documentElement.dataset.currentView === 'candidateLookup' &&
                  pageShell &&
                  getComputedStyle(pageShell).maxWidth === 'none' &&
                  sidebarRect &&
                  pageShellRect &&
                  expectedPageShellWidth > 0 &&
                  pageShellRect.left > sidebarRect.right &&
                  pageShellRect.width >= expectedPageShellWidth - 4
              );
              const clippedHeaderLabels = [...document.querySelectorAll('.candidate-grid-table thead .table-header-label')]
                .filter((label) => label.scrollWidth > label.clientWidth + 1)
                .map((label) => ({
                  clientWidth: Math.round(label.clientWidth),
                  label: label.textContent.trim(),
                  scrollWidth: Math.round(label.scrollWidth),
                }));
              const headerLabelsFit = clippedHeaderLabels.length === 0;
              const misalignedHeaderControls = [...document.querySelectorAll('.candidate-grid-table thead .table-header-shell.has-filter')]
                .filter((shell) => {
                  const label = shell.querySelector('.table-header-label');
                  const sortIcon = shell.querySelector('.table-sort-icon');
                  const filterButton = shell.querySelector('.table-filter-button');
                  const labelRect = label?.getBoundingClientRect();
                  const sortIconRect = sortIcon?.getBoundingClientRect();
                  const filterRect = filterButton?.getBoundingClientRect();
                  const filterStyle = filterButton ? getComputedStyle(filterButton) : null;

                  if (!labelRect || !sortIconRect || !filterRect || !filterStyle) {
                    return true;
                  }

                  const labelCenterY = labelRect.top + labelRect.height / 2;
                  const sortIconCenterY = sortIconRect.top + sortIconRect.height / 2;
                  const filterCenterY = filterRect.top + filterRect.height / 2;

                  return (
                    filterStyle.position !== 'static' ||
                    Math.abs(labelCenterY - filterCenterY) > 3 ||
                    Math.abs(sortIconCenterY - filterCenterY) > 3
                  );
                })
                .map((shell) => shell.querySelector('.table-header-label')?.textContent.trim() || '');
              const headerControlsAligned = misalignedHeaderControls.length === 0;
              const candidateTable = document.querySelector('.candidate-grid-table');
              const tableWrap = document.querySelector('.candidate-table-wrap');
              const tableUsesFullWrap = Boolean(
                candidateTable &&
                  tableWrap &&
                  candidateTable.getBoundingClientRect().width >= tableWrap.getBoundingClientRect().width - 2
              );
              window.__examlistSmokeCandidateGridChecks = {
                clippedHeaderLabels,
                currentView: document.documentElement.dataset.currentView || '',
                headerControlsAligned,
                headerLabelsFit,
                misalignedHeaderControls,
                pageShellFullWidth,
                pageShellMaxWidth: pageShell ? getComputedStyle(pageShell).maxWidth : '',
                pageShellWidth: Math.round(pageShellRect?.width || 0),
                expectedPageShellWidth: Math.round(expectedPageShellWidth || 0),
                tableUsesFullWrap,
                tableWidth: Math.round(candidateTable?.getBoundingClientRect().width || 0),
                viewportWidth,
                wrapWidth: Math.round(tableWrap?.getBoundingClientRect().width || 0),
              };

              return Boolean(
                !filterCard &&
                  tableCard &&
                  pageShellFullWidth &&
                  headerLabelsFit &&
                  headerControlsAligned &&
                  tableUsesFullWrap &&
                  headerActions.includes('다운로드') &&
                  headerActions.includes('데이터 업로드') &&
                  document.querySelector('.table-header-enhanced .table-sort-button') &&
                  document.querySelector('.table-header-enhanced .table-filter-button') &&
                  document.querySelector('.table-pagination .page-size-trigger') &&
                  headers.startsWith('순번|지정정렬|모집시기')
              );
            })()
          `,
          "수험생확인대장 수험생 데이터 그리드 구성",
        );
        await waitForCondition(
          client,
          `
            (() => {
              const headers = [
                document.querySelector('.candidate-grid-table thead .row-number-col')?.textContent.trim(),
                ...[...document.querySelectorAll('.candidate-grid-table thead .table-header-label')].map((cell) => cell.textContent.trim()),
              ].filter(Boolean).join('|');

              return headers === '순번|지정정렬|모집시기|캠퍼스명|캠퍼스코드|전형명|전형코드|계열명|계열코드|모집단위명|모집단위코드|전공명|전공코드|시험날짜|시작시간|종료시간|교시명|교시코드|고사건물명|고사건물코드|고사실명|고사실코드|수험번호|가번호|이름|생년월일|조|OPT1|OPT2|OPT3|OPT4|OPT5';
            })()
          `,
          "수험생확인대장 수험생 데이터 컬럼 순서",
        );
        await evaluate(client, "document.querySelector('.candidate-grid-table .table-filter-button').click()");
        await waitForCondition(client, "document.querySelector('.candidate-filter-menu')", "수험생 데이터 컬럼 필터 메뉴 표시");
        await evaluate(client, "document.querySelector('[data-action=\"close-candidate-filter-menu\"]').click()");
        await waitForCondition(client, "!document.querySelector('.table-filter-menu')", "수험생 데이터 컬럼 필터 메뉴 닫힘");
        await evaluate(client, "document.querySelector('[data-action=\"open-candidate-upload-modal\"]').click()");
        await waitForCondition(
          client,
          `
            (() => {
              const modal = document.querySelector('[data-candidate-modal="upload"]');
              const modeTabs = [...document.querySelectorAll('.candidate-upload-mode-tab')].map((button) => button.textContent.trim()).join('|');

              return Boolean(
                modal &&
                  modeTabs === '수험생 데이터|수험생 사진' &&
                  document.body.innerText.includes('업로드 양식 다운로드') &&
                  document.body.innerText.includes('수험생 데이터 미리보기')
              );
            })()
          `,
          "수험생 데이터 업로드 모달 구성",
        );
        await evaluate(client, "document.querySelector('[data-action=\"set-candidate-upload-mode\"][data-upload-mode=\"photo-archive\"]').click()");
        await waitForCondition(
          client,
          "document.body.innerText.includes('수험생 사진 미리보기')",
          "수험생 사진 업로드 모드 구성",
        );
        await evaluate(client, "document.querySelector('[data-action=\"close-candidate-upload-modal\"]').click()");
        await waitForCondition(client, "!document.querySelector('[data-candidate-modal=\"upload\"]')", "수험생 업로드 모달 닫힘");
      }

    }
}

module.exports = { runWorkspacePagesScenario };
