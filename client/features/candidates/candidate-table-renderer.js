import { hasAccess } from "../../app/access.js";
import { candidateGridColumns } from "./candidate-table-model.js";
import { renderCandidateRows } from "./candidate-table-body-renderer.js";
import { renderFilterMenu } from "./candidate-filter-menu-renderer.js";
import { renderCandidatePagination } from "./candidate-table-pagination-renderer.js";
import {
  renderTableHeaderCell,
  renderUploadHeaderAction,
} from "./candidate-table-header-renderer.js";

export function renderCandidateTable({ access, candidates }) {
  const canManageCandidates = hasAccess(access, "manageCandidates");

  return `
    <article class="table-card result-grid-card candidate-data-table candidate-records-table candidate-registration-table">
      <div class="section-header">
        <div class="menu-section-copy">
          <h3>수험생 데이터</h3>
          <p>업로드된 수험생 데이터를 확인하고, 개별 정보를 수정하거나 사진을 보완합니다.</p>
        </div>
        ${renderUploadHeaderAction(canManageCandidates)}
      </div>
      ${
        candidates.loading
          ? `<p class="helper-text">수험생 데이터를 불러오는 중입니다.</p>`
          : `
            <div class="table-wrap candidate-table-wrap" data-candidate-table-scroll>
              <table class="data-table candidate-grid-table">
                <thead>
                  <tr>
                    <th class="row-number-col">순번</th>
                    ${candidateGridColumns.map((column) => renderTableHeaderCell(column, candidates)).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${renderCandidateRows(candidates, canManageCandidates)}
                </tbody>
              </table>
            </div>
            ${renderCandidatePagination(candidates)}
          `
      }
    </article>
    ${renderFilterMenu(candidates)}
  `;
}
