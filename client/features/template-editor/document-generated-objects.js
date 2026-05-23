import { escapeHtml } from "../../app/html-utils.js";
import {
  buildGeneratedObjectSvg,
  createGeneratedObjectSvgDataUrl,
  generatedObjectDefaults,
  resolveGeneratedObjectType,
} from "./generated-objects-adapter.js";

const defaultGeneratedObjectPreviewValue = "123100001";

function getDocumentGeneratedObjectConfig(objectType) {
  const resolvedType = resolveGeneratedObjectType(objectType);

  if (!resolvedType) {
    return null;
  }

  return {
    ...generatedObjectDefaults[resolvedType],
    type: resolvedType,
  };
}

export function decorateDocumentGeneratedObjectImage(imageElement) {
  if (!(imageElement instanceof HTMLImageElement)) {
    return false;
  }

  const objectConfig = getDocumentGeneratedObjectConfig(imageElement.dataset.templateObjectType || "");

  imageElement.classList.remove("template-generated-object", "template-generated-object-barcode", "template-generated-object-qrcode");

  if (!objectConfig) {
    imageElement.removeAttribute("data-template-object-source");
    return false;
  }

  imageElement.classList.add("template-generated-object", objectConfig.className);
  imageElement.dataset.templateObjectType = objectConfig.type;
  imageElement.dataset.templateObjectSource = String(imageElement.dataset.templateObjectSource || "candidate.examNo").trim() || "candidate.examNo";

  if (!String(imageElement.alt || "").trim()) {
    imageElement.alt = `${defaultGeneratedObjectPreviewValue} ${objectConfig.altSuffix}`;
  }

  if (!String(imageElement.title || "").trim()) {
    imageElement.title = objectConfig.label;
  }

  if (!String(imageElement.style.width || "").trim() && !imageElement.getAttribute("width")) {
    imageElement.style.width = `${objectConfig.width}px`;
  }

  if (!String(imageElement.style.height || "").trim() && !imageElement.getAttribute("height")) {
    imageElement.style.height = `${objectConfig.height}px`;
  }

  if (!String(imageElement.getAttribute("src") || "").trim()) {
    imageElement.src = createGeneratedObjectSvgDataUrl(buildGeneratedObjectSvg(objectConfig.type, defaultGeneratedObjectPreviewValue));
  }

  return true;
}

export function buildDocumentGeneratedObjectHtml(objectType, objectSource = "candidate.examNo") {
  const objectConfig = getDocumentGeneratedObjectConfig(objectType) || getDocumentGeneratedObjectConfig("barcode");
  const sourceUrl = createGeneratedObjectSvgDataUrl(buildGeneratedObjectSvg(objectConfig.type, defaultGeneratedObjectPreviewValue));

  return `
    <img
      class="template-generated-object ${objectConfig.className}"
      data-template-object-type="${escapeHtml(objectConfig.type)}"
      data-template-object-source="${escapeHtml(objectSource)}"
      src="${escapeHtml(sourceUrl)}"
      alt="${escapeHtml(objectConfig.label)}"
      title="${escapeHtml(objectConfig.label)}"
      style="width:${objectConfig.width}px;height:${objectConfig.height}px;"
    />
  `;
}
