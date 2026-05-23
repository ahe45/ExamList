const { renderPhotoCell } = require("./elements");
const { createCandidateBlockGridRenderer } = require("./candidate-block-grid-renderer");
const { replaceTemplateGeneratedObjectImagesInHtml } = require("./generated-objects");
const { normalizeDocumentSafeArea, formatPtValue } = require("./renderer-page-settings");
const {
  escapeHtml,
  renderDocumentImagePlaceholders,
  sanitizeDocumentHtml,
} = require("./renderer-html-utils");
const {
  evaluateTokenExpressionDetailed,
  replaceTemplateTokensInHtml,
  shouldStyleEmptyValueFallback,
} = require("./tokens");

function renderTemplateTokenSpanValue(tokenExpression, context) {
  const normalizedExpression = String(tokenExpression || "").trim();

  if (["candidate.photo", "candidate.photoUrl", "candidate.photoFileId"].includes(normalizedExpression)) {
    const photoUrl = String(context?.candidate?.photoUrl || "").trim();

    if (photoUrl) {
      return renderPhotoCell(context?.candidate);
    }

    const fallbackExpression = normalizedExpression === "candidate.photo"
      ? normalizedExpression
      : "candidate.photo";
    const result = evaluateTokenExpressionDetailed(fallbackExpression, context);

    if (result.usedEmptyValueFallback && String(result.value || "").trim()) {
      const fallbackClassName = shouldStyleEmptyValueFallback(context)
        ? "preview-empty-data-fallback preview-photo-empty-fallback"
        : "preview-photo-empty-fallback";

      return `<span class="${fallbackClassName}">${escapeHtml(result.value)}</span>`;
    }

    return renderPhotoCell(context?.candidate);
  }

  const result = evaluateTokenExpressionDetailed(normalizedExpression, context);
  const value = escapeHtml(result.value);

  return result.usedEmptyValueFallback && shouldStyleEmptyValueFallback(context)
    ? `<span class="preview-empty-data-fallback">${value}</span>`
    : value;
}

function stripHtmlAttribute(openingTag, attributeName) {
  const escapedAttributeName = String(attributeName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (!escapedAttributeName) {
    return openingTag;
  }

  return String(openingTag || "").replace(
    new RegExp(`\\s${escapedAttributeName}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, "gi"),
    "",
  );
}

function stripTemplateTokenClasses(openingTag) {
  return String(openingTag || "").replace(/\sclass\s*=\s*(["'])(.*?)\1/gi, (_match, quote, classValue) => {
    const classNames = String(classValue || "")
      .split(/\s+/)
      .filter((className) => className && !["template-token", "template-data-fit"].includes(className));

    return classNames.length ? ` class=${quote}${escapeHtml(classNames.join(" "))}${quote}` : "";
  });
}

function buildPreviewTokenOpeningTag(openingTag) {
  return ["data-template-tag-value", "data-template-token", "contenteditable", "spellcheck"].reduce(
    (nextOpeningTag, attributeName) => stripHtmlAttribute(nextOpeningTag, attributeName),
    stripTemplateTokenClasses(openingTag),
  ).replace(/\s+>/, ">");
}

function stripSvgMarkup(html) {
  return String(html || "").replace(/<svg\b[\s\S]*?<\/svg>/gi, "");
}

function hasMeaningfulHtmlText(text) {
  return String(text || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .trim()
    .length > 0;
}

function replaceTokenInnerTextWithMarkup(innerHtml, replacementMarkup) {
  const sourceHtml = stripSvgMarkup(innerHtml);

  if (!hasMeaningfulHtmlText(sourceHtml.replace(/<[^>]+>/g, ""))) {
    return replacementMarkup;
  }

  let result = "";
  let index = 0;
  let replaced = false;

  while (index < sourceHtml.length) {
    if (sourceHtml[index] === "<") {
      const tagEndIndex = sourceHtml.indexOf(">", index);

      if (tagEndIndex === -1) {
        result += sourceHtml.slice(index);
        break;
      }

      result += sourceHtml.slice(index, tagEndIndex + 1);
      index = tagEndIndex + 1;
      continue;
    }

    const nextTagIndex = sourceHtml.indexOf("<", index);
    const textEndIndex = nextTagIndex === -1 ? sourceHtml.length : nextTagIndex;
    const textSegment = sourceHtml.slice(index, textEndIndex);

    if (hasMeaningfulHtmlText(textSegment)) {
      if (!replaced) {
        result += replacementMarkup;
        replaced = true;
      }
    } else {
      result += textSegment;
    }

    index = textEndIndex;
  }

  return replaced ? result : replacementMarkup;
}

function findTemplateTokenSpanEnd(html, innerStartIndex) {
  const spanPattern = /<\/?span\b[^>]*>/gi;
  let depth = 1;

  spanPattern.lastIndex = innerStartIndex;

  for (let match = spanPattern.exec(html); match; match = spanPattern.exec(html)) {
    if (/^<\s*\/\s*span\b/i.test(match[0])) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return {
        closeEndIndex: spanPattern.lastIndex,
        closeStartIndex: match.index,
      };
    }
  }

  return null;
}

function renderTemplateTokenSpan(openingTag, tokenExpression, context, innerHtml = "") {
  const normalizedExpression = String(tokenExpression || "").trim();
  const isPhotoToken = ["candidate.photo", "candidate.photoUrl", "candidate.photoFileId"].includes(normalizedExpression);

  const replacementText = renderTemplateTokenSpanValue(normalizedExpression, context);

  if (!replacementText) {
    return "";
  }

  if (isPhotoToken) {
    return replacementText;
  }

  const replacementMarkup = `<span class="template-data-fit" data-template-data-fit="true">${replacementText}</span>`;
  return `${buildPreviewTokenOpeningTag(openingTag)}${replaceTokenInnerTextWithMarkup(innerHtml, replacementMarkup)}</span>`;
}

function replaceTemplateTokenSpansInHtml(text, context) {
  const sourceHtml = String(text || "");
  const tokenPattern = /<span\b[^>]*data-template-tag-value\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  let result = "";
  let lastIndex = 0;

  for (let match = tokenPattern.exec(sourceHtml); match; match = tokenPattern.exec(sourceHtml)) {
    const openingTag = match[0];
    const tokenExpression = match[2];
    const openingStartIndex = match.index;
    const innerStartIndex = tokenPattern.lastIndex;
    const spanEnd = findTemplateTokenSpanEnd(sourceHtml, innerStartIndex);

    if (!spanEnd) {
      break;
    }

    result += sourceHtml.slice(lastIndex, openingStartIndex);
    result += renderTemplateTokenSpan(
      openingTag,
      tokenExpression,
      context,
      sourceHtml.slice(innerStartIndex, spanEnd.closeStartIndex),
    );
    lastIndex = spanEnd.closeEndIndex;
    tokenPattern.lastIndex = spanEnd.closeEndIndex;
  }

  return result + sourceHtml.slice(lastIndex);
}

const { renderCandidateBlockGrid, replaceCandidateBlockGridMarkup } = createCandidateBlockGridRenderer({
  formatPtValue,
  renderDocumentImagePlaceholders,
  replaceTemplateTokenSpansInHtml,
  sanitizeDocumentHtml,
});

function renderDocumentPage(page, pageInstance, baseContext) {
  const sourceHtml = String(page?.settings?.documentHtml || "").trim();
  const isDocumentMode = String(page?.settings?.editorMode || "").trim() === "document";
  const candidateBlockGridHtml = renderCandidateBlockGrid(page, pageInstance, baseContext);

  if (!sourceHtml && !isDocumentMode && !candidateBlockGridHtml) {
    return "";
  }

  const sanitizedHtml = sanitizeDocumentHtml(sourceHtml);
  const renderedHtml = replaceCandidateBlockGridMarkup(renderDocumentImagePlaceholders(
    replaceTemplateTokensInHtml(
      replaceTemplateGeneratedObjectImagesInHtml(replaceTemplateTokenSpansInHtml(sanitizedHtml, baseContext), baseContext),
      baseContext,
    ),
  ), candidateBlockGridHtml);
  const safeArea = normalizeDocumentSafeArea(page);
  const paddingStyle = [
    formatPtValue(safeArea.top),
    formatPtValue(safeArea.right),
    formatPtValue(safeArea.bottom),
    formatPtValue(safeArea.left),
  ].join("pt ") + "pt";

  return `<div class="preview-document-body" style="padding: ${paddingStyle};">${renderedHtml}</div>`;
}

module.exports = {
  renderDocumentPage,
};
