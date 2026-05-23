function normalizeDateForDb(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const sourceValue = String(value || "").trim();
  const matchedDate = sourceValue.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);

  if (!matchedDate) {
    return null;
  }

  return `${matchedDate[1]}-${matchedDate[2].padStart(2, "0")}-${matchedDate[3].padStart(2, "0")}`;
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalizedDate = normalizeDateForDb(value);

  return normalizedDate || String(value || "").trim();
}

module.exports = {
  formatDateValue,
  normalizeDateForDb,
};
