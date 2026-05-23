const { randomUUID } = require("crypto");

const { normalizeElementConfig, supportedElementTypes } = require("./layout-element-config");
const { normalizeBoolean, normalizeFiniteNumber } = require("./layout-utils");

const elementDefaultSizeMap = Object.freeze({
  candidatePhoto: Object.freeze({ width: 96, height: 128, minimumHeight: 48, minimumWidth: 48 }),
  checkbox: Object.freeze({ width: 88, height: 28, minimumHeight: 24, minimumWidth: 40 }),
  ellipse: Object.freeze({ width: 120, height: 72, minimumHeight: 24, minimumWidth: 24 }),
  image: Object.freeze({ width: 140, height: 120, minimumHeight: 40, minimumWidth: 40 }),
  line: Object.freeze({ width: 180, height: 8, minimumHeight: 2, minimumWidth: 24 }),
  pageNumber: Object.freeze({ width: 100, height: 28, minimumHeight: 24, minimumWidth: 48 }),
  rect: Object.freeze({ width: 160, height: 96, minimumHeight: 24, minimumWidth: 24 }),
  signatureBox: Object.freeze({ width: 180, height: 72, minimumHeight: 36, minimumWidth: 60 }),
  table: Object.freeze({ width: 420, height: 320, minimumHeight: 48, minimumWidth: 120 }),
  text: Object.freeze({ width: 160, height: 48, minimumHeight: 24, minimumWidth: 40 }),
});

function normalizeLayoutElement(element, index, pageId) {
  const normalizedType = supportedElementTypes.includes(String(element?.type || "").trim())
    ? String(element.type).trim()
    : "text";
  const elementSizeConfig = elementDefaultSizeMap[normalizedType] || elementDefaultSizeMap.text;
  const normalizedWidth = normalizeFiniteNumber(
    element?.width,
    elementSizeConfig.width,
    elementSizeConfig.minimumWidth,
  );
  const normalizedHeight = normalizeFiniteNumber(
    element?.height,
    elementSizeConfig.height,
    elementSizeConfig.minimumHeight,
  );

  return {
    config: normalizeElementConfig(normalizedType, {
      ...(element?.config && typeof element.config === "object" ? element.config : {}),
      ...(normalizedType === "table"
        ? {
            tableHeight: normalizedHeight,
          }
        : {}),
    }),
    height: normalizedHeight,
    id: String(element?.id || `element-${randomUUID()}`),
    locked: normalizeBoolean(element?.locked, false),
    name: String(element?.name || `${normalizedType}-${index + 1}`),
    pageId,
    type: normalizedType,
    visible: normalizeBoolean(element?.visible, true),
    width: normalizedWidth,
    x: normalizeFiniteNumber(element?.x, 40, 0),
    y: normalizeFiniteNumber(element?.y, 40 + index * 12, 0),
    zIndex: normalizeFiniteNumber(element?.zIndex, (index + 1) * 10, 0, 100000),
  };
}

module.exports = {
  elementDefaultSizeMap,
  normalizeLayoutElement,
};
