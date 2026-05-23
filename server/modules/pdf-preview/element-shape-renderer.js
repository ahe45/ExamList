const { buildAbsoluteStyle, buildBoxDecoration, escapeHtml } = require("./element-helpers");

function getLineCoordinates(direction, width, height) {
  if (direction === "vertical") {
    return {
      x1: width / 2,
      x2: width / 2,
      y1: 0,
      y2: height,
    };
  }

  if (direction === "diagonal-down") {
    return {
      x1: 0,
      x2: width,
      y1: 0,
      y2: height,
    };
  }

  if (direction === "diagonal-up") {
    return {
      x1: 0,
      x2: width,
      y1: height,
      y2: 0,
    };
  }

  return {
    x1: 0,
    x2: width,
    y1: height / 2,
    y2: height / 2,
  };
}

function getLineDashArray(strokeStyle, strokeWidth) {
  if (strokeStyle === "dashed") {
    return `${Math.max(strokeWidth * 3, 4)} ${Math.max(strokeWidth * 2, 3)}`;
  }

  if (strokeStyle === "dotted") {
    return `${Math.max(strokeWidth, 1)} ${Math.max(strokeWidth * 2.4, 3)}`;
  }

  return "";
}

function renderLineElement(element) {
  const width = Math.max(Number(element.width) || 0, 1);
  const height = Math.max(Number(element.height) || 0, 1);
  const style = element.config?.style || {};
  const strokeWidth = Number(style.strokeWidth) || 1.5;
  const coordinates = getLineCoordinates(String(element.config?.direction || "horizontal"), width, height);
  const dashArray = getLineDashArray(String(style.strokeStyle || "solid"), strokeWidth);

  return `
    <div class="preview-element preview-line-wrap" style="${buildAbsoluteStyle(element)}">
      <svg class="preview-line-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line
          x1="${coordinates.x1}"
          y1="${coordinates.y1}"
          x2="${coordinates.x2}"
          y2="${coordinates.y2}"
          stroke="${escapeHtml(style.strokeColor || "#516585")}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          ${dashArray ? `stroke-dasharray="${dashArray}"` : ""}
        />
      </svg>
    </div>
  `;
}

function renderShapeElement(element) {
  const style = element.config?.style || {};
  const label = String(element.config?.label || "");
  const fallbackRadius = element.type === "ellipse" ? 999 : 8;

  return `
    <div
      class="preview-element preview-shape ${element.type === "ellipse" ? "preview-shape-ellipse" : "preview-shape-rect"}"
      style="${buildAbsoluteStyle(element, buildBoxDecoration(style, fallbackRadius))}"
    >
      ${label ? `<span class="preview-shape-label">${escapeHtml(label)}</span>` : ""}
    </div>
  `;
}

function renderCheckboxElement(element) {
  const style = element.config?.style || {};
  const checked = Boolean(element.config?.checked);
  const label = String(element.config?.label || "확인");
  const boxBorderWidth = Math.max(Number(style.borderWidth) || 1.2, 1);

  return `
    <div
      class="preview-element preview-checkbox-element"
      style="${buildAbsoluteStyle(element, [
        `color:${escapeHtml(style.color || "#102445")}`,
        `font-size:${Number(style.fontSize) || 12}pt`,
        `font-weight:${Number(style.fontWeight) || 600}`,
        `opacity:${Number.isFinite(Number(style.opacity)) ? Number(style.opacity) : 1}`,
      ])}"
    >
      <span
        class="preview-checkbox-box ${checked ? "checked" : ""}"
        style="
          background:${escapeHtml(style.backgroundColor || "transparent")};
          border:${boxBorderWidth}pt ${escapeHtml(style.borderStyle || "solid")} ${escapeHtml(style.borderColor || "#516585")};
        "
      >${checked ? "✓" : ""}</span>
      <span class="preview-checkbox-label">${escapeHtml(label)}</span>
    </div>
  `;
}

function renderSignatureBoxElement(element) {
  const style = element.config?.style || {};
  const label = String(element.config?.label || "");
  const placeholderText = String(element.config?.placeholderText || "서명란");

  return `
    <div
      class="preview-element preview-signature-box"
      style="${buildAbsoluteStyle(element, buildBoxDecoration(style, 8))}"
    >
      ${label ? `<span class="preview-signature-label">${escapeHtml(label)}</span>` : ""}
      <span class="preview-signature-placeholder">${escapeHtml(placeholderText)}</span>
    </div>
  `;
}

module.exports = {
  renderCheckboxElement,
  renderLineElement,
  renderShapeElement,
  renderSignatureBoxElement,
};
