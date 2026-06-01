const { evaluate, waitForCondition } = require("../../smoke-browser-cdp");

async function assertSchoolSettingsModal(context) {
  const { client } = context;

  await evaluate(client, "document.querySelector('[data-action=\"open-school-edit-modal\"]')?.click()");
  await waitForCondition(
    client,
    `
      (() => {
        const modal = document.querySelector('.school-modal-card');
        const nameInput = document.querySelector('[data-school-modal-field="name"]');
        const codeInput = document.querySelector('[data-school-modal-field="code"]');
        const academicYearSelect = document.querySelector('[data-school-modal-field="academicYear"]');
        const campusNameInput = document.querySelector('[data-school-modal-field="campusName"]');
        const campusCodeInput = document.querySelector('[data-school-modal-field="campusCode"]');
        const logoDeleteButton = document.querySelector('[data-action="clear-school-modal-logo"]');
        const modalActions = document.querySelector('.school-modal-actions');
        const cancelButton = modalActions?.querySelector('[data-action="close-school-modal"]');
        const submitButton = modal?.querySelector('button[type="submit"]');
        const academicYearAfterCode = Boolean(
          codeInput &&
            academicYearSelect &&
            codeInput.compareDocumentPosition(academicYearSelect) & Node.DOCUMENT_POSITION_FOLLOWING
        );
        const campusAfterAcademicYear = Boolean(
          academicYearSelect &&
            campusNameInput &&
            campusCodeInput &&
            academicYearSelect.compareDocumentPosition(campusNameInput) & Node.DOCUMENT_POSITION_FOLLOWING &&
            campusNameInput.compareDocumentPosition(campusCodeInput) & Node.DOCUMENT_POSITION_FOLLOWING
        );
        const yearOptions = [...(academicYearSelect?.options || [])].map((option) => Number(option.value)).filter(Boolean);
        const currentYear = new Date().getFullYear();

        return Boolean(
          modal &&
            !modal.textContent.includes('양식 공통 설정') &&
            nameInput &&
            codeInput &&
            academicYearSelect?.tagName === 'SELECT' &&
            campusNameInput &&
            campusCodeInput &&
            !document.querySelector('[data-school-modal-field="description"]') &&
            !academicYearSelect.disabled &&
            academicYearAfterCode &&
            campusAfterAcademicYear &&
            yearOptions[0] === currentYear - 5 &&
            yearOptions[yearOptions.length - 1] === currentYear + 5 &&
            !modal.textContent.includes('불러오는 중...') &&
            document.querySelector('[data-school-modal-logo-file]') &&
            logoDeleteButton &&
            !modalActions?.contains(logoDeleteButton) &&
            modalActions?.querySelector('.school-modal-actions-left')?.contains(cancelButton) &&
            submitButton?.textContent.trim() === '저장' &&
            !document.querySelector('[data-school-settings-form]')
        );
      })()
    `,
    "학교 목록 설정 모달 캠퍼스 설정 구성",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const nameInput = document.querySelector('[data-school-modal-field="name"]');

        if (!nameInput) {
          return false;
        }

        const nextName = nameInput.value === '한국' ? '한국스모크' : '한국';

        nameInput.focus();
        nameInput.value = nextName;
        nameInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: nextName.slice(-1), inputType: 'insertText' }));

        return document.activeElement === nameInput && nameInput.value === nextName;
      })()
    `,
    "학교 설정 모달 학교명 입력 중 포커스 유지",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const academicYearInput = document.querySelector('[data-school-modal-field="academicYear"]');

        if (!academicYearInput) {
          return false;
        }

        const nextAcademicYear = [...academicYearInput.options].map((option) => option.value).find((value) => value && value !== academicYearInput.value);

        if (!nextAcademicYear) {
          return false;
        }

        academicYearInput.focus();
        academicYearInput.value = nextAcademicYear;
        academicYearInput.dispatchEvent(new Event('change', { bubbles: true }));

        return document.activeElement === academicYearInput && academicYearInput.value === nextAcademicYear;
      })()
    `,
    "학교 설정 모달 학년도 선택 유지",
  );
  await evaluate(client, "document.querySelector('[data-action=\"close-school-modal\"]')?.click()");
  await waitForCondition(
    client,
    "document.querySelector('[data-global-modal-close-choice=\"discard\"]')",
    "학교 설정 변경사항 닫기 확인 표시",
  );
  await evaluate(client, "document.querySelector('[data-global-modal-close-choice=\"discard\"]')?.click()");
  await waitForCondition(client, "!document.querySelector('.school-modal-card')", "학교 설정 모달 닫힘");
}

module.exports = {
  assertSchoolSettingsModal,
};
