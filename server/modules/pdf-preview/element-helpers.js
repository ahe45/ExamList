const { escapeHtml } = require("./token-formatters");

function isCoverPage(page) {
  return String(page?.type || "").trim() === "cover";
}

function buildAbsoluteStyle(element, additionalRules = []) {
  return [
    `left:${Number(element.x) || 0}pt`,
    `top:${Number(element.y) || 0}pt`,
    `width:${Math.max(Number(element.width) || 0, 0)}pt`,
    `height:${Math.max(Number(element.height) || 0, 0)}pt`,
    `z-index:${Number(element.zIndex) || 0}`,
    ...additionalRules.filter(Boolean),
  ].join(";");
}

function buildBoxDecoration(style = {}, fallbackRadius = 0) {
  return [
    `background:${escapeHtml(style.backgroundColor || "transparent")}`,
    `border:${Number(style.borderWidth) || 1}pt ${escapeHtml(style.borderStyle || "solid")} ${escapeHtml(style.borderColor || "#516585")}`,
    `border-radius:${Number(style.radius) || fallbackRadius}pt`,
    `color:${escapeHtml(style.color || "#102445")}`,
    `font-size:${Number(style.fontSize) || 12}pt`,
    `font-weight:${Number(style.fontWeight) || 600}`,
    `opacity:${Number.isFinite(Number(style.opacity)) ? Number(style.opacity) : 1}`,
    `text-align:${escapeHtml(style.textAlign || "center")}`,
  ];
}

module.exports = {
  buildAbsoluteStyle,
  buildBoxDecoration,
  escapeHtml,
  isCoverPage,
};
