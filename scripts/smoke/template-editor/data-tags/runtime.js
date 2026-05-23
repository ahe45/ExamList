const { evaluate } = require("../../../smoke-browser-cdp");

async function clickTemplateTagButton(client, templateTag) {
  await evaluate(
    client,
    `
      (() => {
        const tagButton = [...document.querySelectorAll('#templateTagStrip .template-tag-button')]
          .find((button) => button.dataset.templateTag === ${JSON.stringify(templateTag)});
        tagButton?.click();
      })()
    `,
  );
}

async function focusEditorSurface(client) {
  await evaluate(
    client,
    `
      (() => {
        const surface = document.querySelector('#templateEditorSurface');
        surface?.focus();
      })()
    `,
  );
}

async function setRuntimeHtml(client, html) {
  await evaluate(
    client,
    `
      (() => {
        window.ExamListTemplateEditorRuntime?.setHtml?.(${JSON.stringify(html)}, {
          resetHistory: false,
          notify: false
        });
        return true;
      })()
    `,
  );
}

module.exports = {
  clickTemplateTagButton,
  focusEditorSurface,
  setRuntimeHtml,
};
