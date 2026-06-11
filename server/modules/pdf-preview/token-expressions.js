const {
  escapeHtml,
  formatDatePattern,
  formatNumberValue,
  formatPhoneValue,
  formatTimePattern,
  maskTemplateValue,
  normalizeDisplayValue,
} = require("./token-formatters");

const otherRoomTokenKey = "room.otherRoom";

function shouldSuppressTokenForContext(context, key) {
  return String(key || "").trim() === otherRoomTokenKey && context?.__isOtherRoomPage !== true;
}

function resolveDataPath(context, key) {
  const normalizedKey = String(key || "").trim();

  if (!normalizedKey) {
    return "";
  }

  if (shouldSuppressTokenForContext(context, normalizedKey)) {
    return "";
  }

  if (
    context &&
    context.__sampleData &&
    typeof context.__sampleData === "object" &&
    Object.prototype.hasOwnProperty.call(context.__sampleData, normalizedKey)
  ) {
    return context.__sampleData[normalizedKey];
  }

  return normalizedKey.split(".").reduce((currentValue, segment) => {
    if (currentValue && typeof currentValue === "object" && segment in currentValue) {
      return currentValue[segment];
    }

    return "";
  }, context);
}

function splitTokenPipeline(expression) {
  const parts = [];
  let buffer = "";
  let quoteChar = "";

  for (const char of String(expression || "")) {
    if ((char === '"' || char === "'") && !quoteChar) {
      quoteChar = char;
      buffer += char;
      continue;
    }

    if (char === quoteChar) {
      quoteChar = "";
      buffer += char;
      continue;
    }

    if (char === "|" && !quoteChar) {
      parts.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += char;
  }

  if (buffer.trim()) {
    parts.push(buffer.trim());
  }

  return parts;
}

function parseFilterPart(filterPart) {
  const [rawName, ...rawArgs] = String(filterPart || "").split(":");
  const argument = rawArgs.join(":").trim();
  const matchedQuotedArgument = argument.match(/^["'](.*)["']$/);

  return {
    argument: matchedQuotedArgument ? matchedQuotedArgument[1] : argument,
    name: String(rawName || "").trim(),
  };
}

function isEmptyTemplateValue(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function hasEmptyValueData(context, key) {
  const normalizedKey = String(key || "").trim();

  if (shouldSuppressTokenForContext(context, normalizedKey)) {
    return false;
  }

  return Boolean(
    normalizedKey &&
      context &&
      context.__emptyValueData &&
      typeof context.__emptyValueData === "object" &&
      Object.prototype.hasOwnProperty.call(context.__emptyValueData, normalizedKey),
  );
}

function resolveEmptyValueData(context, key) {
  if (hasEmptyValueData(context, key)) {
    return context.__emptyValueData[String(key || "").trim()];
  }

  return "";
}

function resolveDataPathWithoutSampleData(context, key) {
  const normalizedKey = String(key || "").trim();

  if (!normalizedKey) {
    return "";
  }

  if (shouldSuppressTokenForContext(context, normalizedKey)) {
    return "";
  }

  return normalizedKey.split(".").reduce((currentValue, segment) => {
    if (currentValue && typeof currentValue === "object" && segment in currentValue) {
      return currentValue[segment];
    }

    return "";
  }, context);
}

function shouldUseSampleFallbackForEmptyDataTags(context) {
  return context?.__sampleFallbackForEmptyDataTags === true;
}

function shouldStyleEmptyValueFallback(context) {
  return context?.__styleEmptyValueFallback !== false;
}

function applyTokenFilter(value, filter) {
  switch (filter.name) {
    case "date":
      return formatDatePattern(value, filter.argument || "YYYY.MM.DD");
    case "default":
    case "defaultImage":
      return isEmptyTemplateValue(value) ? filter.argument : value;
    case "mask":
      return maskTemplateValue(value, filter.argument);
    case "number":
      return formatNumberValue(value);
    case "phone":
      return formatPhoneValue(value);
    case "time":
      return formatTimePattern(value, filter.argument || "HH:mm");
    default:
      return value;
  }
}

function evaluateTokenExpression(expression, context) {
  return evaluateTokenExpressionDetailed(expression, context).value;
}

function evaluateTokenExpressionDetailed(expression, context) {
  const [pathExpression, ...filterParts] = splitTokenPipeline(expression);
  let value = shouldUseSampleFallbackForEmptyDataTags(context)
    ? resolveDataPathWithoutSampleData(context, pathExpression)
    : resolveDataPath(context, pathExpression);
  let usedEmptyValueFallback = false;

  if (shouldUseSampleFallbackForEmptyDataTags(context) && isEmptyTemplateValue(value)) {
    const emptyValue = resolveEmptyValueData(context, pathExpression);

    if (!isEmptyTemplateValue(emptyValue)) {
      value = emptyValue;
      usedEmptyValueFallback = true;
    }
  }

  filterParts.forEach((filterPart) => {
    value = applyTokenFilter(value, parseFilterPart(filterPart));
  });

  return {
    usedEmptyValueFallback,
    value: filterParts.length ? String(value ?? "") : normalizeDisplayValue(value),
  };
}

function isTruthyTemplateValue(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return !isEmptyTemplateValue(value);
}

function renderConditionalBlocks(text, context) {
  let renderedText = String(text || "");
  const conditionalPattern = /{{#if\s+([^}]+?)\s*}}([\s\S]*?)(?:{{else}}([\s\S]*?))?{{\/if}}/g;
  let previousText = "";

  while (previousText !== renderedText) {
    previousText = renderedText;
    renderedText = renderedText.replace(conditionalPattern, (_match, conditionExpression, truthyContent, falsyContent = "") => {
      const conditionValue = evaluateTokenExpression(conditionExpression, context);

      return isTruthyTemplateValue(conditionValue) ? truthyContent : falsyContent;
    });
  }

  return renderedText;
}

function replaceTemplateTokens(text, context) {
  return renderConditionalBlocks(text, context).replace(/{{\s*([^#/][^}]*?)\s*}}/g, (_match, tokenExpression) =>
    evaluateTokenExpression(tokenExpression, context),
  );
}

function replaceTemplateTokensInHtml(text, context) {
  return renderConditionalBlocks(text, context).replace(/{{\s*([^#/][^}]*?)\s*}}/g, (_match, tokenExpression) => {
    const result = evaluateTokenExpressionDetailed(tokenExpression, context);
    const value = escapeHtml(result.value);

    return result.usedEmptyValueFallback && shouldStyleEmptyValueFallback(context)
      ? `<span class="preview-empty-data-fallback">${value}</span>`
      : value;
  });
}

module.exports = {
  applyTokenFilter,
  evaluateTokenExpression,
  evaluateTokenExpressionDetailed,
  isEmptyTemplateValue,
  parseFilterPart,
  replaceTemplateTokens,
  replaceTemplateTokensInHtml,
  resolveEmptyValueData,
  resolveDataPath,
  resolveDataPathWithoutSampleData,
  shouldStyleEmptyValueFallback,
  splitTokenPipeline,
};
