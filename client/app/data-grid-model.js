export const gridPageSizeOptions = Object.freeze([10, 30, 50, 100, 500, 1000, 2000, 0]);

// Filtering and sorting are domain-specific; paging always uses their result.
export function getGridVisibleRows(rows = [], tableState = {}) {
  const pageSize = Math.max(0, Math.floor(Number(tableState.pageSize) || 0));
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = pageSize > 0 ? Math.min(Math.max(1, Math.floor(Number(tableState.page) || 1)), totalPages) : 1;
  const startIndex = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
  const visibleRows = pageSize > 0 ? rows.slice(startIndex, startIndex + pageSize) : rows;

  return {
    currentPage,
    endRowNumber: rows.length === 0 ? 0 : startIndex + visibleRows.length,
    rows,
    startRowNumber: rows.length === 0 ? 0 : startIndex + 1,
    totalPages,
    visibleRows,
  };
}
