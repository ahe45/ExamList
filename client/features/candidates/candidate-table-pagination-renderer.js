import { renderGridPagination } from "../../app/data-grid-pagination.js";
import { getCandidateTableState, getCandidateVisibleRows, pageSizeOptions } from "./candidate-table-model.js";

export function renderCandidatePagination(candidates = {}) {
  return renderGridPagination({
    tableState: getCandidateTableState(candidates),
    visibleRows: getCandidateVisibleRows(candidates),
    pageSizeOptions,
    namespace: "candidate",
  });
}
