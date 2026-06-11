const allowedTags = new Set([
  "b",
  "blockquote",
  "br",
  "col",
  "colgroup",
  "div",
  "em",
  "figcaption",
  "figure",
  "font",
  "h1",
  "h2",
  "h3",
  "hr",
  "img",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "path",
  "svg",
]);

const allowedStyleProperties = new Set([
  "background-color",
  "border",
  "border-bottom",
  "border-collapse",
  "border-color",
  "border-left",
  "border-radius",
  "border-right",
  "border-spacing",
  "border-style",
  "border-top",
  "border-width",
  "color",
  "display",
  "font-size",
  "font-style",
  "font-weight",
  "gap",
  "grid-area",
  "grid-column",
  "grid-template-columns",
  "grid-template-rows",
  "grid-row",
  "height",
  "left",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "object-fit",
  "object-position",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "position",
  "column-gap",
  "row-gap",
  "table-layout",
  "text-align",
  "text-decoration",
  "top",
  "vertical-align",
  "width",
  "z-index",
]);

const blockedTags = new Set([
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "style",
  "textarea",
]);

const allowedDataAttributes = new Set([
  "data-candidate-block-columns",
  "data-candidate-block-column-name",
  "data-candidate-block-column-name-row-enabled",
  "data-candidate-block-column-name-row-height-pt",
  "data-candidate-block-gap-xpt",
  "data-candidate-block-gap-ypt",
  "data-candidate-block-grid",
  "data-candidate-block-grid-column",
  "data-candidate-block-grid-move-handle",
  "data-candidate-block-grid-row",
  "data-candidate-block-grid-resize-corner",
  "data-candidate-block-grid-resize-handle",
  "data-candidate-block-instance",
  "data-candidate-block-object",
  "data-candidate-block-rows",
  "data-candidate-block-table",
  "data-candidate-block-template-role",
  "data-candidate-block-variant",
  "data-template-page-height-px",
  "data-template-page-margin-bottom",
  "data-template-page-margin-left",
  "data-template-page-margin-right",
  "data-template-page-margin-top",
  "data-template-page-orientation",
  "data-template-page-size",
  "data-template-page-width-px",
  "data-template-cell-only-row-layout",
  "data-template-tag-example",
  "data-template-tag-format",
  "data-template-tag-format-type",
]);

function sanitizeStyleValue(styleValue) {
  return String(styleValue || "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(":");

      if (separatorIndex === -1) {
        return "";
      }

      const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
      const value = declaration.slice(separatorIndex + 1).trim();

      if (!allowedStyleProperties.has(property) || !value) {
        return "";
      }

      if (/expression\s*\(|javascript:/i.test(value)) {
        return "";
      }

      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

function isSafeImageSource(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return true;
  }

  if (/{{[^}]+}}/.test(normalizedValue)) {
    return true;
  }

  return /^(?:https?:|data:image\/|blob:|\/|\.\/|\.\.\/|#)/i.test(normalizedValue);
}

function sanitizeElementAttributes(element) {
  const tagName = element.tagName.toLowerCase();

  Array.from(element.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = String(attribute.value || "");

    if (attributeName.startsWith("on")) {
      element.removeAttribute(attribute.name);
      return;
    }

    if (attributeName === "style") {
      const safeStyleValue = sanitizeStyleValue(attributeValue);

      if (safeStyleValue) {
        element.setAttribute(attribute.name, safeStyleValue);
      } else {
        element.removeAttribute(attribute.name);
      }
      return;
    }

    if (attributeName === "class") {
      const safeClassName = attributeValue
        .split(/\s+/)
        .map((className) => className.trim())
        .filter((className) => /^[a-z0-9_-]+$/i.test(className))
        .join(" ");

      if (safeClassName) {
        element.setAttribute(attribute.name, safeClassName);
      } else {
        element.removeAttribute(attribute.name);
      }
      return;
    }

    if (attributeName === "id") {
      if (/^[A-Za-z][A-Za-z0-9_.:-]*$/.test(attributeValue)) {
        return;
      }

      element.removeAttribute(attribute.name);
      return;
    }

    if (attributeName === "data-image-src") {
      if (!isSafeImageSource(attributeValue)) {
        element.removeAttribute(attribute.name);
      }
      return;
    }

    if (attributeName === "data-template-object-source") {
      return;
    }

    if (attributeName === "data-template-object-type") {
      return;
    }

    if (attributeName === "data-template-tag-value") {
      return;
    }

    if (attributeName === "data-template-tag-label") {
      return;
    }

    if (attributeName === "data-template-token") {
      return;
    }

    if (allowedDataAttributes.has(attributeName)) {
      return;
    }

    if (attributeName === "contenteditable" && String(attributeValue || "").trim().toLowerCase() === "false") {
      return;
    }

    if (tagName === "svg" && ["aria-hidden", "viewbox"].includes(attributeName)) {
      return;
    }

    if (tagName === "path" && attributeName === "d") {
      return;
    }

    if (attributeName === "src") {
      if (!isSafeImageSource(attributeValue)) {
        element.removeAttribute(attribute.name);
      }
      return;
    }

    if (["align", "alt", "colspan", "height", "rowspan", "title", "width"].includes(attributeName)) {
      return;
    }

    element.removeAttribute(attribute.name);
  });
}

export function sanitizeNodeTree(rootNode) {
  Array.from(rootNode.childNodes).forEach((childNode) => {
    if (childNode.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (childNode.nodeType !== Node.ELEMENT_NODE) {
      childNode.remove();
      return;
    }

    const tagName = childNode.tagName.toLowerCase();

    if (blockedTags.has(tagName)) {
      childNode.remove();
      return;
    }

    sanitizeNodeTree(childNode);

    if (!allowedTags.has(tagName)) {
      childNode.replaceWith(...Array.from(childNode.childNodes));
      return;
    }

    sanitizeElementAttributes(childNode);
  });
}

export function normalizeDocumentFontNodes(rootNode) {
  if (!rootNode?.querySelectorAll) {
    return;
  }

  rootNode.querySelectorAll("font").forEach((fontElement) => {
    const replacement = document.createElement("span");

    if (fontElement.hasAttribute("face")) {
      replacement.style.fontFamily = fontElement.getAttribute("face") || "";
    }

    if (fontElement.hasAttribute("color")) {
      replacement.style.color = fontElement.getAttribute("color") || "";
    }

    replacement.innerHTML = fontElement.innerHTML;
    fontElement.replaceWith(replacement);
  });
}

export function stripTransientDocumentState(rootElement) {
  if (!rootElement?.querySelectorAll) {
    return;
  }

  rootElement
    .querySelectorAll("[data-template-object-flow-spacer]")
    .forEach((element) => element.remove());

  rootElement
    .querySelectorAll("[data-template-object-flow-id]")
    .forEach((element) => element.removeAttribute("data-template-object-flow-id"));

  rootElement
    .querySelectorAll(
      ".template-editor-image-selection, .template-editor-image-resize-handle, .examlist-object-selection, .examlist-object-resize-handle, .template-editor-table-selection, .template-editor-table-handle, .template-editor-table-move-handle, .template-editor-table-select-handle",
    )
    .forEach((element) => element.remove());

  const transientClassNames = [
    "template-editor-image-object",
    "is-selected-object",
    "is-moving-object",
    "is-floating-object",
    "is-active-cell",
    "is-selected-cell",
  ];
  const transientSelector = transientClassNames.map((className) => `.${className}`).join(", ");

  rootElement.querySelectorAll(transientSelector).forEach((element) => {
    transientClassNames.forEach((className) => element.classList.remove(className));

    if (!String(element.className || "").trim()) {
      element.removeAttribute("class");
    }
  });

  rootElement.querySelectorAll("img[draggable]").forEach((imageElement) => {
    imageElement.removeAttribute("draggable");
  });

  rootElement.querySelectorAll("img[contenteditable]").forEach((imageElement) => {
    imageElement.removeAttribute("contenteditable");
  });
}
