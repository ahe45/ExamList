function normalizePositiveNumber(value, fallback, minimum = 1, maximum = 100000) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, minimum), maximum);
}

function calculateRowsPerPage({
  headerHeight = 0,
  repeatHeader = true,
  rowHeight = 42,
  tableHeight = 0,
} = {}) {
  const normalizedTableHeight = normalizePositiveNumber(tableHeight, 0, 0);
  const normalizedRowHeight = normalizePositiveNumber(rowHeight, 42, 1);
  const normalizedHeaderHeight = repeatHeader
    ? normalizePositiveNumber(headerHeight, 0, 0)
    : 0;
  const availableHeight = normalizedTableHeight - normalizedHeaderHeight;

  if (availableHeight <= 0) {
    return 0;
  }

  return Math.max(Math.floor(availableHeight / normalizedRowHeight), 0);
}

function calculateTableBodyHeight({
  headerHeight = 0,
  repeatHeader = true,
  tableHeight = 0,
} = {}) {
  const normalizedTableHeight = normalizePositiveNumber(tableHeight, 0, 0);
  const normalizedHeaderHeight = repeatHeader
    ? normalizePositiveNumber(headerHeight, 0, 0)
    : 0;

  return Math.max(normalizedTableHeight - normalizedHeaderHeight, 0);
}

module.exports = {
  calculateRowsPerPage,
  calculateTableBodyHeight,
};
