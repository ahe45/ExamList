import { renderCandidateDetailModal } from "./candidate-detail-renderer.js";
import { renderCandidateDownloadConfirmModal } from "./candidate-download-confirm-renderer.js";
import { renderCandidateTable } from "./candidate-table-renderer.js";
import { renderCandidateUploadModal, renderCandidateUploadProgressOverlay } from "./candidate-upload-renderer.js";

export {
  filterCandidateFilterOptionValues,
  getCandidateFilterOptionValues,
  getCandidateGridColumns,
  getCandidateVisibleRows,
  getFilteredCandidateRows,
  normalizeCandidateValue,
} from "./candidate-table-model.js";

export function renderCandidateView({ access, candidates }) {
  return `
    <section class="view-stack candidate-view-stack table-view-stack">
      ${renderCandidateTable({ access, candidates })}
      ${renderCandidateUploadModal(candidates)}
      ${renderCandidateDetailModal(candidates)}
      ${renderCandidateDownloadConfirmModal(candidates)}
      ${renderCandidateUploadProgressOverlay(candidates)}
    </section>
  `;
}
