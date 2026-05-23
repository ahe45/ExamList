const {
  dispatchBrowserMouseClick,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runGeneratedObjectsScenario(context) {
  const { client } = context;
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p id="generatedObjectAnchor"><br></p></div>',
            { resetHistory: false, notify: false }
          );

          const anchor = document.querySelector('#generatedObjectAnchor');

          if (!anchor) {
            return false;
          }

          const selection = window.getSelection();
          const range = document.createRange();

          range.selectNodeContents(anchor);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
          return true;
        })()
      `,
    );
    await dispatchBrowserMouseClick(client, '#templateEditorToolbarHost [data-template-insert="barcode"]');
    await waitForCondition(
      client,
      `
        (() => {
          const picker = document.querySelector('[data-examlist-generated-object-source-picker]');

          return Boolean(
            picker &&
              !picker.classList.contains('hidden') &&
              picker.dataset.examlistGeneratedObjectType === 'barcode' &&
              picker.textContent.includes('바코드 데이터') &&
              picker.querySelector('[data-examlist-generated-object-source-option="candidate.name"]')
          );
        })()
      `,
      "바코드 데이터 픽커 표시",
    );
    await evaluate(
      client,
      `
        (() => {
          document
            .querySelector('[data-examlist-generated-object-source-option="candidate.name"]')
            ?.closest('details')
            ?.setAttribute('open', '');
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const picker = document.querySelector('[data-examlist-generated-object-source-picker]');
          const options = picker?.querySelector('.examlist-generated-object-source-options');
          const option = picker?.querySelector('[data-examlist-generated-object-source-option="candidate.name"]');
          const group = option?.closest('details');
          const summary = group?.querySelector('summary');
          const list = group?.querySelector('.template-tag-accordion-list');
          const groupRect = group?.getBoundingClientRect();
          const summaryRect = summary?.getBoundingClientRect();
          const listRect = list?.getBoundingClientRect();

          return Boolean(
            picker &&
              options &&
              group?.open &&
              groupRect &&
              summaryRect &&
              listRect &&
              groupRect.height >= summaryRect.height + listRect.height - 6 &&
              listRect.bottom <= groupRect.bottom + 3 &&
              options.scrollHeight >= options.clientHeight
          );
        })()
      `,
      "바코드 데이터 픽커 아코디언 펼침 영역",
    );
    await dispatchBrowserMouseClick(client, '[data-examlist-generated-object-source-option="candidate.name"]');
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
          const svgMarkup = image?.src?.startsWith('data:image/svg+xml')
            ? decodeURIComponent(String(image.src).split(',')[1] || '')
            : '';
          const rectMatches = [...svgMarkup.matchAll(/<rect\\s+[^>]*x="([\\d.]+)"\\s+y="([\\d.]+)"\\s+width="([\\d.]+)"\\s+height="([\\d.]+)"\\s+fill="#111827"/g)];
          const leftMostBar = rectMatches.reduce((minLeft, match) => {
            const x = Number(match[1]);

            return Number.isFinite(x) ? Math.min(minLeft, x) : minLeft;
          }, Number.POSITIVE_INFINITY);
          const rightMostBar = rectMatches.reduce((maxRight, match) => {
            const x = Number(match[1]);
            const width = Number(match[3]);

            return Number.isFinite(x) && Number.isFinite(width) ? Math.max(maxRight, x + width) : maxRight;
          }, 0);
          const hasFlatBars = rectMatches.length > 0 && rectMatches.every((match) => match[2] === '0' && match[4] === '72');

          return Boolean(
            image &&
              image.dataset.templateObjectSource === 'candidate.name' &&
              image.src.startsWith('data:image/svg+xml') &&
              !svgMarkup.includes('<text') &&
              svgMarkup.includes('shape-rendering="crispEdges"') &&
              svgMarkup.includes('preserveAspectRatio="none"') &&
              hasFlatBars &&
              leftMostBar === 0 &&
              rightMostBar >= 235 &&
              image.title.includes('이름')
          );
        })()
      `,
      "바코드 데이터 종류 선택 삽입",
    );
    await dispatchBrowserMouseClick(client, '#templateEditorSurface img[data-template-object-type="barcode"]');
    await waitForCondition(
      client,
      `!document.querySelector('.template-editor-image-selection')?.classList.contains('hidden')`,
      "바코드 개체 선택 표시",
    );
    await waitForCondition(
      client,
      `
        (() => {
          const handles = [...document.querySelectorAll('.template-editor-image-resize-handle')];
          const corners = new Set(handles.map((handle) => handle.dataset.templateResizeCorner));

          return Boolean(
            handles.length === 8 &&
              corners.has('top-left') &&
              corners.has('top') &&
              corners.has('top-right') &&
              corners.has('right') &&
              corners.has('bottom') &&
              corners.has('bottom-left') &&
              corners.has('bottom-right') &&
              corners.has('left') &&
              handles.every((handle) => {
                const rect = handle.getBoundingClientRect();

                return rect.width <= 10 && rect.height <= 10;
              })
          );
        })()
      `,
      "이미지 개체 8방향 리사이즈 핸들 표시",
    );
    const barcodeRightResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-image-resize-handle[data-template-resize-corner="right"]');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "바코드 우측 핸들 리사이즈 시작",
    );
    const barcodeRightResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
            const rect = image?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(client, barcodeRightResizeStartPoint, {
      x: barcodeRightResizeStartPoint.x + 48,
      y: barcodeRightResizeStartPoint.y + 24,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
          const rect = image?.getBoundingClientRect();
          const before = ${JSON.stringify(barcodeRightResizeBefore)};

          return Boolean(
            image &&
              rect &&
              Math.round(rect.width) >= before.width + 36 &&
              Math.abs(Math.round(rect.height) - before.height) <= 2
          );
        })()
      `,
      "바코드 우측 핸들 단일축 리사이즈",
    );
    const barcodeResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-image-resize-handle');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "바코드 자유 리사이즈 시작",
    );
    const barcodeResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
            const rect = image?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(
      client,
      barcodeResizeStartPoint,
      {
        x: barcodeResizeStartPoint.x + 80,
        y: barcodeResizeStartPoint.y - 24,
      },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
          const rect = image?.getBoundingClientRect();
          const before = ${JSON.stringify(barcodeResizeBefore)};

          return Boolean(
            image &&
              rect &&
              Math.round(rect.width) >= before.width + 50 &&
              Math.round(rect.height) <= before.height - 10
          );
        })()
      `,
      "바코드 기본 드래그 자유 리사이즈",
    );
    const barcodeShiftResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-image-resize-handle');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "바코드 Shift 비율 리사이즈 시작",
    );
    const barcodeShiftResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
            const rect = image?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              ratio: rect?.width && rect?.height ? rect.width / rect.height : 0,
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(
      client,
      barcodeShiftResizeStartPoint,
      {
        x: barcodeShiftResizeStartPoint.x + 60,
        y: barcodeShiftResizeStartPoint.y + 8,
      },
      { modifiers: 8 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]');
          const rect = image?.getBoundingClientRect();
          const before = ${JSON.stringify(barcodeShiftResizeBefore)};
          const ratio = rect?.width && rect?.height ? rect.width / rect.height : 0;

          return Boolean(
            image &&
              rect &&
              Math.round(rect.width) >= before.width + 40 &&
              Math.round(rect.height) >= before.height + 5 &&
              Number.isFinite(ratio) &&
              Math.abs(ratio - before.ratio) <= 0.12
          );
        })()
      `,
      "바코드 Shift 드래그 비율 유지",
    );
    await evaluate(
      client,
      `
        (() => {
          const html = window.ExamListTemplateEditorRuntime?.getHtml?.() || "";

          window.ExamListTemplateEditorRuntime?.setHtml?.(html, { resetHistory: false, notify: false });
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `document.querySelector('#templateEditorSurface img[data-template-object-type="barcode"]')?.dataset.templateObjectSource === 'candidate.name'`,
      "바코드 데이터 종류 재렌더 유지",
    );
}

module.exports = { runGeneratedObjectsScenario };
