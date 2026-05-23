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
        const academicYearInput = document.querySelector('[data-school-modal-field="academicYear"]');
        const descriptionInput = document.querySelector('[data-school-modal-field="description"]');
        const logoDeleteButton = document.querySelector('[data-action="clear-school-modal-logo"]');
        const modalActions = document.querySelector('.school-modal-actions');
        const submitButton = modal?.querySelector('button[type="submit"]');
        const academicYearAfterCode = Boolean(
          codeInput &&
            academicYearInput &&
            codeInput.compareDocumentPosition(academicYearInput) & Node.DOCUMENT_POSITION_FOLLOWING
        );
        const descriptionAfterAcademicYear = Boolean(
          academicYearInput &&
            descriptionInput &&
            academicYearInput.compareDocumentPosition(descriptionInput) & Node.DOCUMENT_POSITION_FOLLOWING
        );

        return Boolean(
          modal &&
            modal.textContent.includes('양식 공통 설정') &&
            nameInput &&
            codeInput &&
            academicYearInput &&
            descriptionInput &&
            academicYearInput.type === 'number' &&
            academicYearInput.step === '1' &&
            !academicYearInput.disabled &&
            academicYearAfterCode &&
            descriptionAfterAcademicYear &&
            getComputedStyle(descriptionInput).resize === 'none' &&
            !modal.textContent.includes('불러오는 중...') &&
            document.querySelector('[data-school-modal-logo-file]') &&
            logoDeleteButton &&
            modalActions?.contains(logoDeleteButton) &&
            submitButton?.textContent.trim() === '저장' &&
            !document.querySelector('[data-school-settings-form]')
        );
      })()
    `,
    "학교 목록 설정 모달 양식 공통 설정 이관",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const nameInput = document.querySelector('[data-school-modal-field="name"]');

        if (!nameInput) {
          return false;
        }

        nameInput.focus();
        nameInput.value = '한국';
        nameInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '국', inputType: 'insertText' }));

        return document.activeElement === nameInput && nameInput.value === '한국';
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

        academicYearInput.focus();
        academicYearInput.value = '2027';
        academicYearInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: '7', inputType: 'insertText' }));

        return document.activeElement === academicYearInput && academicYearInput.value === '2027';
      })()
    `,
    "학교 설정 모달 모집년도 숫자 입력 유지",
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
