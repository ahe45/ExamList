const { buildAbsoluteStyle, escapeHtml } = require("./element-helpers");

function renderPhotoCell(candidate) {
  const photoUrl = String(candidate?.photoUrl || "").trim();

  if (photoUrl) {
    return `
      <span class="preview-photo-fit-frame">
        <img class="preview-photo-image" src="${escapeHtml(photoUrl)}" alt="수험생 사진" />
      </span>
    `;
  }

  return `
    <span class="preview-photo-fit-frame preview-photo-placeholder">
      <strong>사진</strong>
      <small>이미지 없음</small>
    </span>
  `;
}

function resolveImageSource(element, baseContext) {
  if (element.type === "candidatePhoto") {
    return String(baseContext?.candidate?.photoUrl || "").trim();
  }

  return String(element.config?.src || "").trim();
}

function renderImagePlaceholder(placeholderText, title = "이미지") {
  return `
    <span class="preview-image-placeholder">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(placeholderText || "이미지 없음")}</small>
    </span>
  `;
}

function renderImageElement(element, baseContext) {
  const source = resolveImageSource(element, baseContext);
  const fit = String(element.config?.fit || "contain");
  const opacity = Number(element.config?.opacity);
  const borderRadius = Number(element.config?.borderRadius) || 0;
  const placeholderText = element.type === "candidatePhoto"
    ? String(element.config?.placeholderText || "사진 미등록")
    : String(element.config?.placeholderText || "이미지 없음");
  const alt = String(element.config?.alt || (element.type === "candidatePhoto" ? "수험생 사진" : "이미지"));

  return `
    <div
      class="preview-element preview-image-wrap ${element.type === "candidatePhoto" ? "preview-candidate-photo" : ""}"
      style="${buildAbsoluteStyle(element, [
        `border-radius:${borderRadius}pt`,
        `opacity:${Number.isFinite(opacity) ? opacity : 1}`,
      ])}"
    >
      ${
        source
          ? `<img class="preview-image" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" style="object-fit:${escapeHtml(fit)};border-radius:${borderRadius}pt;" />`
          : renderImagePlaceholder(placeholderText, element.type === "candidatePhoto" ? "수험생 사진" : "이미지")
      }
    </div>
  `;
}

module.exports = {
  renderImageElement,
  renderPhotoCell,
};
