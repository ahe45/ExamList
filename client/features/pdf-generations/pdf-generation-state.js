import {
  clampPdfGenerationCreateStepIndex,
  createEmptyPdfGenerationFilters,
  normalizePdfGenerationSelectedFilterKeys,
} from "./pdf-generation-flow.js";

export function createEmptyActivePdfGeneration() {
  return {
    batchId: "",
    canCancel: false,
    completedCount: 0,
    errorMessage: "",
    estimatedSeconds: 0,
    elapsedSeconds: 0,
    failedCount: 0,
    isOpen: false,
    isCancelling: false,
    label: "",
    progressPercent: 0,
    queuedCount: 0,
    runningCount: 0,
    statusText: "",
    startedAtMs: 0,
    succeededCount: 0,
    totalRequested: 0,
  };
}

export function createEmptyTemplatePreviewState() {
  return {
    errorMessage: "",
    isLoading: false,
    isOpen: false,
    pdfUrl: "",
    previewHtml: "",
    templateId: "",
    templateName: "",
  };
}

export function getPdfGenerationTableState(appState) {
  appState.pdfGenerations.table = {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [{ key: "sequenceNumber", direction: "asc" }],
    ...(appState.pdfGenerations.table || {}),
  };

  return appState.pdfGenerations.table;
}

export function getCreateModalState(appState) {
  const modal = appState.pdfGenerations.createModal || {};
  const defaults = {
    activeStepIndex: 0,
    errorMessage: "",
    filters: createEmptyPdfGenerationFilters(),
    isLoadingOptions: false,
    isOpen: false,
    isSubmitting: false,
    options: {},
    selectedFilterKeys: [],
    selectedTemplateId: "",
    targetEstimate: null,
    templatePreview: createEmptyTemplatePreviewState(),
    templates: [],
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(modal, key)) {
      modal[key] = value;
    }
  });

  modal.filters = {
    ...createEmptyPdfGenerationFilters(),
    ...(modal.filters || {}),
  };
  modal.templatePreview = {
    ...createEmptyTemplatePreviewState(),
    ...(modal.templatePreview && typeof modal.templatePreview === "object" ? modal.templatePreview : {}),
  };
  modal.activeStepIndex = clampPdfGenerationCreateStepIndex(modal.activeStepIndex);
  const selectedTemplate = (Array.isArray(modal.templates) ? modal.templates : []).find(
    (template) => String(template.id || "") === String(modal.selectedTemplateId || ""),
  );
  modal.selectedFilterKeys = normalizePdfGenerationSelectedFilterKeys(
    modal.selectedFilterKeys,
    selectedTemplate?.generationUnit || "",
  );
  appState.pdfGenerations.createModal = modal;

  return modal;
}

export function getDownloadModalState(appState) {
  const modal = appState.pdfGenerations.downloadModal || {};
  const defaults = {
    errorMessage: "",
    isOpen: false,
    isSubmitting: false,
    mode: "merge",
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(modal, key)) {
      modal[key] = value;
    }
  });
  appState.pdfGenerations.downloadModal = modal;

  return modal;
}

export function getGeneratedResultModalState(appState) {
  const modal = appState.pdfGenerations.generatedResultModal || {};
  const defaults = {
    archiveDownloadUrl: "",
    archiveFileName: "",
    batchId: "",
    errorMessage: "",
    failedCount: 0,
    generationIds: [],
    isOpen: false,
    isSubmitting: false,
    mode: "merge",
    succeededCount: 0,
    templateName: "",
    totalRequested: 0,
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(modal, key)) {
      modal[key] = value;
    }
  });
  appState.pdfGenerations.generatedResultModal = modal;

  return modal;
}

export function getDeleteConfirmState(appState) {
  const modal = appState.pdfGenerations.deleteConfirm || {};
  const defaults = {
    candidateCount: 0,
    count: 0,
    errorMessage: "",
    fileSizeBytes: 0,
    generationIds: [],
    isDeleting: false,
    isOpen: false,
    items: [],
    pageCount: 0,
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(modal, key)) {
      modal[key] = value;
    }
  });
  appState.pdfGenerations.deleteConfirm = modal;

  return modal;
}

export function getDetailModalState(appState) {
  const modal = appState.pdfGenerations.detailModal || {};
  const defaults = {
    generationId: "",
    isOpen: false,
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(modal, key)) {
      modal[key] = value;
    }
  });
  appState.pdfGenerations.detailModal = modal;

  return modal;
}

export function resetPdfGenerationTemplatePreview(appState) {
  getCreateModalState(appState).templatePreview = createEmptyTemplatePreviewState();
}
