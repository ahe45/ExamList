const fs = require("fs");
const path = require("path");

const { withBrowserSmokeSession } = require("./smoke/browser-session");
const { evaluate, navigate, waitForCondition } = require("./smoke-browser-cdp");
const { delay } = require("./smoke-utils");

const desktopViewport = Object.freeze({ height: 1000, name: "desktop", width: 1440 });
const mobileViewport = Object.freeze({ height: 844, name: "mobile", width: 390 });

function safeName(value = "") {
  return String(value || "screenshot")
    .trim()
    .replace(/[^a-z0-9가-힣_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: viewport.width < 700,
    width: viewport.width,
  });
}

async function captureScreenshot(client, screenshotDir, name) {
  await delay(250);
  const result = await client.send("Page.captureScreenshot", {
    captureBeyondViewport: false,
    format: "png",
    fromSurface: true,
  });
  const filePath = path.join(screenshotDir, `${safeName(name)}.png`);

  await fs.promises.writeFile(filePath, Buffer.from(result.data || "", "base64"));
  return filePath;
}

async function getLayoutDiagnostics(client) {
  const payload = await evaluate(
    client,
    `
      JSON.stringify((() => {
        const round = (value) => Math.round(Number(value || 0));
        const html = document.documentElement;
        const body = document.body;
        const scrollingElement = document.scrollingElement || html;
        const activePanel = document.querySelector('.view-panel:not(.hidden)');
        const tableWrap = document.querySelector('.account-management-panel .table-wrap');
        const accountTable = document.querySelector('.account-management-table');
        const accountHeaders = [...document.querySelectorAll('.account-management-table thead th')]
          .map((header) => header.textContent.replace(/\\s+/g, ' ').trim());
        const clippedAccountHeaders = [...document.querySelectorAll('.account-management-table thead th')]
          .filter((header) => header.scrollWidth > header.clientWidth + 1)
          .map((header) => header.textContent.replace(/\\s+/g, ' ').trim());
        const clippedButtons = [...document.querySelectorAll('button')]
          .filter((button) => {
            const style = getComputedStyle(button);
            const rect = button.getBoundingClientRect();

            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0 &&
              button.scrollWidth > button.clientWidth + 2
            );
          })
          .map((button) => button.textContent.replace(/\\s+/g, ' ').trim() || button.getAttribute('aria-label') || button.title || button.className)
          .slice(0, 10);

        return {
          accountHeaders,
          accountTableClientWidth: round(accountTable?.clientWidth || 0),
          accountTableScrollWidth: round(accountTable?.scrollWidth || 0),
          accountWrapClientWidth: round(tableWrap?.clientWidth || 0),
          accountWrapScrollWidth: round(tableWrap?.scrollWidth || 0),
          bodyClientWidth: round(body?.clientWidth || 0),
          bodyOverflowX: getComputedStyle(body).overflowX,
          bodyScrollWidth: round(body?.scrollWidth || 0),
          clippedAccountHeaders,
          clippedButtons,
          currentView: html.dataset.currentView || '',
          htmlClientWidth: round(html.clientWidth || 0),
          htmlOverflowX: getComputedStyle(html).overflowX,
          htmlScrollWidth: round(html.scrollWidth || 0),
          pathname: location.pathname,
          scrollingClientHeight: round(scrollingElement.clientHeight || 0),
          scrollingScrollHeight: round(scrollingElement.scrollHeight || 0),
          visiblePanelClientHeight: round(activePanel?.clientHeight || 0),
          visiblePanelScrollHeight: round(activePanel?.scrollHeight || 0),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      })())
    `,
  );

  return JSON.parse(payload);
}

function collectLayoutIssues(label, diagnostics) {
  const issues = [];
  const htmlOverflow = diagnostics.htmlScrollWidth - diagnostics.htmlClientWidth;
  const bodyOverflow = diagnostics.bodyScrollWidth - diagnostics.bodyClientWidth;
  const htmlCanScrollX = !["clip", "hidden"].includes(String(diagnostics.htmlOverflowX || ""));
  const bodyCanScrollX = !["clip", "hidden"].includes(String(diagnostics.bodyOverflowX || ""));

  if ((htmlCanScrollX && htmlOverflow > 2) || (bodyCanScrollX && bodyOverflow > 2)) {
    issues.push(`${label}: 창 전체 가로 스크롤 발생(html +${htmlOverflow}px, body +${bodyOverflow}px)`);
  }

  if (diagnostics.currentView === "accountManagement") {
    const accountOverflow = diagnostics.accountWrapScrollWidth - diagnostics.accountWrapClientWidth;

    if (accountOverflow > 2) {
      issues.push(`${label}: 계정관리 테이블 가로 스크롤 발생(+${accountOverflow}px)`);
    }

    if (diagnostics.scrollingScrollHeight - diagnostics.scrollingClientHeight > 2) {
      issues.push(`${label}: 계정관리 화면에서 창 전체 세로 스크롤 발생`);
    }

    if (diagnostics.accountHeaders.includes("상태")) {
      issues.push(`${label}: 계정관리 상태 컬럼이 남아 있음`);
    }

    if (diagnostics.clippedAccountHeaders.length) {
      issues.push(`${label}: 계정관리 헤더 잘림(${diagnostics.clippedAccountHeaders.join(", ")})`);
    }
  }

  if (diagnostics.clippedButtons.length) {
    issues.push(`${label}: 버튼 텍스트 잘림(${diagnostics.clippedButtons.join(", ")})`);
  }

  return issues;
}

async function addCheckpoint({ client, results, screenshotDir }, label) {
  const screenshot = await captureScreenshot(client, screenshotDir, label);
  const diagnostics = await getLayoutDiagnostics(client);
  const issues = collectLayoutIssues(label, diagnostics);

  results.push({
    diagnostics,
    issues,
    label,
    result: issues.length ? "FAIL" : "PASS",
    screenshot,
  });
}

async function click(client, selector, description) {
  const clicked = await evaluate(
    client,
    `
      (() => {
        const element = document.querySelector(${JSON.stringify(selector)});

        if (!element) {
          return false;
        }

        element.scrollIntoView({ block: 'center', inline: 'center' });
        element.click();
        return true;
      })()
    `,
  );

  if (!clicked) {
    throw new Error(`${description} 요소를 찾지 못했습니다: ${selector}`);
  }
}

async function selectFirstOption(client, selector, description) {
  const selected = await evaluate(
    client,
    `
      (() => {
        const select = document.querySelector(${JSON.stringify(selector)});
        const option = [...(select?.options || [])].find((item) => item.value);

        if (!select || !option) {
          return false;
        }

        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );

  if (!selected) {
    throw new Error(`${description} 선택 가능한 옵션이 없습니다: ${selector}`);
  }
}

async function login(context, results, screenshotDir) {
  const { baseUrl, client, loginId, loginPassword, loginRoleLabel } = context;

  await setViewport(client, desktopViewport);
  await navigate(client, `${baseUrl}/login`);
  await waitForCondition(client, "document.querySelector('[data-login-form]')", "로그인 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "01-login");
  await evaluate(
    client,
    `
      (() => {
        document.querySelector('[name="username"]').value = ${JSON.stringify(loginId)};
        document.querySelector('[name="password"]').value = ${JSON.stringify(loginPassword)};
        document.querySelector('[data-login-form]').requestSubmit();
      })()
    `,
  );
  await waitForCondition(
    client,
    `location.pathname === '/schools' && document.body.innerText.includes(${JSON.stringify(loginRoleLabel)})`,
    "로그인 후 학교 선택 화면",
    15000,
  );
}

async function runSchoolChecks(context, results, screenshotDir) {
  const { client } = context;

  await waitForCondition(client, "document.body.innerText.includes('학교 선택')", "학교 선택 렌더링");
  await addCheckpoint({ client, results, screenshotDir }, "02-school-management");

  await click(client, "[data-action='open-school-modal']", "새 학교 버튼");
  await waitForCondition(client, "document.querySelector('.school-modal-card')?.textContent.includes('새 학교')", "새 학교 모달 표시");
  await addCheckpoint({ client, results, screenshotDir }, "03-school-create-modal");
  await click(client, "[data-action='close-school-modal']", "새 학교 모달 닫기");
  await waitForCondition(client, "!document.querySelector('.school-modal-card')", "새 학교 모달 닫힘");

  await click(client, "[data-action='open-school-edit-modal']", "학교 수정 버튼");
  await waitForCondition(
    client,
    "document.querySelector('.school-modal-card') && !document.body.innerText.includes('불러오는 중...')",
    "학교 수정 모달 표시",
  );
  await addCheckpoint({ client, results, screenshotDir }, "04-school-edit-modal");
  await click(client, "[data-action='close-school-modal']", "학교 수정 모달 닫기");
  await waitForCondition(client, "!document.querySelector('.school-modal-card')", "학교 수정 모달 닫힘");
}

async function runAccountChecks(context, results, screenshotDir) {
  const { baseUrl, client } = context;

  await navigate(client, `${baseUrl}/accounts`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'accountManagement'", "계정관리 화면 표시");
  await waitForCondition(
    client,
    `
      (() => {
        const headers = [...document.querySelectorAll('.account-management-table thead th')]
          .map((header) => header.textContent.replace(/\\s+/g, ' ').trim())
          .join('|');
        const iconButtons = [...document.querySelectorAll('.account-management-table .table-action-column button')];
        const iconsAreCentered = iconButtons.every((button) => {
          const buttonRect = button.getBoundingClientRect();
          const iconRect = button.querySelector('svg.button-icon')?.getBoundingClientRect();

          if (!iconRect) {
            return false;
          }

          return Math.abs((buttonRect.left + buttonRect.width / 2) - (iconRect.left + iconRect.width / 2)) <= 1 &&
            Math.abs((buttonRect.top + buttonRect.height / 2) - (iconRect.top + iconRect.height / 2)) <= 1;
        });

        return headers === '아이디|이름|권한|마지막 로그인|관리|삭제' &&
          !document.body.innerText.includes('계정 사용 여부') &&
          iconButtons.every((button) => button.querySelector('svg.button-icon')) &&
          iconsAreCentered;
      })()
    `,
    "계정관리 컬럼 및 아이콘 정렬 확인",
  );
  await addCheckpoint({ client, results, screenshotDir }, "05-account-management-desktop");

  await click(client, "[data-action='open-account-create-modal']", "계정 추가 버튼");
  await waitForCondition(
    client,
    `
      (() => {
        const roleSelect = document.querySelector('[data-account-modal-field="role"]');
        return Boolean(
          document.querySelector('[data-account-form]') &&
          roleSelect?.value === 'admin' &&
          !document.querySelector('[data-account-modal-field="isActive"]')
        );
      })()
    `,
    "계정 추가 모달 기본 권한 및 사용 여부 제거 확인",
  );
  await addCheckpoint({ client, results, screenshotDir }, "06-account-create-modal");
  await click(client, "[data-action='close-account-modal']", "계정 추가 모달 닫기");
  await waitForCondition(client, "!document.querySelector('[data-account-form]')", "계정 추가 모달 닫힘");

  const hasEditButton = await evaluate(client, "Boolean(document.querySelector('[data-action=\"open-account-edit-modal\"]'))");
  if (hasEditButton) {
    await click(client, "[data-action='open-account-edit-modal']", "계정 수정 버튼");
    await waitForCondition(client, "document.querySelector('[data-account-form]')?.textContent.includes('저장')", "계정 수정 모달 표시");
    await addCheckpoint({ client, results, screenshotDir }, "07-account-edit-modal");
    await click(client, "[data-action='close-account-modal']", "계정 수정 모달 닫기");
    await waitForCondition(client, "!document.querySelector('[data-account-form]')", "계정 수정 모달 닫힘");
  } else {
    results.push({
      diagnostics: {},
      issues: [],
      label: "07-account-edit-modal",
      result: "SKIP",
      screenshot: "",
      skippedReason: "등록된 계정 행이 없어 수정 모달을 열 수 없음",
    });
  }

  await setViewport(client, mobileViewport);
  await navigate(client, `${baseUrl}/accounts`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'accountManagement'", "모바일 계정관리 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "08-account-management-mobile");

  await setViewport(client, desktopViewport);
}

async function openFirstWorkspace(context) {
  const { baseUrl, client } = context;

  await navigate(client, `${baseUrl}/schools`);
  await waitForCondition(client, "document.querySelector('[data-action=\"open-school-workspace\"][data-school-code]')", "학교 목록");
  const schoolCode = await evaluate(
    client,
    `
      (async () => {
        const payload = await fetch('/api/schools?limit=100').then((response) => response.json()).catch(() => null);
        const schools = Array.isArray(payload?.items) ? payload.items : [];
        let selectedSchool = null;

        for (const school of schools) {
          const schoolId = String(school.id || '').trim();

          if (!schoolId) {
            continue;
          }

          const generations = await fetch('/api/pdf-generations?limit=1&status=completed&schoolId=' + encodeURIComponent(schoolId))
            .then((response) => response.json())
            .catch(() => null);

          if (Array.isArray(generations?.items) && generations.items.length) {
            selectedSchool = school;
            break;
          }
        }

        selectedSchool = selectedSchool || schools[0] || null;
        const code = String(selectedSchool?.code || selectedSchool?.id || '').trim();

        if (code) {
          const button = document.querySelector('[data-action="open-school-workspace"][data-school-code="' + CSS.escape(code) + '"]');
          if (button) {
            button.click();
          } else {
            history.pushState({}, '', '/schools/' + encodeURIComponent(code) + '/templates');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }

        return code;
      })()
    `,
  );

  if (!schoolCode) {
    throw new Error("테스트할 학교 코드를 찾지 못했습니다.");
  }

  await waitForCondition(client, "document.documentElement.dataset.currentView === 'templateManagement'", "학교 작업공간 진입");
  return schoolCode;
}

async function runTemplateChecks(context, results, screenshotDir, schoolCode) {
  const { baseUrl, client } = context;
  const encodedSchoolCode = encodeURIComponent(schoolCode);

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/templates`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'templateManagement'", "양식관리 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "09-template-management");

  await click(client, "[data-action='create-template']", "새 양식 버튼");
  await waitForCondition(
    client,
    `
      (() => {
        const checkedMode = document.querySelector('[data-template-create-mode]:checked')?.value;
        return Boolean(document.querySelector('[data-template-create-form]') && checkedMode === 'default');
      })()
    `,
    "새 양식 모달 기본 템플릿 선택 확인",
  );
  await addCheckpoint({ client, results, screenshotDir }, "10-template-create-modal-default");

  await click(client, "[data-template-create-mode][value='copy']", "다른 학교 양식 복사 선택");
  await waitForCondition(client, "document.querySelector('[data-template-create-school]')", "다른 학교 선택 표시");
  await addCheckpoint({ client, results, screenshotDir }, "11-template-create-modal-copy-school");

  const hasCopySchool = await evaluate(
    client,
    "Boolean([...document.querySelectorAll('[data-template-create-school] option')].some((option) => option.value))",
  );
  if (hasCopySchool) {
    await selectFirstOption(client, "[data-template-create-school]", "다른 학교 양식 복사");
    await waitForCondition(
      client,
      "document.querySelector('.template-create-source-list') || document.querySelector('.template-create-copy-message')",
      "다른 학교 양식 목록 표시",
      15000,
    );
    await addCheckpoint({ client, results, screenshotDir }, "12-template-create-modal-copy-list");
  } else {
    results.push({
      diagnostics: {},
      issues: [],
      label: "12-template-create-modal-copy-list",
      result: "SKIP",
      screenshot: "",
      skippedReason: "복사 대상으로 선택할 다른 학교가 없음",
    });
  }

  await click(client, "[data-action='close-template-create-modal']", "새 양식 모달 닫기");
  await waitForCondition(client, "!document.querySelector('[data-template-create-form]')", "새 양식 모달 닫힘");
}

async function runCandidateChecks(context, results, screenshotDir, schoolCode) {
  const { baseUrl, client } = context;
  const encodedSchoolCode = encodeURIComponent(schoolCode);

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/candidates`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'candidateLookup'", "수험생 데이터 화면 표시");
  await waitForCondition(client, "document.querySelector('.candidate-data-table')", "수험생 데이터 테이블 표시");
  await addCheckpoint({ client, results, screenshotDir }, "13-candidates");

  await click(client, "[data-action='open-candidate-upload-modal']", "수험생 데이터 업로드 버튼");
  await waitForCondition(client, "document.querySelector('[data-candidate-modal=\"upload\"]')", "수험생 업로드 모달 표시");
  await addCheckpoint({ client, results, screenshotDir }, "14-candidate-upload-workbook-modal");

  await click(client, "[data-action='set-candidate-upload-mode'][data-upload-mode='photo-archive']", "수험생 사진 업로드 탭");
  await waitForCondition(client, "document.body.innerText.includes('수험생 사진 미리보기')", "수험생 사진 업로드 모달 표시");
  await addCheckpoint({ client, results, screenshotDir }, "15-candidate-upload-photo-modal");
  await click(client, "[data-action='close-candidate-upload-modal']", "수험생 업로드 모달 닫기");
  await waitForCondition(client, "!document.querySelector('[data-candidate-modal=\"upload\"]')", "수험생 업로드 모달 닫힘");
}

async function runPdfChecks(context, results, screenshotDir, schoolCode) {
  const { baseUrl, client } = context;
  const encodedSchoolCode = encodeURIComponent(schoolCode);

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/pdf-generations`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'pdfGenerationHistory'", "PDF 생성 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "16-pdf-generations");

  const createEnabled = await evaluate(client, "Boolean(document.querySelector('[data-action=\"open-pdf-generation-create-modal\"]:not(:disabled)'))");
  if (createEnabled) {
    await click(client, "[data-action='open-pdf-generation-create-modal']", "PDF 생성 버튼");
    await waitForCondition(client, "document.querySelector('.pdf-generation-create-overlay')", "PDF 생성 모달 표시", 15000);
    await addCheckpoint({ client, results, screenshotDir }, "17-pdf-generation-create-modal");
    await click(client, "[data-action='close-pdf-generation-create-modal']", "PDF 생성 모달 닫기");
    await waitForCondition(client, "!document.querySelector('.pdf-generation-create-overlay')", "PDF 생성 모달 닫힘");
  } else {
    results.push({
      diagnostics: {},
      issues: [],
      label: "17-pdf-generation-create-modal",
      result: "SKIP",
      screenshot: "",
      skippedReason: "PDF 생성 버튼이 비활성화되어 있음",
    });
  }

  const selectedCompleted = await evaluate(
    client,
    `
      (() => {
        const checkbox = document.querySelector('[data-pdf-generation-select]');
        checkbox?.click();
        return Boolean(checkbox);
      })()
    `,
  );
  if (selectedCompleted) {
    await waitForCondition(client, "document.querySelector('[data-action=\"open-pdf-generation-download-modal\"]:not(:disabled)')", "PDF 다운로드 버튼 활성화");
    await click(client, "[data-action='open-pdf-generation-download-modal']", "PDF 다운로드 버튼");
    await waitForCondition(client, "document.querySelector('.pdf-generation-download-overlay')", "PDF 다운로드 모달 표시");
    await addCheckpoint({ client, results, screenshotDir }, "18-pdf-generation-download-modal");
    await click(client, "[data-action='close-pdf-generation-download-modal']", "PDF 다운로드 모달 닫기");
    await waitForCondition(client, "!document.querySelector('.pdf-generation-download-overlay')", "PDF 다운로드 모달 닫힘");

    await click(client, "[data-action='open-pdf-generation-delete-confirm']", "PDF 삭제 버튼");
    await waitForCondition(client, "document.querySelector('.pdf-generation-delete-overlay')", "PDF 삭제 확인 모달 표시");
    await addCheckpoint({ client, results, screenshotDir }, "19-pdf-generation-delete-modal");
    await click(client, "[data-action='close-pdf-generation-delete-confirm']", "PDF 삭제 확인 모달 닫기");
    await waitForCondition(client, "!document.querySelector('.pdf-generation-delete-overlay')", "PDF 삭제 확인 모달 닫힘");
  } else {
    results.push({
      diagnostics: {},
      issues: [],
      label: "18-pdf-generation-download-modal",
      result: "SKIP",
      screenshot: "",
      skippedReason: "완료된 PDF 생성 결과가 없어 다운로드 모달을 열 수 없음",
    });
    results.push({
      diagnostics: {},
      issues: [],
      label: "19-pdf-generation-delete-modal",
      result: "SKIP",
      screenshot: "",
      skippedReason: "완료된 PDF 생성 결과가 없어 삭제 확인 모달을 열 수 없음",
    });
  }

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/pdf-generations/browser-regression-missing`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'pdfGenerationDetail'", "PDF 생성 상세 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "20-pdf-generation-detail-empty");

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/pdf-history`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'pdfHistoryManagement'", "PDF 작업 로그 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "21-pdf-history");
}

async function runDataDeletionChecks(context, results, screenshotDir, schoolCode) {
  const { baseUrl, client } = context;
  const encodedSchoolCode = encodeURIComponent(schoolCode);

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/data-deletion`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'dataDeletion'", "데이터 삭제 화면 표시");
  await addCheckpoint({ client, results, screenshotDir }, "22-data-deletion");

  await click(client, "[data-action='open-data-deletion-modal'][data-data-deletion-scope='candidates']", "수험생 데이터 삭제 카드");
  await waitForCondition(client, "document.querySelector('.data-deletion-modal-card')", "수험생 데이터 삭제 설정 모달 표시");
  await addCheckpoint({ client, results, screenshotDir }, "23-data-deletion-candidates-modal");
  await click(client, "[data-action='close-data-deletion-modal']", "수험생 데이터 삭제 모달 닫기");
  await waitForCondition(client, "!document.querySelector('.data-deletion-modal-card')", "수험생 데이터 삭제 모달 닫힘");

  await click(client, "[data-action='open-data-deletion-modal'][data-data-deletion-scope='templates']", "양식 데이터 삭제 카드");
  await waitForCondition(client, "document.querySelector('.data-deletion-modal-card')", "양식 데이터 삭제 설정 모달 표시");
  await addCheckpoint({ client, results, screenshotDir }, "24-data-deletion-templates-modal");

  const hasTemplateDeleteTarget = await evaluate(client, "Boolean(document.querySelector('[data-data-deletion-template-id]'))");
  if (hasTemplateDeleteTarget) {
    await click(client, "[data-data-deletion-template-id]", "삭제할 양식 체크박스");
    await waitForCondition(client, "document.querySelector('[data-data-deletion-template-id]:checked')", "삭제할 양식 선택");
    const submitEnabled = await waitForCondition(
      client,
      "document.querySelector('[data-data-deletion-modal-form] button[type=\"submit\"]:not(:disabled)')",
      "데이터 삭제 확인 버튼 활성화",
      15000,
    )
      .then(() => true)
      .catch(() => false);

    if (submitEnabled) {
      await click(client, "[data-data-deletion-modal-form] button[type='submit']", "데이터 삭제 실행 버튼");
      await waitForCondition(client, "document.querySelector('.data-deletion-confirm-card')", "데이터 삭제 확인 모달 표시");
      await addCheckpoint({ client, results, screenshotDir }, "25-data-deletion-confirm-modal");
      await click(client, "[data-action='close-data-deletion-confirm']", "데이터 삭제 확인 모달 닫기");
      await waitForCondition(client, "!document.querySelector('.data-deletion-confirm-card')", "데이터 삭제 확인 모달 닫힘");
    } else {
      results.push({
        diagnostics: {},
        issues: [],
        label: "25-data-deletion-confirm-modal",
        result: "SKIP",
        screenshot: "",
        skippedReason: "선택한 양식 데이터의 삭제 대상 건수가 없어 확인 모달 버튼이 비활성화됨",
      });
    }
  } else {
    results.push({
      diagnostics: {},
      issues: [],
      label: "25-data-deletion-confirm-modal",
      result: "SKIP",
      screenshot: "",
      skippedReason: "삭제 확인까지 진행할 양식 데이터가 없음",
    });
  }

  await click(client, "[data-action='close-data-deletion-modal']", "양식 데이터 삭제 모달 닫기");
  await waitForCondition(client, "!document.querySelector('.data-deletion-modal-card')", "양식 데이터 삭제 모달 닫힘");
}

async function runTemplateEditorChecks(context, results, screenshotDir, schoolCode) {
  const { baseUrl, client } = context;
  const encodedSchoolCode = encodeURIComponent(schoolCode);

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/templates`);
  await waitForCondition(client, "document.querySelector('.template-card[data-template-id]')", "편집할 양식 카드 확인");
  const templateId = await evaluate(client, "document.querySelector('.template-card[data-template-id]')?.dataset.templateId || ''");

  if (!templateId) {
    results.push({
      diagnostics: {},
      issues: [],
      label: "26-template-editor",
      result: "SKIP",
      screenshot: "",
      skippedReason: "편집할 양식이 없음",
    });
    return;
  }

  await navigate(client, `${baseUrl}/schools/${encodedSchoolCode}/templates/${encodeURIComponent(templateId)}/edit`);
  await waitForCondition(client, "document.documentElement.dataset.currentView === 'templateEditor'", "양식 편집 화면 표시");
  await waitForCondition(client, "document.querySelector('#templateEditorSurface')", "양식 편집 캔버스 표시");
  await addCheckpoint({ client, results, screenshotDir }, "26-template-editor");
}

async function run() {
  const screenshotDir = path.join(
    __dirname,
    "..",
    "artifacts",
    "full-browser-regression",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  const results = [];

  await fs.promises.mkdir(screenshotDir, { recursive: true });

  await withBrowserSmokeSession(async (context) => {
    await login(context, results, screenshotDir);
    await runSchoolChecks(context, results, screenshotDir);
    await runAccountChecks(context, results, screenshotDir);
    const schoolCode = await openFirstWorkspace(context);

    await runTemplateChecks(context, results, screenshotDir, schoolCode);
    await runCandidateChecks(context, results, screenshotDir, schoolCode);
    await runPdfChecks(context, results, screenshotDir, schoolCode);
    await runDataDeletionChecks(context, results, screenshotDir, schoolCode);
    await runTemplateEditorChecks(context, results, screenshotDir, schoolCode);

    await click(context.client, "#logoutButton", "로그아웃 버튼");
    await waitForCondition(context.client, "location.pathname === '/login'", "로그아웃 후 로그인 화면");
    await addCheckpoint({ client: context.client, results, screenshotDir }, "27-logout-login");

    const pageErrors = context.client.getPageErrors();
    if (pageErrors.length) {
      results.push({
        diagnostics: {},
        issues: pageErrors,
        label: "browser-runtime-errors",
        result: "FAIL",
        screenshot: "",
      });
    }
  });

  const summary = {
    failed: results.filter((item) => item.result === "FAIL").length,
    passed: results.filter((item) => item.result === "PASS").length,
    results,
    screenshotDir,
    skipped: results.filter((item) => item.result === "SKIP").length,
  };
  const summaryPath = path.join(screenshotDir, "summary.json");

  await fs.promises.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    failed: summary.failed,
    passed: summary.passed,
    screenshotDir,
    skipped: summary.skipped,
    summaryPath,
  }, null, 2));

  if (summary.failed) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
