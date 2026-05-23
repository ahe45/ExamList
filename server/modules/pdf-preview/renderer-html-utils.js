function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeDocumentHtml(html) {
  return String(html || "")
    .replace(
      /<\s*(script|style|iframe|object|embed|form|input|textarea|select|button|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*(script|style|iframe|object|embed|form|input|textarea|select|button|link|meta)\b[^>]*\/?\s*>/gi, "")
    .replace(/\son[a-z-]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son[a-z-]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(src|href)\s*=\s*(["'])(.*?)\2/gi, (_match, attributeName, quoteCharacter, attributeValue) => (
      /^(?:https?:|data:image\/|blob:|\/|\.\/|\.\.\/|#|{{)/i.test(String(attributeValue || "").trim())
        ? ` ${attributeName}=${quoteCharacter}${attributeValue}${quoteCharacter}`
        : ""
    ));
}

function stripHtmlTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function renderDocumentImagePlaceholders(html) {
  return String(html || "").replace(
    /<figure\b[^>]*data-image-src=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/figure>/gi,
    (_match, _quote, imageSource, content) => {
      const normalizedSource = String(imageSource || "").trim();
      const label = stripHtmlTags(content) || "이미지";

      if (!normalizedSource) {
        return `
          <figure class="preview-document-figure preview-document-figure-image placeholder">
            <span>${escapeHtml(label)}</span>
          </figure>
        `;
      }

      return `
        <figure class="preview-document-figure preview-document-figure-image">
          <img class="preview-document-image" src="${normalizedSource}" alt="${escapeHtml(label)}" />
        </figure>
      `;
    },
  );
}

module.exports = {
  escapeHtml,
  renderDocumentImagePlaceholders,
  sanitizeDocumentHtml,
  stripHtmlTags,
};
