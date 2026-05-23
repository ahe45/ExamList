const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");

async function runToolbarColorPickerCase(client) {
  await waitForCondition(
    client,
    `
      (() => {
        const colorPickers = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')];

        return Boolean(
          colorPickers.length >= 4 &&
            colorPickers.every((picker) => {
              const colorInput = picker.querySelector('.template-toolbar-color');
              const directButton = picker.querySelector('[data-editor-color-direct="true"]');

              return Boolean(
                colorInput &&
                  directButton &&
                  directButton.dataset.editorColorInput === colorInput.id &&
                  /^#[0-9a-f]{6}$/i.test(colorInput.value)
              );
            })
        );
      })()
    `,
    "모든 컬러픽커 직접 선택 입력 표시",
  );
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><p><span id="hexColorTarget">HEX 색상 대상</span></p></div>',
          { resetHistory: false, notify: false }
        );

        const target = document.querySelector('#hexColorTarget');

        if (!target) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));

        const textColorPicker = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')]
          .find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="foreColor"]'));
        const toggle = textColorPicker?.querySelector('[data-editor-color-toggle]');

        toggle?.click();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const textColorPicker = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')]
          .find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="foreColor"]'));
        const panel = textColorPicker?.querySelector('.template-toolbar-color-panel');
        const colorInput = textColorPicker?.querySelector('.template-toolbar-color');

        return Boolean(panel && colorInput && !panel.classList.contains('hidden'));
      })()
    `,
    "글자색 직접 선택 패널 표시",
  );
  await evaluate(
    client,
    `
      (() => {
        const textColorPicker = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')]
          .find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="foreColor"]'));
        const colorInput = textColorPicker?.querySelector('.template-toolbar-color');

        if (!colorInput) {
          return false;
        }

        colorInput.value = '#0f766e';
        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
        colorInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const target = document.querySelector('#hexColorTarget');
        const coloredElement = target?.querySelector('[style*="color"], font[color]') || target;
        const textColorPicker = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')]
          .find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="foreColor"]'));
        const colorInput = textColorPicker?.querySelector('.template-toolbar-color');

        return Boolean(
          target &&
            coloredElement &&
            getComputedStyle(coloredElement).color === 'rgb(15, 118, 110)' &&
            colorInput?.value === '#0f766e'
        );
      })()
    `,
    "직접 선택 글자색 적용",
  );
}

module.exports = {
  runToolbarColorPickerCase,
};
