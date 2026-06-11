import test from "node:test";
import assert from "node:assert/strict";

import { registerAppModalGuards } from "./modal-guard-registrations.js";

const noop = async () => {};
const falseFn = () => false;

function createAppState() {
  return {
    accounts: {
      modal: { isOpen: false, isSaving: false },
      uploadModal: { isOpen: false, isUploading: false },
    },
    candidates: {
      detail: { isOpen: false, isPhotoUploading: false, isSaving: false },
      downloadConfirm: { isDownloading: false, isOpen: false },
      upload: { errorDialogOpen: false, isOpen: false, isUploading: false },
    },
    dataDeletion: {
      isDeleting: false,
      modal: { confirmationOpen: false, isDeleting: false, isOpen: false },
    },
    pdfGenerations: {
      createModal: {
        isOpen: false,
        isSubmitting: false,
        templatePreview: { isOpen: false },
      },
      deleteConfirm: { isDeleting: false, isOpen: false },
      detailModal: { isOpen: false },
      downloadModal: { isOpen: false, isSubmitting: false },
      generatedResultModal: { isOpen: false, isSubmitting: false },
    },
    schools: {
      modal: { isOpen: false, isSaving: false },
    },
    templateEditor: {
      dataTagFormatModal: { isOpen: false },
      dataTagSampleModal: { isOpen: false },
      generationUnitModal: { isOpen: false },
      isPreviewOpen: false,
      isSaving: false,
      isSavingDataTagSettings: false,
    },
    templates: {
      createModal: { isOpen: false },
    },
  };
}

function createGuardRegistrationContext() {
  const registrations = [];

  registerAppModalGuards({
    accountActions: {
      closeAccountModal: noop,
      closeAccountUploadModal: noop,
    },
    appState: createAppState(),
    candidateActions: {
      closeCandidateDetailModal: noop,
      closeCandidateDownloadConfirm: noop,
      closeCandidateUploadErrorModal: noop,
      closeCandidateUploadModal: noop,
      isCandidateDetailDirty: falseFn,
      isCandidateUploadDirty: falseFn,
      saveCandidateDetailAndClose: noop,
      saveCandidateUploadAndClose: noop,
    },
    clearPendingTemplateEditorAction: noop,
    dataDeletionActions: {
      closeDataDeletionConfirmation: noop,
      closeDataDeletionModal: noop,
    },
    discardTemplateEditorChangesAndRunPendingAction: noop,
    editorActions: {
      closeDataTagFormatModal: noop,
      closeDataTagSampleModal: noop,
      closeGenerationUnitSettingsModal: noop,
      closeTemplatePreview: noop,
      isDataTagSampleModalDirty: falseFn,
      saveDataTagSampleModal: noop,
    },
    generationActions: {
      closePdfGenerationCreateModal: noop,
      closePdfGenerationDeleteConfirm: noop,
      closePdfGenerationDetailModal: noop,
      closePdfGenerationDownloadModal: noop,
      closePdfGenerationGeneratedResultModal: noop,
      closePdfGenerationTemplatePreview: noop,
    },
    getPendingTemplateEditorPromptOptions: () => ({}),
    hasPendingTemplateEditorAction: falseFn,
    isTemplateEditorUnsaved: falseFn,
    modalCloseGuard: {
      registerModal(config) {
        registrations.push(config);
      },
    },
    saveTemplateEditorChangesAndRunPendingAction: noop,
    schoolActions: {
      closeSchoolModal: noop,
      isSchoolModalDirty: falseFn,
      saveSchoolModal: noop,
    },
    templateActions: {
      closeTemplateCreateModal: noop,
    },
  });

  return registrations;
}

test("registers every app modal close action with the modal close guard", () => {
  const registrations = createGuardRegistrationContext();
  const registeredActions = new Map(
    registrations.flatMap((registration) =>
      (registration.closeActions || []).map((actionName) => [actionName, registration.id]),
    ),
  );

  assert.deepEqual([...registeredActions.keys()], [
    "close-account-modal",
    "close-account-upload-modal",
    "close-school-modal",
    "close-candidate-upload-modal",
    "close-candidate-upload-error-modal",
    "close-candidate-detail-modal",
    "cancel-candidate-download",
    "close-template-create-modal",
    "close-template-preview",
    "close-data-tag-sample-modal",
    "close-data-tag-format-modal",
    "close-generation-unit-settings-modal",
    "close-pdf-generation-create-modal",
    "close-pdf-generation-template-preview",
    "close-pdf-generation-detail-modal",
    "close-pdf-generation-download-modal",
    "close-pdf-generation-generated-result-modal",
    "close-pdf-generation-delete-confirm",
    "close-data-deletion-modal",
    "close-data-deletion-confirm",
  ]);
});

test("registers nested modal guards after their parent modal guards", () => {
  const registrations = createGuardRegistrationContext();
  const indexById = new Map(registrations.map((registration, index) => [registration.id, index]));

  assert.ok(indexById.get("candidate-upload-error") > indexById.get("candidate-upload"));
  assert.ok(indexById.get("pdf-generation-template-preview") > indexById.get("pdf-generation-create"));
  assert.ok(indexById.get("data-deletion-confirm") > indexById.get("data-deletion"));
});
