const { evaluate, waitForCondition } = require("../../../smoke-browser-cdp");

async function preserveTemplateAndPatchCapture(client) {
  await evaluate(
    client,
    `
      (async () => {
        const templateId = decodeURIComponent(location.pathname.match(/\\/templates\\/([^/]+)\\/edit/)?.[1] || '');
        const response = await fetch('/api/pdf-templates/' + encodeURIComponent(templateId));

        window.__examlistSmokeTemplateId = templateId;
        window.__examlistSmokeOriginalTemplate = await response.json();
        return true;
      })()
    `,
  );
  await evaluate(
    client,
    `
      (() => {
        if (window.__examlistSmokeFetchPatched) {
          return true;
        }

        const originalFetch = window.fetch.bind(window);

        window.__examlistSmokeOriginalFetch = originalFetch;
        window.fetch = (input, init = {}) => {
          const requestUrl = typeof input === 'string' ? input : input?.url || '';
          const requestMethod = String(init?.method || input?.method || 'GET').toUpperCase();
          const result = originalFetch(input, init);

          if (requestMethod === 'PATCH' && /\\/api\\/pdf-templates\\//.test(requestUrl)) {
            window.__examlistSmokeLastTemplatePatch = null;
            window.__examlistSmokeLastTemplatePatchError = '';
            result
              .then((response) => response.clone().json())
              .then((payload) => {
                window.__examlistSmokeLastTemplatePatch = payload;
              })
              .catch((error) => {
                window.__examlistSmokeLastTemplatePatchError = String(error?.message || error || '');
              });
          }

          return result;
        };
        window.__examlistSmokeFetchPatched = true;
        return true;
      })()
    `,
  );
}

async function runPageMarginCase(client) {
  await evaluate(
    client,
    `
      (() => {
        const marginInput = document.querySelector('[data-template-page-setting="marginTop"]');

        if (!marginInput) {
          return false;
        }

        marginInput.value = '18';
        marginInput.dispatchEvent(new Event('input', { bubbles: true }));
        marginInput.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const marginInput = document.querySelector('[data-template-page-setting="marginTop"]');
        const paddingTop = surface ? parseFloat(getComputedStyle(surface).paddingTop) : 0;
        const expectedPadding = Math.round(18 * 96 / 25.4);

        return Boolean(surface && marginInput && marginInput.value === '18' && Math.abs(paddingTop - expectedPadding) < 0.5);
      })()
    `,
    "페이지 속성 여백 핸들러 반영",
  );
}

async function runRecognitionMarksCase(client) {
  await evaluate(
    client,
    `
      (() => {
        const enabledInput = document.querySelector('[data-examlist-recognition-setting="enabled"]');
        const offsetXInput = document.querySelector('[data-examlist-recognition-setting="offsetX"]');
        const offsetYInput = document.querySelector('[data-examlist-recognition-setting="offsetY"]');

        if (!enabledInput || !offsetXInput || !offsetYInput) {
          return false;
        }

        enabledInput.checked = true;
        enabledInput.dispatchEvent(new Event('change', { bubbles: true }));
        offsetXInput.value = '12';
        offsetYInput.value = '8';
        offsetXInput.dispatchEvent(new Event('input', { bubbles: true }));
        offsetYInput.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `,
  );
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const overlay = document.querySelector('.template-recognition-marks-overlay');
        const marks = [...(overlay?.querySelectorAll('.template-recognition-mark') || [])];
        const surfaceRect = surface?.getBoundingClientRect();
        const topLeftRect = overlay?.querySelector('.top-left')?.getBoundingClientRect();
        const topRightRect = overlay?.querySelector('.top-right')?.getBoundingClientRect();
        const bottomLeftRect = overlay?.querySelector('.bottom-left')?.getBoundingClientRect();
        const bottomRightRect = overlay?.querySelector('.bottom-right')?.getBoundingClientRect();
        const expectedX = 12 * 96 / 25.4;
        const expectedY = 8 * 96 / 25.4;
        const html = window.ExamListTemplateEditorRuntime?.getHtml?.() || '';

        return Boolean(
          surface &&
            overlay &&
            marks.length === 4 &&
            surfaceRect &&
            topLeftRect &&
            topRightRect &&
            bottomLeftRect &&
            bottomRightRect &&
            Math.abs(topLeftRect.left - surfaceRect.left - expectedX) <= 1.5 &&
            Math.abs(topLeftRect.top - surfaceRect.top - expectedY) <= 1.5 &&
            Math.abs(surfaceRect.right - topRightRect.right - expectedX) <= 1.5 &&
            Math.abs(surfaceRect.bottom - bottomLeftRect.bottom - expectedY) <= 1.5 &&
            Math.abs(surfaceRect.right - bottomRightRect.right - expectedX) <= 1.5 &&
            Math.abs(surfaceRect.bottom - bottomRightRect.bottom - expectedY) <= 1.5 &&
            !html.includes('template-recognition-marks-overlay')
        );
      })()
    `,
    "페이지 속성 인식 기준값 표시 위치 반영",
  );
}

async function runPagePropertiesCases(client) {
  await preserveTemplateAndPatchCapture(client);
  await runPageMarginCase(client);
  await runRecognitionMarksCase(client);
}

module.exports = {
  runPagePropertiesCases,
  runRecognitionMarksCase,
  runPageMarginCase,
};
