import { showToast } from "../../app/toast.js";
import {
  getPdfGenerationSelectedFilterKeysAfterSelection,
  getPdfGenerationVisibleFilterSteps,
  isPdfGenerationCreateConditionComplete,
  normalizePdfGenerationSelectedFilterKeys,
  pdfGenerationFilterSteps,
  resetPdfGenerationFiltersAfterSelection,
} from "../pdf-generations/pdf-generation-flow.js";
import {
  createClosedDataDeletionModalState,
  createEmptyDataDeletionFilters,
  dataDeletionGenerationUnit,
  getDataDeletionScopeSummary,
  normalizeDataDeletionScope,
  normalizeTemplateIds,
} from "./state.js";
import { getDataDeletionItems } from "./renderers.js";

function getDataDeletionSelectedFilterKeysAfterSelection({
  generationUnit = dataDeletionGenerationUnit,
  selectedFilterKeys = [],
  stepKey = "",
  value = "",
} = {}) {
  const normalizedStepKey = String(stepKey || "").trim();
  const visibleSteps = getPdfGenerationVisibleFilterSteps(generationUnit);
  const selectedStepIndex = visibleSteps.findIndex((step) => step.key === normalizedStepKey);
  const nextSelectedKeys = new Set(
    getPdfGenerationSelectedFilterKeysAfterSelection({
      generationUnit,
      selectedFilterKeys,
      stepKey: normalizedStepKey,
      value,
    }),
  );

  if (selectedStepIndex < 0) {
    return normalizePdfGenerationSelectedFilterKeys([...nextSelectedKeys], generationUnit);
  }

  visibleSteps.slice(0, selectedStepIndex + 1).forEach((step) => {
    nextSelectedKeys.add(step.key);
  });

  return normalizePdfGenerationSelectedFilterKeys([...nextSelectedKeys], generationUnit);
}

export function createDataDeletionModalActions({
  buildDataDeletionFilterPayload,
  deleteProjectData,
  getCurrentSchoolId,
  getDataDeletionModalState,
  getDataDeletionSelectedFilterKeys,
  getDataDeletionState,
  getScopeItem,
  hasPermission,
  loadDataDeletionModalData,
  onStateChange,
}) {
  function isDataDeletionUnitComplete() {
    const modal = getDataDeletionModalState();

    if (modal.selectedScope === "templates") {
      return normalizeTemplateIds(modal.selectedTemplateIds).length > 0;
    }

    return isPdfGenerationCreateConditionComplete(getDataDeletionSelectedFilterKeys(), dataDeletionGenerationUnit);
  }

  async function openDataDeletionModal(scope = "") {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();
    const normalizedScope = normalizeDataDeletionScope(scope) || modal.selectedScope || getDataDeletionItems()[0]?.scope || "";
    const item = getScopeItem(normalizedScope);
    const schoolId = getCurrentSchoolId();

    if (!item || state.isDeleting) {
      return;
    }

    if (!hasPermission("deleteProjectData")) {
      state.statusMessage = "데이터 삭제 권한이 없습니다.";
      state.statusType = "warning";
      showToast(state.statusMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    if (!schoolId) {
      state.statusMessage = "학교를 먼저 선택하세요.";
      state.statusType = "warning";
      showToast(state.statusMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.confirmationPhrase = "";
    modal.confirmationOpen = false;
    modal.errorMessage = "";
    modal.filters = createEmptyDataDeletionFilters();
    modal.isOpen = true;
    modal.isLoadingOptions = false;
    modal.isLoadingSummary = false;
    modal.options = {};
    modal.selectedFilterKeys = [];
    modal.selectedScope = normalizedScope;
    modal.selectedTemplateIds = [];
    modal.summary = null;
    modal.summaryErrorMessage = "";
    state.statusMessage = "";
    state.statusType = "";
    await onStateChange();
    await loadDataDeletionModalData();
  }

  async function closeDataDeletionModal() {
    const state = getDataDeletionState();

    if (state.isDeleting) {
      return;
    }

    state.modal = createClosedDataDeletionModalState();
    await onStateChange();
  }

  async function setDataDeletionModalScope(scope = "") {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();
    const normalizedScope = normalizeDataDeletionScope(scope);

    if (state.isDeleting || !modal.isOpen || !normalizedScope) {
      return;
    }

    modal.selectedScope = normalizedScope;
    modal.confirmationOpen = false;
    modal.confirmationPhrase = "";
    modal.errorMessage = "";
    await onStateChange();
  }

  async function updateDataDeletionModalFilter(filterKey = "", value = "") {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();
    const normalizedFilterKey = String(filterKey || "").trim();

    if (
      state.isDeleting ||
      !modal.isOpen ||
      !pdfGenerationFilterSteps.some((step) => step.key === normalizedFilterKey)
    ) {
      return;
    }

    if (String(value || "").trim() === "__pdf_generation_unselected__") {
      return;
    }

    modal.filters[normalizedFilterKey] = String(value || "").trim();
    modal.filters = resetPdfGenerationFiltersAfterSelection(
      modal.filters,
      normalizedFilterKey,
      dataDeletionGenerationUnit,
    );
    modal.selectedFilterKeys = getDataDeletionSelectedFilterKeysAfterSelection({
      generationUnit: dataDeletionGenerationUnit,
      selectedFilterKeys: modal.selectedFilterKeys,
      stepKey: normalizedFilterKey,
      value,
    });
    modal.confirmationOpen = false;
    modal.confirmationPhrase = "";
    modal.errorMessage = "";
    await loadDataDeletionModalData();
  }

  async function updateDataDeletionTemplateSelection(templateId = "", checked = false) {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();
    const normalizedTemplateId = String(templateId || "").trim();

    if (state.isDeleting || !modal.isOpen || modal.selectedScope !== "templates") {
      return;
    }

    const templateItems = Array.isArray(modal.summary?.templates?.items) ? modal.summary.templates.items : [];
    const templateIds = templateItems.map((item) => String(item?.id || "").trim()).filter(Boolean);
    const templateIdSet = new Set(templateIds);

    if (normalizedTemplateId === "__all__") {
      modal.selectedTemplateIds = checked ? templateIds : [];
    } else {
      if (!templateIdSet.has(normalizedTemplateId)) {
        return;
      }

      const nextSelectedIds = new Set(normalizeTemplateIds(modal.selectedTemplateIds).filter((id) => templateIdSet.has(id)));

      if (checked) {
        nextSelectedIds.add(normalizedTemplateId);
      } else {
        nextSelectedIds.delete(normalizedTemplateId);
      }

      modal.selectedTemplateIds = templateIds.filter((id) => nextSelectedIds.has(id));
    }

    modal.confirmationOpen = false;
    modal.confirmationPhrase = "";
    modal.errorMessage = "";
    await loadDataDeletionModalData();
  }

  async function updateDataDeletionConfirmation(confirmationPhrase = "") {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();

    if (state.isDeleting || !modal.isOpen) {
      return;
    }

    modal.confirmationPhrase = String(confirmationPhrase || "");
    modal.errorMessage = "";
    await onStateChange();
  }

  async function closeDataDeletionConfirmation() {
    const state = getDataDeletionState();
    const modal = getDataDeletionModalState();

    if (state.isDeleting || !modal.isOpen) {
      return;
    }

    modal.confirmationOpen = false;
    modal.confirmationPhrase = "";
    modal.errorMessage = "";
    await onStateChange();
  }

  async function submitDataDeletionModal() {
    const modal = getDataDeletionModalState();

    if (!modal.isOpen) {
      return;
    }

    if (!isDataDeletionUnitComplete()) {
      modal.errorMessage = modal.selectedScope === "templates"
        ? "삭제할 양식을 선택하세요."
        : "모집시기, 전형까지 선택한 뒤 삭제를 진행하세요.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    const scopeSummary = getDataDeletionScopeSummary(modal.summary, modal.selectedScope);

    if (!scopeSummary || Number(scopeSummary.totalCount) <= 0) {
      modal.errorMessage = "선택한 단위에서 삭제할 데이터가 없습니다.";
      showToast(modal.errorMessage, { tone: "warning" });
      await onStateChange();
      return;
    }

    modal.confirmationOpen = true;
    modal.confirmationPhrase = "";
    modal.errorMessage = "";
    await onStateChange();
  }

  async function confirmDataDeletion() {
    const modal = getDataDeletionModalState();

    if (!modal.isOpen || !modal.confirmationOpen) {
      return;
    }

    await deleteProjectData(modal.selectedScope, {
      confirmationPhrase: modal.confirmationPhrase,
    });
  }

  return {
    closeDataDeletionConfirmation,
    closeDataDeletionModal,
    confirmDataDeletion,
    openDataDeletionModal,
    setDataDeletionModalScope,
    submitDataDeletionModal,
    updateDataDeletionConfirmation,
    updateDataDeletionModalFilter,
    updateDataDeletionTemplateSelection,
  };
}
