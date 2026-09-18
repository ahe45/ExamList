import { renderGridFilterMenu, renderGridFilterOptions, renderGridFilterSelectAll } from "../../app/data-grid-filter.js";
import {
  candidateGridColumns,
  filterCandidateFilterOptionValues,
  getCandidateFilterOptionValues,
  getCandidateTableState,
} from "./candidate-table-model.js";

export function renderFilterMenu(candidates = {}) {
  const tableState = getCandidateTableState(candidates);
  const columnKey = String(tableState.filterMenuKey || "");
  const column = candidateGridColumns.find((item) => item.key === columnKey);

  if (!column) {
    return "";
  }

  const optionValues = getCandidateFilterOptionValues(candidates, columnKey);
  const visibleOptionValues = filterCandidateFilterOptionValues(optionValues, tableState.filterMenuSearch);
  return renderGridFilterMenu({ column, tableState, visibleOptionValues, namespace: "candidate" });
}

export function renderCandidateFilterSelectAll(columnKey = "", isAllVisibleSelected = false) {
  return renderGridFilterSelectAll(columnKey, isAllVisibleSelected, "candidate");
}

export function renderCandidateFilterOptions(columnKey = "", visibleOptionValues = [], selectedValues = new Set()) {
  return renderGridFilterOptions(columnKey, visibleOptionValues, selectedValues, "candidate");
}
