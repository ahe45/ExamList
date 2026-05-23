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
    await dispatchBrowserKey(client, "Delete", { code: "Delete", keyCode: 46 });
    await waitForCondition(
      client,
      `!document.querySelector('#plainImageSmoke')`,
      "선택 이미지 Delete 삭제",
    );
}

module.exports = { runImageObjectScenario };
