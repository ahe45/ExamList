const { buildAbsoluteStyle, escapeHtml } = require("./element-helpers");
const { replaceTemplateTokens } = require("./tokens");

function renderTextElement(element, baseContext) {
  const style = element.config?.style || {};
  const content = replaceTemplateTokens(element.config?.content || "", baseContext);

  return `
    <div
      class="preview-element preview-text"
      style="${buildAbsoluteStyle(element, [
        `color:${escapeHtml(style.color || "#102445")}`,
        `font-family:${escapeHtml(style.fontFamily || "Malgun Gothic, sans-serif")}`,
        `font-size:${Number(style.fontSize) || 16}pt`,
        `font-weight:${Number(style.fontWeight) || 500}`,
        `line-height:${Number(style.lineHeight) || 1.5}`,
        `text-align:${escapeHtml(style.textAlign || "left")}`,
      ])}"
    >${escapeHtml(content)}</div>
  `;
}

module.exports = {
  renderTextElement,
};
