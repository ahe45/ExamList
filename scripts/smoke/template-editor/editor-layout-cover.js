const { evaluate, waitForCondition } = require("../../smoke-browser-cdp");

async function selectCoverPage(client) {
  await waitForCondition(
    client,
    `
      (() => [...document.querySelectorAll(
        '.template-page-switcher [data-action="select-editor-page"], .editor-page-tabs [data-action="select-editor-page"], .template-page-switcher-button, .editor-page-tab'
      )].some((button) => button.textContent.includes('표지')))()
    `,
    "표지 페이지 탭 표시",
  );
  await evaluate(
    client,
    `
      (() => {
        const buttons = [
          ...document.querySelectorAll(
            '.template-page-switcher [data-action="select-editor-page"], .editor-page-tabs [data-action="select-editor-page"], .template-page-switcher-button, .editor-page-tab'
          )
        ];
        const coverButton = buttons.find((button) => button.textContent.includes('표지'));

        if (!coverButton) {
          return false;
        }

        coverButton.click();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const selectedButton = document.querySelector(
          '.template-page-switcher-button.selected, .editor-page-tab.selected, .template-page-switcher [aria-selected="true"], .editor-page-tabs [aria-selected="true"]'
        );

        return Boolean(selectedButton?.textContent.includes('표지'));
      })()
    `,
    "표지 페이지 탭 선택",
  );
}

async function assertCoverPageToggle(client) {
  await selectCoverPage(client);
  await evaluate(
    client,
    `
      (() => {
        const coverSwitch = document.querySelector('.examlist-cover-page-field [data-examlist-cover-page-setting="enabled"], .examlist-cover-page-field [data-editor-page-field="enabled"]');

        if (!(coverSwitch instanceof HTMLInputElement)) {
          return false;
        }

        coverSwitch.checked = false;
        coverSwitch.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const coverSwitch = document.querySelector('.examlist-cover-page-field [data-examlist-cover-page-setting="enabled"], .examlist-cover-page-field [data-editor-page-field="enabled"]');
        const pagePropertiesPanel = document.querySelector('#templatePagePropertiesPanel');
        const surface = document.querySelector('#templateEditorSurface');
        const lowerControls = [...(pagePropertiesPanel?.querySelectorAll('button, input, select, textarea') || [])].filter((control) =>
          !control.closest('.examlist-cover-page-field') &&
            !control.closest('.template-page-switcher') &&
            !control.closest('.editor-page-tabs')
        );
        const pageSwitcherButtons = [...(pagePropertiesPanel?.querySelectorAll('.template-page-switcher button, .editor-page-tabs button') || [])];

        return Boolean(
          coverSwitch instanceof HTMLInputElement &&
            !coverSwitch.checked &&
            !coverSwitch.disabled &&
            pagePropertiesPanel?.classList.contains('is-cover-page-disabled') &&
            lowerControls.length > 0 &&
            lowerControls.every((control) => control.disabled) &&
            pageSwitcherButtons.length > 0 &&
            pageSwitcherButtons.every((button) => !button.disabled) &&
            surface?.classList.contains('is-cover-page-disabled') &&
            surface?.getAttribute('contenteditable') === 'false' &&
            surface?.getAttribute('aria-disabled') === 'true' &&
            getComputedStyle(surface).pointerEvents === 'none'
        );
      })()
    `,
    "표지 페이지 사용 해제 시 하단 설정 및 캔버스 비활성화",
  );
  await evaluate(
    client,
    `
      (() => {
        const coverSwitch = document.querySelector('.examlist-cover-page-field [data-examlist-cover-page-setting="enabled"], .examlist-cover-page-field [data-editor-page-field="enabled"]');

        if (!(coverSwitch instanceof HTMLInputElement)) {
          return false;
        }

        coverSwitch.checked = true;
        coverSwitch.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const coverSwitch = document.querySelector('.examlist-cover-page-field [data-examlist-cover-page-setting="enabled"], .examlist-cover-page-field [data-editor-page-field="enabled"]');
        const pagePropertiesPanel = document.querySelector('#templatePagePropertiesPanel');
        const surface = document.querySelector('#templateEditorSurface');
        const disabledMarkerControls = [...(pagePropertiesPanel?.querySelectorAll('[data-examlist-cover-disabled-control]') || [])];

        return Boolean(
          coverSwitch instanceof HTMLInputElement &&
            coverSwitch.checked &&
            !pagePropertiesPanel?.classList.contains('is-cover-page-disabled') &&
            !disabledMarkerControls.length &&
            !surface?.classList.contains('is-cover-page-disabled') &&
            surface?.getAttribute('contenteditable') === 'true' &&
            !surface?.hasAttribute('aria-disabled') &&
            getComputedStyle(surface).pointerEvents !== 'none'
        );
      })()
    `,
    "표지 페이지 사용 스위치 복구",
  );
}

module.exports = {
  assertCoverPageToggle,
};
