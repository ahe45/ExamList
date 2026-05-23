const { dispatchBrowserKey, evaluate, waitForCondition } = require("../../../smoke-browser-cdp");

async function runEmptyCanvasBackspaceBoundaryCase(client) {
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.('<div class="template-doc"><p>a</p></div>', {
          resetHistory: false,
          notify: false
        });

        const textNode = document.querySelector('#templateEditorSurface .template-doc p')?.firstChild;
        const surface = document.querySelector('#templateEditorSurface');

        if (!textNode || !surface) {
          return false;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        surface.focus();
        range.setStart(textNode, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      })()
    `,
  );
  await dispatchBrowserKey(client, "Backspace", { code: "Backspace", keyCode: 8 });
  await dispatchBrowserKey(client, "Backspace", { code: "Backspace", keyCode: 8 });
  await waitForCondition(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        const documentElement = surface?.querySelector('.template-doc');
        const wrapperCount = surface?.querySelectorAll('.template-doc').length || 0;
        const wrapperStyle = documentElement ? getComputedStyle(documentElement) : null;

        return Boolean(
          surface &&
            documentElement &&
            wrapperCount === 1 &&
            !surface.textContent.trim() &&
            documentElement.querySelector('p') &&
            wrapperStyle &&
            wrapperStyle.borderTopStyle === 'dashed' &&
            parseFloat(wrapperStyle.borderTopWidth) >= 1
        );
      })()
    `,
    "빈 캔버스 Backspace 여백 경계 보호",
  );
}

module.exports = {
  runEmptyCanvasBackspaceBoundaryCase,
};
