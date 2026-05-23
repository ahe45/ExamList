const {
  dispatchBrowserKey,
  evaluate,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runDocumentInputScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (() => {
          const smokeText = 'enter split smoke ' + Date.now();
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p id="enterSplitSmoke">' + smokeText + '</p></div>',
            { resetHistory: false, notify: false }
          );

          const paragraph = document.querySelector('#enterSplitSmoke');

          if (!paragraph) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          range.selectNodeContents(paragraph);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          document.querySelector('#templateEditorSurface')?.focus();
          return true;
        })()
      `,
    );
    await dispatchBrowserKey(client, "Enter", { code: "Enter", keyCode: 13 });
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const directWrappers = [...(surface?.children || [])].filter((element) => element.classList.contains('template-doc'));
          const wrapper = directWrappers[0];

          return Boolean(
            surface &&
              directWrappers.length === 1 &&
              wrapper &&
              wrapper.querySelectorAll('.template-doc').length === 0
          );
        })()
      `,
      "엔터 입력 후 문서 경계 중복 방지",
    );
    await evaluate(
      client,
      `
        (() => {
          const contentButton = [...document.querySelectorAll('.template-page-switcher [data-action="select-editor-page"]')]
            .find((button) => button.textContent.includes('본문'));

          if (!contentButton) {
            return false;
          }

          contentButton.click();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const prompt = document.querySelector('.global-modal-close-overlay');
          const saveButton = prompt?.querySelector('[data-global-modal-close-choice="save"]');

          return Boolean(
            prompt &&
              prompt.textContent.includes('페이지를 전환하기 전에 저장하지 않은 변경사항이 있습니다.') &&
              saveButton?.textContent.trim() === '저장 후 전환'
          );
        })()
      `,
      "저장하지 않은 양식 페이지 전환 확인창 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          document.querySelector('[data-global-modal-close-choice="discard"]')?.click();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const selectedButton = document.querySelector('.template-page-switcher-button.selected');
          const columnsControl = document.querySelector('[data-examlist-block-grid-setting="columns"]');
          const rowsControl = document.querySelector('[data-examlist-block-grid-setting="rows"]');
          const createButton = document.querySelector('[data-examlist-block-grid-create]');
          const pageNumberEnabledControl = document.querySelector('[data-examlist-page-number-setting="enabled"]');
          const pageNumberPresetControl = document.querySelector('[data-examlist-page-number-setting="preset"]');
          const pageNumberPresetLabels = [...(pageNumberPresetControl?.options || [])].map((option) => option.textContent.trim());
          const pageNumberPresetsMatch = JSON.stringify(pageNumberPresetLabels) === JSON.stringify([
            '1/1',
            '페이지 1/1',
            'Page1/1',
            '1페이지',
            '1쪽',
            '1페이지 중 1페이지',
            '1쪽 중 1쪽',
          ]);
          const generationUnitSection = document.querySelector('.examlist-generation-unit-field');
          const pageNumberSection = document.querySelector('.examlist-page-number-field');
          const generationUnitLabelRemoved = Boolean(
            generationUnitSection &&
              !generationUnitSection.textContent.includes('PDF 생성 기준') &&
              generationUnitSection.querySelector('[data-examlist-template-setting="generationUnit"]')?.getAttribute('aria-label') === '생성 단위'
          );
          const blockGridSection = document.querySelector('.examlist-candidate-block-grid-field');
          const recognitionSection = document.querySelector('.examlist-recognition-marks-field');
          const coverSwitch = document.querySelector('.examlist-cover-page-field [data-examlist-cover-page-setting="enabled"]');
          const getLabelStyle = (element) => {
            const style = element ? getComputedStyle(element) : null;

            return style
              ? [
                  style.color,
                  style.fontFamily,
                  style.fontSize,
                  style.fontWeight,
                  style.lineHeight
                ].join('|')
              : '';
          };
          const pagePropertiesLabelStyle = getLabelStyle(document.querySelector('.template-page-properties-title'));
          const contentPagePropertyLabelStylesUnified = Boolean(
            pagePropertiesLabelStyle &&
              [
                blockGridSection?.querySelector('.examlist-candidate-block-grid-header > span'),
                generationUnitSection?.querySelector('.template-page-properties-title'),
                pageNumberSection?.querySelector('.examlist-page-number-header > span'),
                recognitionSection?.querySelector('.examlist-recognition-marks-header > span')
              ].every((label) => getLabelStyle(label) === pagePropertiesLabelStyle)
          );

          return Boolean(
            selectedButton?.textContent.includes('본문') &&
              !coverSwitch &&
              columnsControl &&
              rowsControl &&
              createButton &&
              pageNumberEnabledControl &&
              pageNumberPresetControl &&
              !pageNumberEnabledControl.disabled &&
              pageNumberPresetsMatch &&
              generationUnitSection &&
              generationUnitLabelRemoved &&
              pageNumberSection &&
              generationUnitSection.compareDocumentPosition(pageNumberSection) & Node.DOCUMENT_POSITION_FOLLOWING &&
              blockGridSection &&
              recognitionSection &&
              blockGridSection.compareDocumentPosition(recognitionSection) & Node.DOCUMENT_POSITION_FOLLOWING &&
              contentPagePropertyLabelStylesUnified
          );
        })()
      `,
      "내용 페이지 페이지번호 및 수험생 데이터 설정 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          const enabledControl = document.querySelector('[data-examlist-page-number-setting="enabled"]');
          const presetControl = document.querySelector('[data-examlist-page-number-setting="preset"]');

          if (!enabledControl || !presetControl || enabledControl.disabled) {
            return false;
          }

          enabledControl.checked = true;
          enabledControl.dispatchEvent(new Event('change', { bubbles: true }));
          presetControl.value = 'koreanPage';
          presetControl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const presetControl = document.querySelector('[data-examlist-page-number-setting="preset"]');
          const overlay = document.querySelector('.template-page-number-overlay');

          return Boolean(
            presetControl &&
              !presetControl.disabled &&
              presetControl.value === 'koreanPage' &&
              overlay?.textContent.trim() === '1쪽'
          );
        })()
      `,
      "내용 페이지 번호 표시 설정 및 프리셋 반영",
    );
}

module.exports = { runDocumentInputScenario };
