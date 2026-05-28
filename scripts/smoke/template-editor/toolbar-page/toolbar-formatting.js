const {
  dispatchBrowserMouseClick,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition,
} = require("../../../smoke-browser-cdp");

async function runToolbarColorPickerCase(client) {
  await waitForCondition(
    client,
    `
      (() => {
        const colorPickers = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')];
        const textColorPicker = colorPickers.find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="foreColor"]'));
        const textShadingPicker = colorPickers.find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="hiliteColor"]'));
        const cellShadingPicker = colorPickers.find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-table-action="apply-cell-shading"]'));

        return Boolean(
          colorPickers.length >= 4 &&
            textColorPicker?.querySelector('.template-toolbar-color-swatch[aria-label="흰색"]') &&
            textShadingPicker?.querySelector('.template-toolbar-color-swatch[data-editor-color-none="true"][aria-label="색 없음"]') &&
            cellShadingPicker?.querySelector('.template-toolbar-color-swatch[data-editor-color-none="true"][aria-label="색 없음"]') &&
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
  await waitForCondition(
    client,
    `
      (() => {
        const fontSizeOptions = [...document.querySelectorAll('#templateEditorToolbarHost [data-editor-font-size-option]')]
          .map((option) => option.dataset.editorFontSizeOption);
        const lineHeightOptions = [...document.querySelectorAll('#templateEditorToolbarHost [data-template-line-height-option]')]
          .map((option) => option.dataset.templateLineHeightOption);
        const expectedFontSizes = [
          ...Array.from({ length: 28 }, (_value, index) => String(index + 1)),
          '30',
          '32',
          '36',
          '40',
          '48',
          '56',
          '64',
          '72',
        ];
        const expectedLineHeights = Array.from({ length: 11 }, (_value, index) => String(index * 0.5).replace(/\\.0$/, ''));

        return Boolean(
          JSON.stringify(fontSizeOptions) === JSON.stringify(expectedFontSizes) &&
            JSON.stringify(lineHeightOptions) === JSON.stringify(expectedLineHeights)
        );
      })()
    `,
    "글자 크기와 줄 간격 프리셋 목록",
  );
  await waitForCondition(
    client,
    `
      (() => {
        const toolbarHost = document.querySelector('#templateEditorToolbarHost');
        const colorTriggerWidth = toolbarHost?.querySelector('.template-toolbar-color-trigger')?.getBoundingClientRect()?.width || 0;
        const comboWidths = [
          toolbarHost?.querySelector('.template-toolbar-font-family-combo')?.getBoundingClientRect()?.width || 0,
          toolbarHost?.querySelector('.template-toolbar-font-size-combo')?.getBoundingClientRect()?.width || 0,
          toolbarHost?.querySelector('.template-toolbar-line-height-combo')?.getBoundingClientRect()?.width || 0,
        ];

        return Boolean(
          colorTriggerWidth &&
            comboWidths.every((width) => width && Math.abs(width - colorTriggerWidth) <= 1)
        );
      })()
    `,
    "글꼴 글자 크기 줄 간격 콤보 폭 통일",
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
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><p><span id="noTextShadingTarget" style="background-color: rgb(255, 245, 157);">음영 없음 대상</span></p></div>',
          { resetHistory: false, notify: false }
        );

        const surface = document.querySelector('#templateEditorSurface');
        const target = document.querySelector('#noTextShadingTarget');

        if (!surface || !target) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        surface.focus();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        document.querySelector('#templateEditorToolbarHost [data-editor-color-command="hiliteColor"][data-editor-color-none="true"]')?.click();
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const target = document.querySelector('#noTextShadingTarget');
        const textShadingPicker = [...document.querySelectorAll('#templateEditorToolbarHost .template-toolbar-color-picker')]
          .find((picker) => picker.querySelector('.template-toolbar-color[data-editor-color-command="hiliteColor"]'));

        return Boolean(
          target &&
            target.style.backgroundColor === 'transparent' &&
            textShadingPicker?.classList.contains('is-no-color') &&
            textShadingPicker?.querySelector('[data-editor-color-none="true"]')?.classList.contains('active')
        );
      })()
    `,
    "글자 음영 색 없음 적용",
  );

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><p id="visualSelectionTarget">visual selection target</p></div>',
          { resetHistory: false, notify: false }
        );

        const surface = document.querySelector('#templateEditorSurface');
        const target = document.querySelector('#visualSelectionTarget')?.firstChild || null;

        if (!surface || !target) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.setStart(target, 0);
        range.setEnd(target, target.textContent.length);
        selection.removeAllRanges();
        selection.addRange(range);
        surface.focus();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-size-toggle]');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const menu = document.querySelector('#templateEditorToolbarHost [data-editor-font-size-menu-for]');
        const activeOption = menu?.querySelector('.template-toolbar-combo-option.active');
        const menuRect = menu?.getBoundingClientRect();
        const activeRect = activeOption?.getBoundingClientRect();
        const isActiveScrolledIntoView = Boolean(
          menuRect &&
            activeRect &&
            activeRect.top >= menuRect.top &&
            activeRect.bottom <= menuRect.bottom &&
            Math.abs((activeRect.top + activeRect.height / 2) - (menuRect.top + menuRect.height / 2)) <= activeRect.height
        );
        const selection = window.getSelection?.();

        return Boolean(
          document.activeElement === surface &&
            menu &&
            !menu.classList.contains('hidden') &&
            isActiveScrolledIntoView &&
            selection?.toString?.() === 'visual selection target' &&
            !document.querySelector('[data-template-editor-text-selection-overlay]')
        );
      })()
    `,
    "글자 크기 목록 클릭 중 기본 텍스트 선택 유지",
  );
  await evaluate(
    client,
    `
      (() => {
        document.querySelector('#templateEditorToolbarHost [data-editor-font-size-toggle]')?.click();
        return true;
      })()
    `,
  );

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><p id="lineHeightVisualSelectionTarget" style="line-height: calc(1em + 4.5pt); margin: 0 0 4.5pt;">line height visual target</p></div>',
          { resetHistory: false, notify: false }
        );

        const surface = document.querySelector('#templateEditorSurface');
        const target = document.querySelector('#lineHeightVisualSelectionTarget')?.firstChild || null;

        if (!surface || !target) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.setStart(target, 0);
        range.setEnd(target, target.textContent.length);
        selection.removeAllRanges();
        selection.addRange(range);
        surface.focus();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-line-height-toggle]');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const menu = document.querySelector('#templateEditorToolbarHost .template-toolbar-line-height-combo .template-toolbar-combo-menu');
        const activeOption = menu?.querySelector('.template-toolbar-combo-option.active');
        const menuRect = menu?.getBoundingClientRect();
        const activeRect = activeOption?.getBoundingClientRect();
        const isActiveScrolledIntoView = Boolean(
          menuRect &&
            activeRect &&
            activeOption?.dataset.templateLineHeightOption === '4.5' &&
            activeRect.top >= menuRect.top &&
            activeRect.bottom <= menuRect.bottom
        );
        const selection = window.getSelection?.();

        return Boolean(
          document.activeElement === surface &&
            menu &&
            !menu.classList.contains('hidden') &&
            isActiveScrolledIntoView &&
            selection?.toString?.() === 'line height visual target' &&
            !document.querySelector('[data-template-editor-text-selection-overlay]')
        );
      })()
    `,
    "줄 간격 목록 클릭 중 기본 텍스트 선택 유지",
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-line-height-option="1.5"]');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const paragraph = document.querySelector('#lineHeightVisualSelectionTarget');
        const selection = window.getSelection?.();
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;

        return Boolean(
            surface &&
            paragraph &&
            paragraph.style.lineHeight &&
            paragraph.style.marginBottom === '1.5pt' &&
            document.activeElement === surface &&
            range &&
            paragraph.contains(range.startContainer)
        );
      })()
    `,
    "줄 간격 변경 후 텍스트 선택 위치 유지 및 적용",
  );

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><p>글꼴 포커스 테스트</p></div>',
          { resetHistory: false, notify: false }
        );

        const surface = document.querySelector('#templateEditorSurface');
        const textNode = surface?.querySelector('.template-doc p')?.firstChild || null;

        if (!surface || !textNode) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        surface.focus();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-family-toggle]');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const paragraph = surface?.querySelector('.template-doc p');
        const menu = document.querySelector('#templateEditorToolbarHost [data-editor-font-family-menu-for]');
        const savedRange = window.ExamListTemplateEditorRuntime?.state?.templateEditor?.savedRange || null;
        const selection = window.getSelection?.();

        return Boolean(
          paragraph &&
            document.activeElement === surface &&
            menu &&
            !menu.classList.contains('hidden') &&
            savedRange &&
            paragraph.contains(savedRange.startContainer) &&
            selection?.toString?.() === '글꼴 포커스 테스트'
        );
      })()
    `,
    "글꼴 목록 클릭 중 기본 텍스트 선택 유지",
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-family-option]:not(.active)');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const paragraph = surface?.querySelector('.template-doc p');
        const selection = window.getSelection?.();
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;

        return Boolean(
          surface &&
            paragraph &&
            document.activeElement === surface &&
            range &&
            paragraph.contains(range.startContainer)
        );
      })()
    `,
    "글꼴 변경 후 텍스트 캐럿 위치 유지",
  );

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><table><tbody><tr><td>1</td><td>2</td><td>3</td></tr><tr><td>4</td><td>5</td><td>6</td></tr><tr><td>7</td><td>8</td><td>9</td></tr></tbody></table></div>',
          { resetHistory: false, notify: false }
        );
        document.querySelector('#templateEditorSurface')?.focus();
        return true;
      })()
    `,
  );
  const tableSelectionStartPoint = await getBrowserPoint(
    client,
    `(() => {
      const cell = document.querySelector('#templateEditorSurface .template-doc table tr:first-child td:first-child');
      const rect = cell?.getBoundingClientRect();

      return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    })()`,
    "툴바 포커스 표 선택 시작",
  );
  const tableSelectionEndPoint = await getBrowserPoint(
    client,
    `(() => {
      const cell = document.querySelector('#templateEditorSurface .template-doc table tr:nth-child(3) td:nth-child(2)');
      const rect = cell?.getBoundingClientRect();

      return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    })()`,
    "툴바 포커스 표 선택 종료",
  );
  await dispatchBrowserMouseDrag(client, tableSelectionStartPoint, tableSelectionEndPoint);
  await waitForCondition(
    client,
    `document.querySelectorAll('#templateEditorSurface .template-doc td.is-selected-cell').length > 0`,
    "툴바 포커스 전 표 셀 범위 선택 표시",
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-family-toggle]');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const menu = document.querySelector('#templateEditorToolbarHost [data-editor-font-family-menu-for]');
        const selectedCells = [...document.querySelectorAll('#templateEditorSurface .template-doc td.is-selected-cell')];
        const selectedStyle = selectedCells[0] ? getComputedStyle(selectedCells[0]) : null;

        return Boolean(
          document.activeElement === surface &&
            menu &&
            !menu.classList.contains('hidden') &&
            window.ExamListTemplateEditorRuntime?.state?.templateEditor?.tableSelection &&
            selectedCells.length > 0 &&
            selectedStyle?.outlineStyle === 'solid' &&
            selectedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        );
      })()
    `,
    "글꼴 선택 클릭 중 표 셀 선택 표시 유지",
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-family-toggle]');
  await waitForCondition(
    client,
    `document.querySelector('#templateEditorToolbarHost [data-editor-font-family-menu-for]')?.classList.contains('hidden')`,
    "글꼴 목록 닫힘",
  );

  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(
          '<div class="template-doc"><table><tbody><tr><td>셀 포커스 테스트</td><td>다음 셀</td></tr></tbody></table></div>',
          { resetHistory: false, notify: false }
        );

        const surface = document.querySelector('#templateEditorSurface');
        const cell = surface?.querySelector('.template-doc td');

        if (!surface || !cell) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(cell);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        surface.focus();
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        return true;
      })()
    `,
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-family-toggle]');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const cell = surface?.querySelector('.template-doc td');
        const menu = document.querySelector('#templateEditorToolbarHost [data-editor-font-family-menu-for]');
        const savedRange = window.ExamListTemplateEditorRuntime?.state?.templateEditor?.savedRange || null;

        return Boolean(
          cell &&
            document.activeElement === surface &&
            menu &&
            !menu.classList.contains('hidden') &&
            savedRange &&
            (savedRange.startContainer === cell || cell.contains(savedRange.startContainer))
        );
      })()
    `,
    "글꼴 선택 클릭 중 표 셀 저장 위치 유지",
  );
  await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-editor-font-family-option]:not(.active)');
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const cell = surface?.querySelector('.template-doc td');
        const activeCell = surface?.querySelector('td.is-active-cell, th.is-active-cell');
        const selection = window.getSelection?.();
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;

        return Boolean(
          surface &&
            cell &&
            activeCell === cell &&
            document.activeElement === surface &&
            range &&
            (range.startContainer === cell || cell.contains(range.startContainer))
        );
      })()
    `,
    "글꼴 변경 후 표 셀 캐럿 위치 유지",
  );
}

module.exports = {
  runToolbarColorPickerCase,
};
