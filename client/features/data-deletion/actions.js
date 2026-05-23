import { hasAccess } from "../../app/access.js";
import { getActiveSchoolId, getActiveSchoolRouteKey } from "../../app/school-context.js";
import {
  getPdfGenerationSelectedFilterKeysAfterSelection,
  getPdfGenerationVisibleFilterSteps,
  normalizePdfGenerationSelectedFilterKeys,
  pdfGenerationFilterSteps,
} from "../pdf-generations/pdf-generation-flow.js";
import { getDataDeletionItems } from "./renderers.js";
import { createDataDeletionDeleteActions } from "./delete-actions.js";
import { bindDataDeletionEventHandlers } from "./event-bindings.js";
import { createDataDeletionModalActions } from "./modal-actions.js";
import { createDataDeletionSummaryActions } from "./summary-actions.js";
import {
  createEmptyDataDeletionFilters,
  dataDeletionGenerationUnit,
  getDeletionImpact,
  getEmptyPdfGenerationTableState,
  normalizeDataDeletionScope,
  normalizeTemplateIds,
} from "./state.js";

export function getDataDeletionSelectedFilterKeysAfterSelection({
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

export function setupDataDeletionActions({
  appState,
  candidateActions = null,
  generationActions = null,
  schoolActions = null,
  templatesActions = null,
  onStateChange,
}) {
  function getDataDeletionState() {
    appState.dataDeletion = {
      activeScope: "",
      isDeleting: false,
      statusMessage: "",
      statusType: "",
      ...(appState.dataDeletion || {}),
    };

    return appState.dataDeletion;
  }

  function getDataDeletionModalState() {
    const state = getDataDeletionState();
    const modal = state.modal && typeof state.modal === "object" ? state.modal : {};
    const defaults = {
      confirmationOpen: false,
      confirmationPhrase: "",
      errorMessage: "",
      filters: createEmptyDataDeletionFilters(),
      isOpen: false,
      isLoadingOptions: false,
      isLoadingSummary: false,
      options: {},
      selectedFilterKeys: [],
      selectedScope: "",
      selectedTemplateIds: [],
      summary: null,
      summaryErrorMessage: "",
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!Object.prototype.hasOwnProperty.call(modal, key)) {
        modal[key] = value;
      }
    });
    modal.filters = {
      ...createEmptyDataDeletionFilters(),
      ...(modal.filters && typeof modal.filters === "object" ? modal.filters : {}),
    };
    modal.selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(
      modal.selectedFilterKeys,
      dataDeletionGenerationUnit,
    );
    modal.selectedScope = normalizeDataDeletionScope(modal.selectedScope);
    modal.selectedTemplateIds = normalizeTemplateIds(modal.selectedTemplateIds);
    state.modal = modal;

    return modal;
  }

  function getScopeItem(scope = "") {
    const normalizedScope = normalizeDataDeletionScope(scope);

    return getDataDeletionItems().find((item) => item.scope === normalizedScope) || null;
  }

  function hasPermission(permissionKey) {
    return hasAccess(appState.summary, permissionKey);
  }

  function getDataDeletionSelectedFilterKeys() {
    const modal = getDataDeletionModalState();

    return normalizePdfGenerationSelectedFilterKeys(modal.selectedFilterKeys, dataDeletionGenerationUnit);
  }

  function buildDataDeletionFilterPayload() {
    const modal = getDataDeletionModalState();

    if (modal.selectedScope === "templates") {
      return {};
    }

    const visibleFilterKeys = new Set(
      getPdfGenerationVisibleFilterSteps(dataDeletionGenerationUnit).map((step) => step.key),
    );
    const selectedFilterKeys = new Set(getDataDeletionSelectedFilterKeys());

    return Object.fromEntries(
      pdfGenerationFilterSteps
        .filter((step) => visibleFilterKeys.has(step.key) && selectedFilterKeys.has(step.key))
        .map((step) => [step.key, String(modal.filters?.[step.key] || "").trim()])
        .filter(([, value]) => value),
    );
  }

  function resetImpactedState(scope = "", result = {}) {
    const impact = getDeletionImpact(scope, result);

    if (impact.candidates || impact.photos) {
      appState.candidates.items = [];
      appState.candidates.total = 0;
      appState.candidates.errorMessage = "";
      appState.candidates.successMessage = "";
      appState.candidates.detail.isOpen = false;
      appState.candidates.detail.draftRecord = null;
      appState.candidates.detail.originalRecord = null;
    }

    if (impact.pdfGenerations) {
      appState.pdfGenerationDetail.item = null;
      appState.pdfGenerationDetail.errorMessage = "";
      appState.pdfGenerations.auditLogs = [];
      appState.pdfGenerations.cleanupResult = null;
      appState.pdfGenerations.items = [];
      appState.pdfGenerations.selectedGenerationIds = [];
      appState.pdfGenerations.table = getEmptyPdfGenerationTableState();
      appState.pdfGenerations.total = 0;
    }

    if (impact.templates) {
      appState.templates.items = [];
      appState.templates.total = 0;
      appState.templateEditor.template = null;
      appState.templateEditor.savedTemplateSnapshot = null;
      appState.ui.activeTemplateId = "";
    }
  }

  async function refreshAfterDeletion(scope = "", result = {}) {
    const schoolRouteKey = getActiveSchoolRouteKey(appState);

    resetImpactedState(scope, result);

    await schoolActions?.loadSchoolDetail?.(schoolRouteKey);
    await templatesActions?.loadSummary?.({ silent: true });

    if (appState.currentView === "candidateLookup") {
      await candidateActions?.loadCandidates?.();
    }

    if (appState.currentView === "pdfGenerationHistory") {
      await generationActions?.loadGenerations?.();
    }

    if (appState.currentView === "pdfHistoryManagement") {
      await generationActions?.loadAuditLogs?.();
    }

    if (appState.currentView === "templateManagement") {
      await templatesActions?.loadTemplates?.();
    }
  }

  const { loadDataDeletionModalData } = createDataDeletionSummaryActions({
    buildDataDeletionFilterPayload,
    getCurrentSchoolId: () => getActiveSchoolId(appState),
    getDataDeletionModalState,
    onStateChange,
  });

  const { deleteProjectData } = createDataDeletionDeleteActions({
    buildDataDeletionFilterPayload,
    getCurrentSchoolId: () => getActiveSchoolId(appState),
    getDataDeletionModalState,
    getDataDeletionState,
    getScopeItem,
    hasPermission,
    onStateChange,
    refreshAfterDeletion,
  });

  const {
    closeDataDeletionConfirmation,
    closeDataDeletionModal,
    confirmDataDeletion,
    openDataDeletionModal,
    setDataDeletionModalScope,
    submitDataDeletionModal,
    updateDataDeletionConfirmation,
    updateDataDeletionModalFilter,
    updateDataDeletionTemplateSelection,
  } = createDataDeletionModalActions({
    buildDataDeletionFilterPayload,
    deleteProjectData,
    getCurrentSchoolId: () => getActiveSchoolId(appState),
    getDataDeletionModalState,
    getDataDeletionSelectedFilterKeys,
    getDataDeletionState,
    getScopeItem,
    hasPermission,
    loadDataDeletionModalData,
    onStateChange,
  });

  bindDataDeletionEventHandlers({
    closeDataDeletionConfirmation,
    closeDataDeletionModal,
    confirmDataDeletion,
    openDataDeletionModal,
    setDataDeletionModalScope,
    submitDataDeletionModal,
    updateDataDeletionConfirmation,
    updateDataDeletionModalFilter,
    updateDataDeletionTemplateSelection,
  });

  return Object.freeze({
    closeDataDeletionConfirmation,
    closeDataDeletionModal,
    confirmDataDeletion,
    deleteProjectData,
    openDataDeletionModal,
    setDataDeletionModalScope,
    submitDataDeletionModal,
    updateDataDeletionConfirmation,
    updateDataDeletionModalFilter,
    updateDataDeletionTemplateSelection,
  });
}
