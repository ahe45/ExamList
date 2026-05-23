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

async function assertEditorGridLayout(client) {
  await selectCoverPage(client);
  await waitForCondition(
    client,
    `
      (() => {
        const grid = document.querySelector('.template-editor-grid');
        const toolbarColumn = grid?.querySelector('.editor-toolbar-column.template-editor-toolbar-column.editor-tools-column');
        const tagPanel = grid?.querySelector('.template-tag-panel');
        const canvasColumn = grid?.querySelector('.editor-canvas-column.template-editor-page');
        const pagePropertiesColumn = grid?.querySelector('.template-page-properties-column');
        const pagePropertiesPanel = grid?.querySelector('#templatePagePropertiesPanel.template-page-properties-panel');
        const pageSwitcher = document.querySelector('.template-page-switcher, .editor-page-tabs');
        const surface = grid?.querySelector('#templateEditorSurface.template-editor-surface.editor-paper.editor-document-surface');
        const documentWrapper = surface?.querySelector('.template-doc');
        const fontFamilySection = toolbarColumn?.querySelector('select[id$="FontFamily"]')?.closest('.template-toolbar-section');
        const fontSizeSection = toolbarColumn?.querySelector('.template-toolbar-font-size-input')?.closest('.template-toolbar-section');
        const lineHeightSection = toolbarColumn?.querySelector('.template-toolbar-line-height-input')?.closest('.template-toolbar-section');
        const fontFamilyRect = fontFamilySection?.getBoundingClientRect();
        const fontSizeRect = fontSizeSection?.getBoundingClientRect();
        const lineHeightRect = lineHeightSection?.getBoundingClientRect();
        const fontSizeInput = toolbarColumn?.querySelector('.template-toolbar-font-size-input');
        const lineHeightInput = toolbarColumn?.querySelector('.template-toolbar-line-height-input');
        const toolbarHasDocumentTools = Boolean(
          toolbarColumn?.querySelector('#templateEditorToolbarHost') &&
          toolbarColumn?.querySelector('select[id$="FontFamily"]') &&
          fontSizeInput &&
          ['number', 'text'].includes(fontSizeInput.type) &&
          !toolbarColumn?.querySelector('.examlist-font-size-stepper-controls') &&
          lineHeightInput &&
          ['number', 'text'].includes(lineHeightInput.type) &&
            !toolbarColumn?.querySelector('[data-examlist-line-height-step]') &&
            toolbarColumn?.querySelector('[data-template-command="bold"]')
        );
        const toolbarTextControlsAvailable = Boolean(
          fontFamilyRect &&
            fontSizeRect &&
            lineHeightRect &&
            fontFamilyRect.width > 0 &&
            fontSizeRect.width > 0 &&
            lineHeightRect.width > 0
        );
        const toolbarHasTableTools = Boolean(
          toolbarColumn?.querySelector('[data-template-insert="table"]') &&
          toolbarColumn?.querySelector('[data-template-table-action="insert-row-before"]') &&
          toolbarColumn?.querySelector('[data-editor-color-table-action="apply-cell-shading"]')
        );
        const toolbarHasInsertTools = Boolean(
          toolbarColumn?.querySelector('[data-template-open-image]') &&
          document.querySelector('[data-examlist-generated-object-source-picker]') &&
          toolbarColumn?.querySelector('[data-template-insert="barcode"]') &&
          toolbarColumn?.querySelector('[data-template-insert="qrcode"]')
        );
        const sidebarHasFooter = Boolean(
          pagePropertiesColumn?.querySelector('.editor-toolbar-footer.editor-sidebar-footer') &&
            pagePropertiesColumn?.querySelector('[data-action="save-template-layout"]') &&
            pagePropertiesColumn?.querySelector('[data-action="open-template-preview"]')
        );
        const tagButtons = [...(tagPanel?.querySelectorAll('#templateTagStrip .template-tag-button') || [])];
        const tagPanelHasTags = Boolean(
          tagButtons.length &&
            tagButtons.every((button) => !button.textContent.trim().includes('.'))
        );
        const pageSwitcherHasCoverAndContent = Boolean(
          pageSwitcher &&
            (pagePropertiesPanel?.firstElementChild === pageSwitcher || pagePropertiesPanel?.firstElementChild === pageSwitcher.closest('section')) &&
            pageSwitcher.querySelectorAll('[data-action="select-editor-page"], .template-page-switcher-button, .editor-page-tab').length >= 2
        );
        const pagePropertiesHasControls = Boolean(
          pagePropertiesPanel?.querySelector('.template-page-properties-title, .section-kicker') &&
            (
              pagePropertiesPanel?.querySelector('[data-template-page-setting="size"]') ||
                pagePropertiesPanel?.querySelector('[data-editor-template-field="paperPreset"]')
            ) &&
            (
              pagePropertiesPanel?.querySelector('[data-template-page-setting="orientation"]') ||
                pagePropertiesPanel?.querySelector('[data-editor-template-field="orientation"]')
            )
        );
        const pagePropertiesHasMarginFields = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].every((field) =>
          pagePropertiesPanel?.querySelector('[data-template-page-setting="' + field + '"]') ||
            pagePropertiesPanel?.querySelector('[data-editor-page-margin-field="' + field.replace('margin', '').toLowerCase() + '"]')
        );
        const pagePropertiesHasRecognitionMarks = Boolean(
          pagePropertiesPanel?.querySelector('[data-examlist-recognition-setting="enabled"]') &&
            pagePropertiesPanel?.querySelector('[data-examlist-recognition-setting="offsetX"]') &&
            pagePropertiesPanel?.querySelector('[data-examlist-recognition-setting="offsetY"]')
        );
        const pagePropertiesHasBlockGrid = Boolean(
          pagePropertiesPanel?.querySelector('[data-examlist-block-grid-setting="columns"]') &&
            pagePropertiesPanel?.querySelector('[data-examlist-block-grid-setting="rows"]') &&
            pagePropertiesPanel?.querySelector('[data-examlist-block-grid-create]')
        );
        const pagePropertiesHasPageNumber = Boolean(
          pagePropertiesPanel?.querySelector('[data-examlist-page-number-setting="enabled"]') &&
            pagePropertiesPanel?.querySelector('[data-examlist-page-number-setting="preset"]')
        );
        const generationUnitSection = pagePropertiesPanel?.querySelector('.examlist-generation-unit-field, .template-editor-generation-field');
        const pageNumberSection = pagePropertiesPanel?.querySelector('.examlist-page-number-field');
        const pagePropertiesHasGenerationUnit = Boolean(
          generationUnitSection?.querySelector('[data-examlist-template-setting="generationUnit"], [data-editor-template-field="generationUnit"]')
        );
        const generationUnitLabelRemoved = Boolean(
          generationUnitSection &&
            !generationUnitSection.textContent.includes('PDF 생성 기준') &&
            generationUnitSection.querySelector('[data-examlist-template-setting="generationUnit"], [data-editor-template-field="generationUnit"]')?.getAttribute('aria-label') === '생성 단위'
        );
        const pageNumberEnabledControl = pagePropertiesPanel?.querySelector('[data-examlist-page-number-setting="enabled"]');
        const pageNumberPresetControl = pagePropertiesPanel?.querySelector('[data-examlist-page-number-setting="preset"]');
        const blockGridCreateButton = pagePropertiesPanel?.querySelector('[data-examlist-block-grid-create]');
        const coverPageSelected = Boolean(
          pageSwitcher?.querySelector('.template-page-switcher-button.selected, .editor-page-tab.selected, [aria-selected="true"]')?.textContent.includes('표지')
        );
        const generationUnitBeforePageNumber = coverPageSelected
          ? Boolean(generationUnitSection)
          : Boolean(
              generationUnitSection &&
                pageNumberSection &&
                generationUnitSection.compareDocumentPosition(pageNumberSection) & Node.DOCUMENT_POSITION_FOLLOWING
            );
        const coverUseSwitch = pagePropertiesPanel?.querySelector('.examlist-cover-page-field [data-examlist-cover-page-setting="enabled"], .examlist-cover-page-field [data-editor-page-field="enabled"]');
        const coverPageHasCoverUseSwitch = Boolean(
          coverPageSelected &&
            coverUseSwitch instanceof HTMLInputElement &&
            coverUseSwitch.type === 'checkbox' &&
            !coverUseSwitch.disabled
        );
        const coverUseSection = coverUseSwitch?.closest('.examlist-cover-page-field');
        const pageSwitcherSection = pageSwitcher?.closest('section') || pageSwitcher;
        const coverPageUseSwitchAtTop = Boolean(
          coverPageSelected &&
            coverUseSection &&
            pageSwitcherSection &&
            (
              pageSwitcher.nextElementSibling === coverUseSection ||
                pageSwitcherSection.nextElementSibling === coverUseSection
            )
        );
        const coverPageHidesBlockGrid = Boolean(
          coverPageSelected &&
            !pagePropertiesHasBlockGrid &&
            !blockGridCreateButton &&
            !pagePropertiesPanel?.querySelector('.examlist-candidate-block-grid-field')
        );
        const coverPageHidesPageNumber = Boolean(
          coverPageSelected &&
            !pagePropertiesHasPageNumber &&
            !pageNumberEnabledControl &&
            !pageNumberPresetControl &&
            !pageNumberSection
        );
        const pagePropertiesTitle = pagePropertiesPanel?.querySelector('.template-page-properties-title, .section-kicker');
        const blockGridSection = pagePropertiesPanel?.querySelector('.examlist-candidate-block-grid-field');
        const recognitionSection = pagePropertiesPanel?.querySelector('.examlist-recognition-marks-field');
        const pagePropertiesSectionOrder = coverPageSelected
          ? Boolean(pagePropertiesTitle && recognitionSection)
          : Boolean(
              pagePropertiesTitle &&
                blockGridSection &&
                recognitionSection &&
                blockGridSection.textContent.includes('수험생 데이터') &&
                pagePropertiesTitle.compareDocumentPosition(blockGridSection) & Node.DOCUMENT_POSITION_FOLLOWING &&
                blockGridSection.compareDocumentPosition(recognitionSection) & Node.DOCUMENT_POSITION_FOLLOWING
            );
        const recognitionOffsetXInput = pagePropertiesPanel?.querySelector('[data-examlist-recognition-setting="offsetX"]');
        const recognitionOffsetYInput = pagePropertiesPanel?.querySelector('[data-examlist-recognition-setting="offsetY"]');
        const pagePropertiesRecognitionDefaults = Boolean(
          recognitionOffsetXInput &&
            recognitionOffsetYInput &&
            recognitionOffsetXInput.value === '5' &&
            recognitionOffsetYInput.value === '5'
        );
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
        const coverUseLabelStyle = getLabelStyle(pagePropertiesPanel?.querySelector('.examlist-cover-page-header > span'));
        const coverPageComparableLabels = [
          pagePropertiesPanel?.querySelector('.template-page-properties-title'),
          pagePropertiesPanel?.querySelector('.examlist-generation-unit-field > .template-page-properties-title, .template-editor-generation-field .section-kicker'),
          pagePropertiesPanel?.querySelector('.examlist-recognition-marks-header > span')
        ].filter(Boolean);
        const coverPagePropertyLabelStylesUnified = !coverPageSelected || Boolean(
            coverUseLabelStyle &&
            coverPageComparableLabels.length &&
            coverPageComparableLabels.every((label) => getLabelStyle(label) === coverUseLabelStyle)
        );
        const gridStyle = grid ? getComputedStyle(grid) : null;
        const gridColumnCount = gridStyle?.gridTemplateColumns.split(' ').filter(Boolean).length || 0;
        const surfaceStyle = surface ? getComputedStyle(surface) : null;
        const surfaceBefore = surface ? getComputedStyle(surface, '::before') : null;
        const surfaceRect = surface?.getBoundingClientRect();
        const canvasRect = canvasColumn?.getBoundingClientRect();
        const pagePropertiesRect = pagePropertiesPanel?.getBoundingClientRect();
        const sheetRect = document.querySelector('.examlist-template-editor-sheet')?.getBoundingClientRect();

        const layoutChecks = {
          grid: Boolean(grid),
          toolbarColumn: Boolean(toolbarColumn),
          tagPanel: Boolean(tagPanel),
          canvasColumn: Boolean(canvasColumn),
          pagePropertiesPanel: Boolean(pagePropertiesPanel),
          surface: Boolean(surface),
          documentWrapper: Boolean(documentWrapper),
          columnOrder: Boolean(
            toolbarColumn?.compareDocumentPosition(tagPanel) & Node.DOCUMENT_POSITION_FOLLOWING &&
              tagPanel?.compareDocumentPosition(canvasColumn) & Node.DOCUMENT_POSITION_FOLLOWING &&
              canvasColumn?.compareDocumentPosition(pagePropertiesColumn || pagePropertiesPanel) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
          toolbarHasDocumentTools,
          toolbarTextControlsAvailable,
          toolbarHasTableTools,
          toolbarHasInsertTools,
          sidebarHasFooter,
          tagPanelHasTags,
          pageSwitcherHasCoverAndContent,
          pagePropertiesHasControls,
          pagePropertiesHasMarginFields,
          pagePropertiesHasGenerationUnit,
          generationUnitLabelRemoved,
          generationUnitBeforePageNumber,
          coverPageHasCoverUseSwitch,
          coverPageUseSwitchAtTop,
          coverPageHidesBlockGrid,
          coverPageHidesPageNumber,
          pagePropertiesSectionOrder,
          pagePropertiesHasRecognitionMarks,
          pagePropertiesRecognitionDefaults,
          coverPagePropertyLabelStylesUnified,
          gridColumnCount: gridColumnCount === 4,
          surfaceEditable: Boolean(surface?.isContentEditable),
          surfaceContentMarker: Boolean(surfaceBefore && ['none', 'normal', ''].includes(surfaceBefore.content)),
          surfacePadding: Boolean(surfaceStyle && parseFloat(surfaceStyle.paddingTop) > 0),
          surfaceWidth: Boolean(surfaceRect && surfaceRect.width >= 720),
          propertiesAfterCanvas: Boolean(canvasRect && pagePropertiesRect && pagePropertiesRect.left > canvasRect.right),
          sheet: Boolean(sheetRect),
        };

        window.__examlistSmokeEditorLayoutChecks = layoutChecks;
        return Object.values(layoutChecks).every(Boolean);
      })()
    `,
    "양식 관리 중앙 4열 편집기 레이아웃 표시",
  );
}

async function assertEditorSurfaceHasNoUndefined(client) {
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        return Boolean(surface && !surface.innerText.includes('undefined') && !surface.innerHTML.includes('undefined'));
      })()
    `,
    "양식 편집기 캔버스 undefined 미표시",
  );
}

module.exports = {
  assertEditorGridLayout,
  assertEditorSurfaceHasNoUndefined,
};
