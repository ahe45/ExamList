import { createDefaultTemplateCreateModalState } from "../features/templates/template-create-modal-state.js";

export function resetCandidateState(appState) {
  appState.candidates.items = [];
  appState.candidates.total = 0;
  appState.candidates.errorMessage = "";
  appState.candidates.successMessage = "";
  appState.candidates.detail.isOpen = false;
  appState.candidates.detail.draftRecord = null;
  appState.candidates.detail.originalRecord = null;
  appState.candidates.downloadConfirm = {
    count: 0,
    isDownloading: false,
    isOpen: false,
  };
  appState.candidates.upload.isOpen = false;
  appState.candidates.upload.errorDialogOpen = false;
  appState.candidates.upload.errorMessage = "";
  appState.candidates.upload.dataFile = null;
  appState.candidates.upload.dataFileName = "";
  appState.candidates.upload.preview = null;
  appState.candidates.upload.photoFile = null;
  appState.candidates.upload.photoFileName = "";
  appState.candidates.upload.photoPreview = null;
  appState.candidates.upload.photoPreviewToken = "";
  appState.candidates.upload.previewProgress = {
    detail: "",
    isIndeterminate: false,
    isActive: false,
    message: "",
    percent: 0,
  };
  appState.candidates.upload.progressOverlay = {
    detail: "",
    isIndeterminate: false,
    isOpen: false,
    message: "",
    percent: 0,
    stageLabel: "",
    title: "",
  };
}

export function resetAccountState(appState) {
  appState.accounts = {
    errorMessage: "",
    items: [],
    loading: false,
    modal: {
      accountId: "",
      errorMessage: "",
      isOpen: false,
      isSaving: false,
      mode: "create",
      password: "",
      role: "admin",
      userId: "",
      userName: "",
    },
    total: 0,
    uploadModal: {
      errorMessage: "",
      file: null,
      fileName: "",
      isOpen: false,
      isUploading: false,
      result: null,
    },
  };
}

export function resetPdfGenerationState(appState) {
  appState.pdfGenerationDetail.item = null;
  appState.pdfGenerationDetail.errorMessage = "";
  appState.pdfGenerations.activeGeneration = {
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
  appState.pdfGenerations.auditLogs = [];
  appState.pdfGenerations.totalAuditLogs = 0;
  appState.pdfGenerations.auditTable = {
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
  };
  appState.pdfGenerations.createModal.isOpen = false;
  appState.pdfGenerations.createModal.selectedFilterKeys = [];
  appState.pdfGenerations.createModal.templatePreview = {
    errorMessage: "",
    isLoading: false,
    isOpen: false,
    pdfUrl: "",
    previewHtml: "",
    templateId: "",
    templateName: "",
  };
  appState.pdfGenerations.downloadModal = {
    errorMessage: "",
    isOpen: false,
    isSubmitting: false,
    mode: "merge",
  };
  appState.pdfGenerations.generatedResultModal = {
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
  appState.pdfGenerations.isCreatingArchive = false;
  appState.pdfGenerations.detailModal = {
    generationId: "",
    isOpen: false,
  };
  appState.pdfGenerations.deleteConfirm = {
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
  appState.pdfGenerations.items = [];
  appState.pdfGenerations.selectedGenerationIds = [];
  appState.pdfGenerations.table = {
    filterMenuKey: "",
    filterMenuPosition: null,
    filterMenuSearch: "",
    filters: {},
    page: 1,
    pageSize: 30,
    pageSizeMenuOpen: false,
    sortRules: [{ key: "sequenceNumber", direction: "asc" }],
  };
  appState.pdfGenerations.total = 0;
}

export function resetDataDeletionState(appState) {
  appState.dataDeletion = {
    activeScope: "",
    isDeleting: false,
    modal: {
      confirmationOpen: false,
      confirmationPhrase: "",
      errorMessage: "",
      filters: {
        admission: "",
        building: "",
        campus: "",
        examDate: "",
        major: "",
        period: "",
        room: "",
        series: "",
        time: "",
        endTime: "",
        track: "",
        unit: "",
      },
      isOpen: false,
      isLoadingOptions: false,
      isLoadingSummary: false,
      options: {},
      selectedScope: "",
      selectedFilterKeys: [],
      summary: null,
      summaryErrorMessage: "",
    },
    progressOverlay: {
      message: "",
      stageLabel: "",
    },
    statusMessage: "",
    statusType: "",
  };
}

export function resetSchoolState(appState) {
  appState.schoolSettings.academicYear = "";
  appState.schoolSettings.campusCode = "";
  appState.schoolSettings.campusName = "";
  appState.schoolSettings.logoDataUrl = "";
  appState.schoolSettings.schoolId = "";
  appState.schoolSettings.schoolName = "";
  appState.schools.detail = null;
  appState.schools.deletingSchoolId = "";
  appState.schools.deletionProgress = {
    candidateCount: 0,
    message: "",
    schoolName: "",
    stageLabel: "",
    templateCount: 0,
  };
  appState.schools.items = [];
  appState.schools.isDeleting = false;
  appState.schools.total = 0;
  appState.schools.errorMessage = "";
  appState.schools.modal = {
    academicYear: "",
    campusCode: "",
    campusName: "",
    code: "",
    deletionPassword: "",
    deletionPasswordConfirm: "",
    description: "",
    errorMessage: "",
    isOpen: false,
    isSaving: false,
    logoDataUrl: "",
    mode: "create",
    name: "",
    schoolId: "",
    settingsLoading: false,
  };
}

export function resetTemplateState(appState) {
  appState.templateEditor.previewHtml = "";
  appState.templateEditor.previewPdfUrl = "";
  appState.templateEditor.dataTagSampleModal = {
    draftEmptyValueData: {},
    draftValues: {},
    isOpen: false,
  };
  appState.templateEditor.dataTagEmptyValueData = {};
  appState.templateEditor.dataTagSampleValues = {};
  appState.templateEditor.isSavingDataTagSettings = false;
  appState.templateEditor.savedTemplateSnapshot = null;
  appState.templateEditor.template = null;
  appState.templates.createModal = createDefaultTemplateCreateModalState();
  appState.templates.items = [];
  appState.templates.total = 0;
}

export function resetUiState(appState) {
  appState.ui.modalClosePrompt = {
    isOpen: false,
    isSaving: false,
    message: "",
    modalId: "",
  };
}

export function clearProtectedState(appState) {
  resetAccountState(appState);
  resetCandidateState(appState);
  resetDataDeletionState(appState);
  resetPdfGenerationState(appState);
  resetSchoolState(appState);
  resetTemplateState(appState);
  resetUiState(appState);
}
