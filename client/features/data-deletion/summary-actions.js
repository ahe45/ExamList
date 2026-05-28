import { getJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";
import { toQueryString } from "../pdf-generations/pdf-generation-action-utils.js";
import {
  dataDeletionOptionFields,
  emptyTemplateSelectionQueryValue,
  normalizeTemplateIds,
} from "./state.js";

export function createDataDeletionSummaryActions({
  buildDataDeletionFilterPayload,
  getCurrentSchoolId,
  getDataDeletionModalState,
  onStateChange,
}) {
  async function loadDataDeletionModalData() {
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

    const filterPayload = buildDataDeletionFilterPayload();
    const isTemplateScope = modal.selectedScope === "templates";

    modal.isLoadingOptions = !isTemplateScope;
    modal.isLoadingSummary = true;
    modal.summaryErrorMessage = "";
    await onStateChange();

    const selectedTemplateIds = normalizeTemplateIds(modal.selectedTemplateIds);
    const optionQueryString = isTemplateScope
      ? ""
      : toQueryString({
          ...filterPayload,
          fields: dataDeletionOptionFields.join(","),
          schoolId,
        });
    const summaryQueryString = toQueryString({
      ...filterPayload,
      schoolId,
      ...(isTemplateScope
        ? { templateIds: selectedTemplateIds.length ? selectedTemplateIds.join(",") : emptyTemplateSelectionQueryValue }
        : {}),
    });
    const [optionsResult, summaryResult] = await Promise.allSettled([
      isTemplateScope
        ? Promise.resolve({ options: {} })
        : getJson(`/api/candidates/filter-options${optionQueryString ? `?${optionQueryString}` : ""}`),
      getJson(`/api/data-deletion/summary${summaryQueryString ? `?${summaryQueryString}` : ""}`),
    ]);

    if (optionsResult.status === "fulfilled") {
      modal.options =
        optionsResult.value?.options && typeof optionsResult.value.options === "object"
          ? optionsResult.value.options
          : {};
    } else {
      modal.options = {};
    }

    if (summaryResult.status === "fulfilled") {
      modal.summary = summaryResult.value;
      modal.summaryErrorMessage = "";
      if (isTemplateScope) {
        modal.selectedTemplateIds = normalizeTemplateIds(summaryResult.value?.templates?.selectedIds);
      }
    } else {
      modal.summary = null;
      modal.summaryErrorMessage = summaryResult.reason?.message || "삭제 대상 건수를 불러오지 못했습니다.";
      showToast(modal.summaryErrorMessage, { tone: "error" });
    }

    modal.isLoadingOptions = false;
    modal.isLoadingSummary = false;
    await onStateChange();
  }

  return {
    loadDataDeletionModalData,
  };
}
