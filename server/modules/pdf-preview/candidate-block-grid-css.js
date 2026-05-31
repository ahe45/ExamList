const cssPixelsPerPoint = 96 / 72;

function parseCssPixelLength(value) {
  const matchedLength = String(value || "").trim().match(/^(-?\d+(?:\.\d+)?)(px|pt)?$/i);

  if (!matchedLength) {
    return Number.NaN;
  }

  const numericValue = Number(matchedLength[1]);

  if (!Number.isFinite(numericValue)) {
    return Number.NaN;
  }

  return String(matchedLength[2] || "px").toLowerCase() === "pt"
    ? numericValue * cssPixelsPerPoint
    : numericValue;
}

function formatCssPixelLength(value) {
  const roundedValue = Math.round((Number(value) || 0) * 100) / 100;

  return `${Number.isInteger(roundedValue) ? roundedValue : roundedValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}px`;
}

function formatCssNumber(value) {
  const roundedValue = Math.round((Number(value) || 0) * 100) / 100;

  return Number.isInteger(roundedValue) ? String(roundedValue) : roundedValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function parseCssLengthParts(value) {
  const match = String(value || "").trim().match(/^(-?\d+(?:\.\d+)?)(px|pt)?$/i);

  if (!match) {
    return null;
  }

  const numericValue = Number(match[1]);

  return Number.isFinite(numericValue)
    ? {
        unit: match[2] || "px",
        value: numericValue,
      }
    : null;
}

function scaleCssLengthValue(value, scale) {
  const lengthParts = parseCssLengthParts(value);
  const safeScale = Number(scale);

  if (!lengthParts || !(safeScale > 0) || safeScale >= 1) {
    return value;
  }

  return `${formatCssNumber(Math.max(0, lengthParts.value * safeScale))}${lengthParts.unit}`;
}

function splitStyleDeclarations(styleValue = "") {
  return String(styleValue || "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(":");

      if (separatorIndex < 0) {
        return null;
      }

      return {
        name: declaration.slice(0, separatorIndex).trim(),
        value: declaration.slice(separatorIndex + 1).trim(),
      };
    })
    .filter(Boolean);
}

function replaceStyleAttributeValue(openingTag = "", nextStyleValue = "") {
  const styleMatch = String(openingTag || "").match(/\sstyle\s*=\s*(["'])(.*?)\1/i);

  if (!styleMatch) {
    return openingTag.replace(/\s*\/?>$/, (tagEnding) => ` style="${nextStyleValue}"${tagEnding}`);
  }

  return openingTag.replace(styleMatch[0], ` style=${styleMatch[1]}${nextStyleValue}${styleMatch[1]}`);
}

function getStyleAttributeValue(openingTag = "") {
  const match = String(openingTag || "").match(/\sstyle\s*=\s*(["'])(.*?)\1/i);

  return match ? match[2] : "";
}

function getStyleHeightPx(openingTag = "") {
  const styleValue = getStyleAttributeValue(openingTag);
  const heightMatch = styleValue.match(/(?:^|;)\s*height\s*:\s*([^;]+)/i);

  return heightMatch ? parseCssPixelLength(heightMatch[1]) : Number.NaN;
}

function getStyleWidthPx(openingTag = "") {
  const styleValue = getStyleAttributeValue(openingTag);
  const widthMatch = styleValue.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i);

  return widthMatch ? parseCssPixelLength(widthMatch[1]) : Number.NaN;
}

function replaceOrAppendStyleDeclaration(openingTag = "", propertyName = "", propertyValue = "") {
  const safePropertyName = String(propertyName || "").trim();
  const safePropertyValue = String(propertyValue || "").trim();

  if (!safePropertyName || !safePropertyValue) {
    return openingTag;
  }

  const styleMatch = String(openingTag || "").match(/\sstyle\s*=\s*(["'])(.*?)\1/i);

  if (!styleMatch) {
    return openingTag.replace(/\s*\/?>$/, (tagEnding) => ` style="${safePropertyName}: ${safePropertyValue};"${tagEnding}`);
  }

  const quote = styleMatch[1];
  const styleValue = styleMatch[2];
  const declarationPattern = new RegExp(`(^|;)\\s*${safePropertyName}\\s*:\\s*[^;]*`, "i");
  const nextStyleValue = declarationPattern.test(styleValue)
    ? styleValue.replace(declarationPattern, (_match, prefix) => `${prefix ? `${prefix} ` : ""}${safePropertyName}: ${safePropertyValue}`)
    : `${styleValue.replace(/\s*;?\s*$/, "")}; ${safePropertyName}: ${safePropertyValue}`;

  return openingTag.replace(styleMatch[0], ` style=${quote}${nextStyleValue}${quote}`);
}

function expandCssBoxShorthand(value = "") {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);

  if (!parts.length || parts.length > 4) {
    return null;
  }

  return {
    bottom: parts[2] || parts[0],
    left: parts[3] || parts[1] || parts[0],
    right: parts[1] || parts[0],
    top: parts[0],
  };
}

function getVerticalPaddingPx(styleValue = "") {
  let paddingTop = 0;
  let paddingBottom = 0;

  splitStyleDeclarations(styleValue).forEach(({ name, value }) => {
    const propertyName = name.toLowerCase();

    if (propertyName === "padding") {
      const expandedPadding = expandCssBoxShorthand(value);
      const top = parseCssPixelLength(expandedPadding?.top);
      const bottom = parseCssPixelLength(expandedPadding?.bottom);

      if (Number.isFinite(top)) {
        paddingTop = top;
      }

      if (Number.isFinite(bottom)) {
        paddingBottom = bottom;
      }
      return;
    }

    if (propertyName === "padding-top") {
      const nextPaddingTop = parseCssPixelLength(value);

      if (Number.isFinite(nextPaddingTop)) {
        paddingTop = nextPaddingTop;
      }
      return;
    }

    if (propertyName === "padding-bottom") {
      const nextPaddingBottom = parseCssPixelLength(value);

      if (Number.isFinite(nextPaddingBottom)) {
        paddingBottom = nextPaddingBottom;
      }
    }
  });

  return Math.max(0, paddingTop) + Math.max(0, paddingBottom);
}

function getHorizontalPaddingPx(styleValue = "") {
  let paddingLeft = 0;
  let paddingRight = 0;

  splitStyleDeclarations(styleValue).forEach(({ name, value }) => {
    const propertyName = name.toLowerCase();

    if (propertyName === "padding") {
      const expandedPadding = expandCssBoxShorthand(value);
      const left = parseCssPixelLength(expandedPadding?.left);
      const right = parseCssPixelLength(expandedPadding?.right);

      if (Number.isFinite(left)) {
        paddingLeft = left;
      }

      if (Number.isFinite(right)) {
        paddingRight = right;
      }
      return;
    }

    if (propertyName === "padding-left") {
      const nextPaddingLeft = parseCssPixelLength(value);

      if (Number.isFinite(nextPaddingLeft)) {
        paddingLeft = nextPaddingLeft;
      }
      return;
    }

    if (propertyName === "padding-right") {
      const nextPaddingRight = parseCssPixelLength(value);

      if (Number.isFinite(nextPaddingRight)) {
        paddingRight = nextPaddingRight;
      }
    }
  });

  return Math.max(0, paddingLeft) + Math.max(0, paddingRight);
}

function scaleVerticalPaddingDeclaration(value = "", scale = 1) {
  const expandedPadding = expandCssBoxShorthand(value);

  if (!expandedPadding) {
    return value;
  }

  const scaledTop = scaleCssLengthValue(expandedPadding.top, scale);
  const scaledBottom = scaleCssLengthValue(expandedPadding.bottom, scale);

  if (scaledTop === expandedPadding.top && scaledBottom === expandedPadding.bottom) {
    return value;
  }

  return [scaledTop, expandedPadding.right, scaledBottom, expandedPadding.left].join(" ");
}

function scaleCellVerticalPadding(cellOpeningTag = "", scale = 1) {
  const safeScale = Number(scale);

  if (!(safeScale > 0) || safeScale >= 1) {
    return cellOpeningTag;
  }

  const styleValue = getStyleAttributeValue(cellOpeningTag);

  if (!styleValue) {
    return cellOpeningTag;
  }

  let didScalePadding = false;
  const nextStyleValue = splitStyleDeclarations(styleValue)
    .map(({ name, value }) => {
      const propertyName = name.toLowerCase();

      if (propertyName === "padding") {
        const nextValue = scaleVerticalPaddingDeclaration(value, safeScale);

        didScalePadding = didScalePadding || nextValue !== value;
        return `${name}: ${nextValue}`;
      }

      if (propertyName === "padding-top" || propertyName === "padding-bottom") {
        const nextValue = scaleCssLengthValue(value, safeScale);

        didScalePadding = didScalePadding || nextValue !== value;
        return `${name}: ${nextValue}`;
      }

      return `${name}: ${value}`;
    })
    .join("; ");

  return didScalePadding ? replaceStyleAttributeValue(cellOpeningTag, nextStyleValue) : cellOpeningTag;
}

module.exports = {
  cssPixelsPerPoint,
  formatCssNumber,
  formatCssPixelLength,
  getHorizontalPaddingPx,
  getStyleAttributeValue,
  getStyleHeightPx,
  getStyleWidthPx,
  getVerticalPaddingPx,
  parseCssPixelLength,
  replaceOrAppendStyleDeclaration,
  scaleCellVerticalPadding,
  splitStyleDeclarations,
};
