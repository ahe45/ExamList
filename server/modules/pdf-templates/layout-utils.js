function normalizeOption(value, supportedValues, fallback) {
  const normalizedValue = String(value || "").trim();

  return supportedValues.includes(normalizedValue) ? normalizedValue : fallback;
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (["true", "1", "yes"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

function normalizeFiniteNumber(value, fallback, minimum = 0, maximum = 100000) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function normalizeMargin(margin, fallbackMargin) {
  const baseMargin = margin && typeof margin === "object" ? margin : {};

  return {
    top: normalizeFiniteNumber(baseMargin.top, fallbackMargin.top, 0),
    right: normalizeFiniteNumber(baseMargin.right, fallbackMargin.right, 0),
    bottom: normalizeFiniteNumber(baseMargin.bottom, fallbackMargin.bottom, 0),
    left: normalizeFiniteNumber(baseMargin.left, fallbackMargin.left, 0),
  };
}

module.exports = {
  normalizeBoolean,
  normalizeFiniteNumber,
  normalizeMargin,
  normalizeOption,
};
