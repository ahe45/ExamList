import { renderGridFilterMenu, renderGridFilterOptions, renderGridFilterSelectAll } from "../../app/data-grid-filter.js";
import { renderGridPagination } from "../../app/data-grid-pagination.js";
import { renderGridHeaderCell } from "../../app/data-grid-header.js";
import {
  filterPdfGenerationFilterOptionValues,
  getPdfGenerationFilterOptionValues,
  getPdfGenerationTableState,
  getPdfGenerationVisibleRows,
  pdfGenerationGridColumns,
  pdfGenerationPageSizeOptions,
} from "./pdf-generation-table-model.js";

export function renderPdfGenerationHeaderCell(column, pdfGenerations = {}) {
  return renderGridHeaderCell(column, getPdfGenerationTableState(pdfGenerations), "pdf-generation");
}

export function renderPdfGenerationFilterMenu(pdfGenerations = {}) {
  const tableState = getPdfGenerationTableState(pdfGenerations);
  const columnKey = String(tableState.filterMenuKey || "");
  const column = pdfGenerationGridColumns.find((item) => item.key === columnKey);

  if (!column || column.filterable === false) {
    return "";
  }

  const optionValues = getPdfGenerationFilterOptionValues(pdfGenerations, columnKey);
  const visibleOptionValues = filterPdfGenerationFilterOptionValues(optionValues, tableState.filterMenuSearch);
  return renderGridFilterMenu({ column, tableState, visibleOptionValues, namespace: "pdf-generation" });
}

export function renderPdfGenerationFilterSelectAll(columnKey = "", isAllVisibleSelected = false) {
  return renderGridFilterSelectAll(columnKey, isAllVisibleSelected, "pdf-generation");
}

export function renderPdfGenerationFilterOptions(columnKey = "", visibleOptionValues = [], selectedValues = new Set()) {
  return renderGridFilterOptions(columnKey, visibleOptionValues, selectedValues, "pdf-generation");
}

export function renderPdfGenerationPagination(pdfGenerations = {}) {
  return renderGridPagination({
    tableState: getPdfGenerationTableState(pdfGenerations),
    visibleRows: getPdfGenerationVisibleRows(pdfGenerations),
    pageSizeOptions: pdfGenerationPageSizeOptions,
    namespace: "pdf-generation",
  });
}
