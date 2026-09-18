import { renderGridFilterMenu, renderGridFilterOptions, renderGridFilterSelectAll } from "../../app/data-grid-filter.js";
import { renderGridPagination } from "../../app/data-grid-pagination.js";
import { renderGridHeaderCell } from "../../app/data-grid-header.js";
import {
  filterPdfGenerationArtifactFilterOptionValues,
  getPdfGenerationArtifactFilterOptionValues,
  getPdfGenerationArtifactTableState,
  getPdfGenerationArtifactVisibleRows,
  pdfGenerationArtifactGridColumns,
  pdfGenerationArtifactPageSizeOptions,
} from "./pdf-generation-artifact-table-model.js";

export function renderPdfGenerationArtifactHeaderCell(column, pdfGenerations = {}) {
  return renderGridHeaderCell(column, getPdfGenerationArtifactTableState(pdfGenerations), "pdf-generation-artifact");
}

export function renderPdfGenerationArtifactFilterSelectAll(columnKey = "", isAllVisibleSelected = false) {
  return renderGridFilterSelectAll(columnKey, isAllVisibleSelected, "pdf-generation-artifact");
}

export function renderPdfGenerationArtifactFilterOptions(columnKey = "", visibleOptionValues = [], selectedValues = new Set()) {
  return renderGridFilterOptions(columnKey, visibleOptionValues, selectedValues, "pdf-generation-artifact");
}

export function renderPdfGenerationArtifactFilterMenu(pdfGenerations = {}) {
  const tableState = getPdfGenerationArtifactTableState(pdfGenerations);
  const columnKey = String(tableState.filterMenuKey || "");
  const column = pdfGenerationArtifactGridColumns.find((item) => item.key === columnKey);

  if (!column || column.filterable === false) {
    return "";
  }

  const optionValues = getPdfGenerationArtifactFilterOptionValues(pdfGenerations, columnKey);
  const visibleOptionValues = filterPdfGenerationArtifactFilterOptionValues(optionValues, tableState.filterMenuSearch);
  return renderGridFilterMenu({ column, tableState, visibleOptionValues, namespace: "pdf-generation-artifact" });
}

export function renderPdfGenerationArtifactPagination(pdfGenerations = {}) {
  return renderGridPagination({
    tableState: getPdfGenerationArtifactTableState(pdfGenerations),
    visibleRows: getPdfGenerationArtifactVisibleRows(pdfGenerations),
    pageSizeOptions: pdfGenerationArtifactPageSizeOptions,
    namespace: "pdf-generation-artifact",
  });
}
