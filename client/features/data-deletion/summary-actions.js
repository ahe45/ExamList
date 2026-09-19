import { autoSelectSingleFilterOptions, getPdfGenerationVisibleFilterSteps } from "../pdf-generations/pdf-generation-flow.js";
import { getJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toQueryString } from "../pdf-generations/pdf-generation-action-utils.js";
import {
  dataDeletionGenerationUnit,
  emptyTemplateSelectionQueryValue,
  normalizeTemplateIds,
} from "./state.js";

export function createDataDeletionSummaryActions({
  buildDataDeletionFilterPayload,
  getCurrentSchoolId,
  getDataDeletionModalState,
  onStateChange,
}) {
  let requestVersion = 0;
  async function loadDataDeletionModalData() {
    const version = ++requestVersion;
    const modal = getDataDeletionModalState();
    const schoolId = getCurrentSchoolId();

    if (!modal.isOpen) {
      return;
    }

    if (!schoolId) {
      modal.options = {};
      modal.summary = null;
      modal.summaryErrorMessage = "학교를 먼저 선택하세요.";
      await onStateChange();
      return;
    }

    const isCurrent = () => version === requestVersion && getDataDeletionModalState() === modal && modal.isOpen && getCurrentSchoolId() === schoolId;
    const filterPayload = buildDataDeletionFilterPayload();
    const isTemplateScope = modal.selectedScope === "templates";

    modal.isLoadingOptions = !isTemplateScope;
    modal.isLoadingSummary = true;
    modal.summary = null;
    modal.summaryErrorMessage = "";
    await onStateChange();

    if (!isCurrent()) return;
    const selectedTemplateIds = normalizeTemplateIds(modal.selectedTemplateIds);
    const optionQueryString = isTemplateScope
      ? ""
      : toQueryString({
          ...filterPayload,
          excludeSelfFilters: "1",
          fields: getPdfGenerationVisibleFilterSteps(dataDeletionGenerationUnit).map(step => step.key).join(","),
          schoolId,
        });
    const summaryQueryString = toQueryString({
      scope: modal.selectedScope,
      ...filterPayload,
      schoolId,
      ...(isTemplateScope
        ? { templateIds: selectedTemplateIds.length ? selectedTemplateIds.join(",") : emptyTemplateSelectionQueryValue }
        : {}),
    });
    await Promise.all([
      (async () => {
        try {
          const payload = isTemplateScope ? { options: {} } : await getJson(`/api/candidates/filter-options?${optionQueryString}`);
          if (!isCurrent()) return;
          modal.options = payload?.options || {};
          if (!isTemplateScope && autoSelectSingleFilterOptions(modal,
            getPdfGenerationVisibleFilterSteps(dataDeletionGenerationUnit).map(step => step.key))) {
            modal.confirmationOpen = false;
            modal.confirmationPhrase = "";
            return await loadDataDeletionModalData();
          }
        } catch {
          // Keep the last usable list on a transient failure; selected filters remain authoritative.
        } finally {
          if (isCurrent()) { modal.isLoadingOptions = false; await onStateChange(); }
        }
      })(),
      (async () => {
        try {
          const payload = await getJson(`/api/data-deletion/summary?${summaryQueryString}`);
          if (!isCurrent()) return;
          modal.summary = payload;
          modal.summaryErrorMessage = "";
          if (isTemplateScope) modal.selectedTemplateIds = normalizeTemplateIds(payload?.templates?.selectedIds);
        } catch (error) {
          if (!isCurrent()) return;
          modal.summary = null;
          modal.summaryErrorMessage = error.message || "삭제 대상 건수를 불러오지 못했습니다.";
          showToast(modal.summaryErrorMessage, { tone: "error" });
        } finally {
          if (isCurrent()) { modal.isLoadingSummary = false; await onStateChange(); }
        }
      })(),
    ]);
  }

  return {
    loadDataDeletionModalData,
  };
}
