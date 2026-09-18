import { renderGridHeaderCell } from "../../app/data-grid-header.js";
import { escapeHtml } from "../../app/html-utils.js";
import {
  getCandidateTableState,
} from "./candidate-table-model.js";

export function renderUploadHeaderAction(hasCandidateManagement, canManageCandidates = hasCandidateManagement) {
  return `
    <div class="table-header-actions">
      <button class="outline-button" data-action="download-candidates" type="button">다운로드</button>
      ${
        hasCandidateManagement
          ? `<button class="primary-button" data-action="open-candidate-upload-modal" type="button" ${canManageCandidates ? "" : "disabled"}>데이터 업로드</button>`
          : ""
      }
    </div>
  `;
}

export function renderTableHeaderCell(column, candidates = {}) {
  return renderGridHeaderCell(column, getCandidateTableState(candidates), "candidate");
}
