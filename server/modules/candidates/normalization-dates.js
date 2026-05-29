function normalizeDateForDb(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const sourceValue = String(value || "").trim();
  return sourceValue || null;
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value || "").trim();
}

module.exports = {
  formatDateValue,
  normalizeDateForDb,
};
