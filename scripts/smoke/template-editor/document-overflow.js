const {
  evaluate,
  waitForCondition
} = require("../../smoke-browser-cdp");

async function runDocumentOverflowScenario(context) {
  const { client } = context;
    await waitForCondition(
      client,
      `Boolean(window.ExamListTemplateEditorRuntime?.setHtml && document.querySelector('#templateEditorSurface'))`,
      "페이지 여백 경계 테스트 편집기 런타임 준비",
    );
    await evaluate(
      client,
      `
        (() => {
          const editor = window.ExamListTemplateEditorRuntime;
          const surface = document.querySelector('#templateEditorSurface');

          if (!editor?.setHtml || !surface) {
            return false;
          }

          const makeHtml = (lineCount) =>
            '<div class="template-doc">' +
            Array.from({ length: lineCount }, (_, index) => '<p>여백 경계 테스트 ' + (index + 1) + '</p>').join('') +
            '</div>';
          const getDocumentBoundaryOverflow = () => {
            const documentElement = surface.querySelector('.template-doc');
            const documentRect = documentElement?.getBoundingClientRect();

            if (!documentElement || !documentRect) {
              return 0;
            }

            let contentBottom = documentRect.top;
            const includeRect = (rect) => {
              if (rect && (rect.width || rect.height)) {
                contentBottom = Math.max(contentBottom, rect.bottom);
              }
            };
            const range = document.createRange();

            range.selectNodeContents(documentElement);
            [...range.getClientRects()].forEach(includeRect);
            range.detach?.();
            [...documentElement.querySelectorAll('blockquote, figure, h1, h2, h3, hr, img, li, ol, p, table, ul, .template-generated-object, .template-token')]
              .forEach((element) => [...element.getClientRects()].forEach(includeRect));
            return Math.max(0, Math.ceil(contentBottom - documentRect.bottom));
          };

          let validHtml = makeHtml(1);

          for (let lineCount = 1; lineCount <= 180; lineCount += 1) {
            const candidateHtml = makeHtml(lineCount);

            editor.setHtml(candidateHtml, { resetHistory: false, notify: false });

            if (getDocumentBoundaryOverflow() > 4 || surface.scrollHeight - surface.clientHeight > 4) {
              break;
            }

            validHtml = candidateHtml;
          }

          editor.setHtml(validHtml, { resetHistory: false, notify: false });

          const documentElement = surface.querySelector('.template-doc') || surface;
          surface.focus();
          documentElement.insertAdjacentHTML(
            'beforeend',
            Array.from({ length: 40 }, (_, index) => '<p id="overflowMarker' + index + '">초과 입력</p>').join('')
          );
          surface.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertHTML' }));
          return true;
        })()
      `,
    );
    await waitForCondition(
      client,
      `
        (() => {
          const surface = document.querySelector('#templateEditorSurface');
          const documentElement = surface?.querySelector('.template-doc');
          const documentRect = documentElement?.getBoundingClientRect();
          let contentBottom = documentRect?.top || 0;

          if (documentElement && documentRect) {
            const includeRect = (rect) => {
              if (rect && (rect.width || rect.height)) {
                contentBottom = Math.max(contentBottom, rect.bottom);
              }
            };
            const range = document.createRange();

            range.selectNodeContents(documentElement);
            [...range.getClientRects()].forEach(includeRect);
            range.detach?.();
            [...documentElement.querySelectorAll('blockquote, figure, h1, h2, h3, hr, img, li, ol, p, table, ul, .template-generated-object, .template-token')]
              .forEach((element) => [...element.getClientRects()].forEach(includeRect));
          }

          const warningText = [
            document.querySelector('[data-template-editor-runtime-status]')?.textContent || '',
            document.querySelector('#templateEditorOverflowStatus')?.textContent || '',
            ...[...document.querySelectorAll('.editor-overflow-warning')].map((element) => element.textContent || ''),
          ].join(' ');
          const saveButton = document.querySelector('[data-action="save-template-layout"]');
          const runtimeHasOverflow = window.ExamListTemplateEditorRuntime?.state?.templateEditor?.hasOverflow === true;

          return Boolean(
            surface &&
              documentElement &&
              documentRect &&
              document.querySelector('[id^="overflowMarker"]') &&
              (Math.max(0, Math.ceil(contentBottom - documentRect.bottom)) > 4 ||
                surface.scrollHeight - surface.clientHeight > 4) &&
              (runtimeHasOverflow || /여백|영역|초과|넘어/.test(warningText)) &&
              saveButton &&
              !saveButton.disabled
          );
        })()
      `,
      "페이지 여백 경계 초과 입력 허용 및 저장 전 경고",
    );
}

module.exports = { runDocumentOverflowScenario };
