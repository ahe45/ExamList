import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  createEmptyPdfGenerationFilters,
  isPdfGenerationCreateConditionComplete,
  normalizePdfGenerationSelectedFilterKeys,
} from "../pdf-generations/pdf-generation-flow.js";
import {
  DATA_DELETION_CONFIRMATION_PHRASE,
  dataDeletionGenerationUnit,
  dataDeletionItems,
  getDataDeletionItem,
  normalizeDataDeletionScope,
  normalizeTemplateIds,
} from "./constants.js";
import { renderDataDeletionConfirmation } from "./confirmation-renderer.js";
import { renderDataDeletionFilterList } from "./filter-step-renderer.js";
import { getDataDeletionScopeSummary } from "./state.js";
import { renderDataDeletionTemplateList } from "./template-selection-renderer.js";
import { renderDataDeletionTargetCounts } from "./target-count-renderer.js";

export function renderDataDeletionModal(dataDeletion = {}, { access, school } = {}) {
  const modal = dataDeletion?.modal || {};

  if (!modal.isOpen) {
    return "";
  }

  const selectedScope = normalizeDataDeletionScope(modal.selectedScope) || dataDeletionItems[0].scope;
  const selectedItem = getDataDeletionItem(selectedScope);
  const isTemplateScope = selectedScope === "templates";
  const scopeSummary = getDataDeletionScopeSummary(modal.summary, selectedScope);
  const confirmationPhrase = String(modal.confirmationPhrase || "");
  const filters = {
    ...createEmptyPdfGenerationFilters(),
    ...(modal.filters && typeof modal.filters === "object" ? modal.filters : {}),
  };
  const isDeleting = Boolean(dataDeletion?.isDeleting || modal.isDeleting);
  const isLoadingOptions = Boolean(modal.isLoadingOptions);
  const isLoadingSummary = Boolean(modal.isLoadingSummary);
  const isBusy = isDeleting || isLoadingOptions || isLoadingSummary;
  const canDeleteData = hasAccess(access, "deleteProjectData");
  const hasSchool = Boolean(String(school?.id || "").trim());
  const isAll = selectedItem?.scope === "all";
  const totalCount = Number(scopeSummary?.totalCount) || 0;
  const hasSummary = Boolean(scopeSummary);
  const hasDeletionTargets = hasSummary && totalCount > 0;
  const selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(
    modal.selectedFilterKeys,
    dataDeletionGenerationUnit,
  );
  const selectedTemplateIds = normalizeTemplateIds(modal.selectedTemplateIds);
  const isUnitComplete = isTemplateScope
    ? selectedTemplateIds.length > 0
    : isPdfGenerationCreateConditionComplete(selectedFilterKeys, dataDeletionGenerationUnit);
  const canSubmit = Boolean(
    canDeleteData &&
    hasSchool &&
    selectedItem &&
    isUnitComplete &&
    hasDeletionTargets &&
    !isDeleting &&
    !isLoadingSummary &&
    !isLoadingOptions,
  );
  const summaryErrorMessage = String(modal.summaryErrorMessage || "").trim();
  const isConfirmationOpen = Boolean(modal.confirmationOpen);
  const canConfirmSubmit = Boolean(!isDeleting && (!isAll || confirmationPhrase.trim() === DATA_DELETION_CONFIRMATION_PHRASE));

  return `
    <div class="modal-overlay data-deletion-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dataDeletionModalTitle">
      <div class="modal-card data-deletion-modal-card">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">데이터 삭제</p>
            <h2 id="dataDeletionModalTitle">데이터 삭제 설정</h2>
          </div>
          <button class="icon-button" data-action="close-data-deletion-modal" type="button" aria-label="닫기" ${isDeleting ? "disabled" : ""}>&times;</button>
        </div>
        <form class="modal-form data-deletion-modal-form" data-data-deletion-modal-form>
          <div class="data-deletion-modal-content-grid ${isTemplateScope ? "is-template-scope" : ""}">
            <section class="data-deletion-modal-section data-deletion-modal-unit-section">
              <div class="data-deletion-modal-section-header">
                <div>
                  <h3>삭제 대상</h3>
                </div>
                <strong>${escapeHtml(selectedItem?.title || "선택한 데이터")}</strong>
              </div>
              <div class="data-deletion-modal-section-header">
                <div>
                  <h3>삭제 단위</h3>
                </div>
              </div>
              ${
                isTemplateScope
                  ? renderDataDeletionTemplateList({
                      isBusy,
                      isLoading: isLoadingSummary,
                      selectedTemplateIds,
                      summary: modal.summary,
                    })
                  : renderDataDeletionFilterList({
                      filters,
                      isBusy,
                      isLoadingOptions,
                      modal,
                      selectedFilterKeys,
                    })
              }
            </section>
            <section class="data-deletion-modal-section data-deletion-modal-target-section">
              <div class="data-deletion-modal-section-header">
                <div>
                  <h3>삭제 대상 건수</h3>
                </div>
                <strong>${isLoadingSummary ? "-" : `${formatCount(totalCount)}건`}</strong>
              </div>
              ${summaryErrorMessage ? `<p class="error-banner">${escapeHtml(summaryErrorMessage)}</p>` : ""}
              ${renderDataDeletionTargetCounts({ isLoading: isLoadingSummary, scopeSummary })}
            </section>
          </div>
          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions data-deletion-modal-actions">
            <button class="ghost-button" data-action="close-data-deletion-modal" type="button" ${isDeleting ? "disabled" : ""}>취소</button>
            <div class="data-deletion-modal-action-buttons">
              <button class="primary-button danger-button" type="submit" ${canSubmit ? "" : "disabled"}>${isDeleting ? "삭제 중..." : "삭제 실행"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
    ${isConfirmationOpen
      ? renderDataDeletionConfirmation({
          canConfirmSubmit,
          confirmationPhrase,
          isAll,
          isDeleting,
          modal,
          selectedItem,
          totalCount,
        })
      : ""}
  `;
}
