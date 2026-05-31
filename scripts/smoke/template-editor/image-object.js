const {
  dispatchBrowserKey,
  dispatchBrowserMouseClick,
  dispatchBrowserMouseDrag,
  evaluate,
  getBrowserPoint,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runImageObjectScenario(context) {
  const { client } = context;
    await waitForCondition(
      client,
      `Boolean(window.ExamListTemplateEditorRuntime?.setHtml && document.querySelector('#templateEditorSurface'))`,
      "이미지 개체 테스트 편집기 준비",
    );
    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc"><p><img id="plainImageSmoke" src="data:image/png;base64,ZmFrZQ==" alt="일반 이미지" style="width:80px;height:40px;" /></p></div>',
            { resetHistory: false, notify: false }
          );
          document.querySelector('#templateEditorSurface')?.focus();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#plainImageSmoke');

          return Boolean(
            image &&
              image.src.startsWith('data:image/png') &&
              image.alt === '일반 이미지' &&
              image.classList.contains('template-editor-image-object') &&
              !image.classList.contains('template-generated-object') &&
              !image.dataset.templateObjectType &&
              !image.dataset.templateObjectSource
          );
        })()
      `,
      "일반 이미지 삽입 바코드 변환 방지",
    );
    await dispatchBrowserMouseClick(client, '#plainImageSmoke');
    await waitForCondition(
      client,
      `!document.querySelector('.template-editor-image-selection')?.classList.contains('hidden')`,
      "이미지 개체 선택 표시",
    );
    const imageFreeResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-image-resize-handle');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "이미지 자유 리사이즈 시작",
    );
    const imageFreeResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#plainImageSmoke');
            const rect = image?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(client, imageFreeResizeStartPoint, {
      x: imageFreeResizeStartPoint.x + 60,
      y: imageFreeResizeStartPoint.y + 25,
    });
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#plainImageSmoke');
          const rect = image?.getBoundingClientRect();
          const before = ${JSON.stringify(imageFreeResizeBefore)};

          return Boolean(
            image &&
              rect &&
              Math.abs(Math.round(rect.width) - (before.width + 60)) <= 3 &&
              Math.abs(Math.round(rect.height) - (before.height + 25)) <= 3
          );
        })()
      `,
      "이미지 자유 비율 리사이즈",
    );
    const imageRatioResizeStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const handle = document.querySelector('.template-editor-image-resize-handle');
        const rect = handle?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "이미지 비율 유지 리사이즈 시작",
    );
    const imageRatioResizeBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#plainImageSmoke');
            const rect = image?.getBoundingClientRect();

            return {
              height: Math.round(rect?.height || 0),
              ratio: rect && rect.height ? rect.width / rect.height : 0,
              width: Math.round(rect?.width || 0)
            };
          })())
        `,
      ),
    );
    await dispatchBrowserMouseDrag(
      client,
      imageRatioResizeStartPoint,
      {
        x: imageRatioResizeStartPoint.x + 70,
        y: imageRatioResizeStartPoint.y + 8,
      },
      { modifiers: 8 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#plainImageSmoke');
          const rect = image?.getBoundingClientRect();
          const before = ${JSON.stringify(imageRatioResizeBefore)};
          const ratio = rect && rect.height ? rect.width / rect.height : 0;

          return Boolean(
            image &&
              rect &&
              Math.round(rect.width) > before.width + 40 &&
              Math.abs(ratio - before.ratio) <= 0.04
          );
        })()
      `,
      "Shift 드래그 이미지 비율 유지 리사이즈",
    );
    await evaluate(client, `document.querySelector('#templateEditorSurface')?.focus()`);
    await dispatchBrowserKey(client, "ArrowRight", { code: "ArrowRight", keyCode: 39 });
    await dispatchBrowserKey(client, "ArrowDown", { code: "ArrowDown", keyCode: 40 });
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#plainImageSmoke');
          const styleLeft = Number.parseFloat(image?.style?.left || '');
          const styleTop = Number.parseFloat(image?.style?.top || '');

          return Boolean(
            image &&
              image.classList.contains('is-selected-object') &&
              image.style.position === 'absolute' &&
              Number.isFinite(styleLeft) &&
              Number.isFinite(styleTop) &&
              styleLeft >= 1 &&
              styleTop >= 1
          );
        })()
      `,
      "캔버스 이미지 방향키 1px 이동",
    );
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `!document.querySelector('#plainImageSmoke')`,
      "선택 이미지 Delete 삭제",
    );

    await evaluate(
      client,
      `
        (() => {
          window.ExamListTemplateEditorRuntime?.setHtml?.(
            '<div class="template-doc">' +
              '<table id="tableCellImageMoveSmokeTable" style="width:360px;table-layout:fixed;">' +
                '<tbody><tr style="height:120px;">' +
                  '<td id="tableCellImageMoveSmokeCell" style="width:220px;height:120px;vertical-align:top;">' +
                    '<img id="tableCellImageMoveSmoke" src="data:image/png;base64,ZmFrZQ==" alt="셀 이미지" style="width:80px;height:40px;max-width:100%;max-height:100%;display:inline-block;margin:0;vertical-align:top;" />' +
                  '</td>' +
                  '<td>비교</td>' +
                '</tr></tbody>' +
              '</table>' +
            '</div>',
            { resetHistory: false, notify: false }
          );
          document.querySelector('#templateEditorSurface')?.focus();
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#tableCellImageMoveSmoke');

          return Boolean(
            image &&
              image.closest('#tableCellImageMoveSmokeCell') &&
              image.classList.contains('template-editor-image-object')
          );
        })()
      `,
      "캔버스 표 셀 이미지 이동 준비",
    );
    await dispatchBrowserMouseClick(client, '#tableCellImageMoveSmoke');
    await waitForCondition(
      client,
      `document.querySelector('#tableCellImageMoveSmoke')?.classList.contains('is-selected-object')`,
      "캔버스 표 셀 이미지 선택",
    );
    const tableCellImageMoveBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#tableCellImageMoveSmoke');
            const cell = document.querySelector('#tableCellImageMoveSmokeCell');
            const imageRect = image?.getBoundingClientRect();
            const cellRect = cell?.getBoundingClientRect();

            return {
              imageLeft: Math.round(imageRect?.left || 0),
              imageTop: Math.round(imageRect?.top || 0),
              cellLeft: Math.round(cellRect?.left || 0),
              cellRight: Math.round(cellRect?.right || 0),
              cellTop: Math.round(cellRect?.top || 0),
              cellBottom: Math.round(cellRect?.bottom || 0)
            };
          })())
        `,
      ),
    );
    const tableCellImageMoveStartPoint = await getBrowserPoint(
      client,
      `(() => {
        const image = document.querySelector('#tableCellImageMoveSmoke');
        const rect = image?.getBoundingClientRect();

        if (!rect) {
          return null;
        }

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`,
      "캔버스 표 셀 이미지 이동 시작",
    );
    await dispatchBrowserMouseDrag(
      client,
      tableCellImageMoveStartPoint,
      {
        x: tableCellImageMoveStartPoint.x + 24,
        y: tableCellImageMoveStartPoint.y + 14,
      },
      { steps: 6 },
    );
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#tableCellImageMoveSmoke');
          const cell = document.querySelector('#tableCellImageMoveSmokeCell');
          const table = document.querySelector('#tableCellImageMoveSmokeTable');
          const before = ${JSON.stringify(tableCellImageMoveBefore)};
          const imageRect = image?.getBoundingClientRect();
          const cellRect = cell?.getBoundingClientRect();
          const styleLeft = Number.parseFloat(image?.style?.left || '0');
          const styleTop = Number.parseFloat(image?.style?.top || '0');

          return Boolean(
            image &&
              cell &&
              table?.contains(image) &&
              image.closest('td, th') === cell &&
              image.style.position === 'absolute' &&
              Number.isFinite(styleLeft) &&
              Number.isFinite(styleTop) &&
              styleLeft >= 16 &&
              styleTop >= 8 &&
              Math.round(imageRect.left) >= before.imageLeft + 16 &&
              Math.round(imageRect.top) >= before.imageTop + 8 &&
              imageRect.left >= cellRect.left - 1 &&
              imageRect.top >= cellRect.top - 1 &&
              imageRect.right <= cellRect.right + 1 &&
              imageRect.bottom <= cellRect.bottom + 1
          );
        })()
      `,
      "캔버스 표 셀 이미지 위치 이동",
    );
    const tableCellImageKeyboardBefore = JSON.parse(
      await evaluate(
        client,
        `
          JSON.stringify((() => {
            const image = document.querySelector('#tableCellImageMoveSmoke');

            return {
              left: Number.parseFloat(image?.style?.left || '0'),
              top: Number.parseFloat(image?.style?.top || '0')
            };
          })())
        `,
      ),
    );

    await evaluate(client, `document.querySelector('#templateEditorSurface')?.focus()`);
    await dispatchBrowserKey(client, "ArrowRight", { code: "ArrowRight", keyCode: 39 });
    await dispatchBrowserKey(client, "ArrowDown", { code: "ArrowDown", keyCode: 40 });
    await waitForCondition(
      client,
      `
        (() => {
          const image = document.querySelector('#tableCellImageMoveSmoke');
          const before = ${JSON.stringify(tableCellImageKeyboardBefore)};
          const styleLeft = Number.parseFloat(image?.style?.left || '');
          const styleTop = Number.parseFloat(image?.style?.top || '');

          return Boolean(
            image &&
              image.style.position === 'absolute' &&
              Math.abs(styleLeft - (before.left + 1)) <= 0.1 &&
              Math.abs(styleTop - (before.top + 1)) <= 0.1
          );
        })()
      `,
      "캔버스 표 셀 이미지 방향키 1px 이동",
    );
}

module.exports = { runImageObjectScenario };
