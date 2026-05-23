export function registerAppModalGuards({
  appState,
  candidateActions,
  clearPendingTemplateEditorAction,
  dataDeletionActions,
  discardTemplateEditorChangesAndRunPendingAction,
  editorActions,
  generationActions,
  getPendingTemplateEditorPromptOptions,
  hasPendingTemplateEditorAction,
  isTemplateEditorUnsaved,
  modalCloseGuard,
  saveTemplateEditorChangesAndRunPendingAction,
  schoolActions,
}) {
  modalCloseGuard.registerModal({
    id: "school",
    closeActions: ["close-school-modal"],
    close: schoolActions.closeSchoolModal,
    isBusy: () => Boolean(appState.schools.modal.isSaving),
    isDirty: schoolActions.isSchoolModalDirty,
    isOpen: () => Boolean(appState.schools.modal.isOpen),
    message: "학교 정보에 저장하지 않은 변경사항이 있습니다.",
    saveAndClose: schoolActions.saveSchoolModal,
  });
  modalCloseGuard.registerModal({
    id: "candidate-upload",
    closeActions: ["close-candidate-upload-modal"],
    close: candidateActions.closeCandidateUploadModal,
    isBusy: () => Boolean(appState.candidates.upload.isUploading),
    isDirty: candidateActions.isCandidateUploadDirty,
    isOpen: () => Boolean(appState.candidates.upload.isOpen),
    message: "수험생 데이터 업로드에 저장하지 않은 변경사항이 있습니다.",
    saveAndClose: candidateActions.saveCandidateUploadAndClose,
  });
  modalCloseGuard.registerModal({
    id: "candidate-detail",
    closeActions: ["close-candidate-detail-modal"],
    close: candidateActions.closeCandidateDetailModal,
    isBusy: () => Boolean(appState.candidates.detail.isSaving || appState.candidates.detail.isPhotoUploading),
    isDirty: candidateActions.isCandidateDetailDirty,
    isOpen: () => Boolean(appState.candidates.detail.isOpen),
    message: "수험생 정보에 저장하지 않은 변경사항이 있습니다.",
    saveAndClose: candidateActions.saveCandidateDetailAndClose,
  });
  modalCloseGuard.registerModal({
    id: "template-preview",
    closeActions: ["close-template-preview"],
    close: editorActions.closeTemplatePreview,
    isDirty: () => false,
    isOpen: () => Boolean(appState.templateEditor.isPreviewOpen),
  });
  modalCloseGuard.registerModal({
    id: "data-tag-samples",
    closeActions: ["close-data-tag-sample-modal"],
    close: editorActions.closeDataTagSampleModal,
    isBusy: () => Boolean(appState.templateEditor.isSavingDataTagSettings),
    isDirty: editorActions.isDataTagSampleModalDirty,
    isOpen: () => Boolean(appState.templateEditor.dataTagSampleModal?.isOpen),
    message: "데이터 태그 설정에 저장하지 않은 변경사항이 있습니다.",
    saveAndClose: editorActions.saveDataTagSampleModal,
  });
  modalCloseGuard.registerModal({
    id: "template-editor-unsaved",
    cancel: clearPendingTemplateEditorAction,
    close: discardTemplateEditorChangesAndRunPendingAction,
    getPromptOptions: getPendingTemplateEditorPromptOptions,
    isBusy: () => Boolean(appState.templateEditor.isSaving),
    isDirty: isTemplateEditorUnsaved,
    isOpen: hasPendingTemplateEditorAction,
    message: "수험생확인대장 양식에 저장하지 않은 변경사항이 있습니다.",
    saveAndClose: saveTemplateEditorChangesAndRunPendingAction,
  });
  modalCloseGuard.registerModal({
    id: "pdf-generation-create",
    closeActions: ["close-pdf-generation-create-modal"],
    close: generationActions.closePdfGenerationCreateModal,
    isBusy: () => Boolean(appState.pdfGenerations.createModal.isSubmitting),
    isDirty: () => false,
    isOpen: () => Boolean(appState.pdfGenerations.createModal.isOpen),
  });
  modalCloseGuard.registerModal({
    id: "pdf-generation-template-preview",
    closeActions: ["close-pdf-generation-template-preview"],
    close: generationActions.closePdfGenerationTemplatePreview,
    isDirty: () => false,
    isOpen: () => Boolean(appState.pdfGenerations.createModal.templatePreview?.isOpen),
  });
  modalCloseGuard.registerModal({
    id: "pdf-generation-detail",
    closeActions: ["close-pdf-generation-detail-modal"],
    close: generationActions.closePdfGenerationDetailModal,
    isDirty: () => false,
    isOpen: () => Boolean(appState.pdfGenerations.detailModal?.isOpen),
  });
  modalCloseGuard.registerModal({
    id: "pdf-generation-download",
    closeActions: ["close-pdf-generation-download-modal"],
    close: generationActions.closePdfGenerationDownloadModal,
    isBusy: () => Boolean(appState.pdfGenerations.downloadModal.isSubmitting),
    isDirty: () => false,
    isOpen: () => Boolean(appState.pdfGenerations.downloadModal.isOpen),
  });
  modalCloseGuard.registerModal({
    id: "pdf-generation-generated-result",
    closeActions: ["close-pdf-generation-generated-result-modal"],
    close: generationActions.closePdfGenerationGeneratedResultModal,
    isBusy: () => Boolean(appState.pdfGenerations.generatedResultModal?.isSubmitting),
    isDirty: () => false,
    isOpen: () => Boolean(appState.pdfGenerations.generatedResultModal?.isOpen),
  });
  modalCloseGuard.registerModal({
    id: "pdf-generation-delete",
    closeActions: ["close-pdf-generation-delete-confirm"],
    close: generationActions.closePdfGenerationDeleteConfirm,
    isBusy: () => Boolean(appState.pdfGenerations.deleteConfirm?.isDeleting),
    isDirty: () => false,
    isOpen: () => Boolean(appState.pdfGenerations.deleteConfirm?.isOpen),
  });
  modalCloseGuard.registerModal({
    id: "data-deletion",
    closeActions: ["close-data-deletion-modal"],
    close: dataDeletionActions.closeDataDeletionModal,
    isBusy: () => Boolean(appState.dataDeletion?.isDeleting),
    isDirty: () => false,
    isOpen: () => Boolean(appState.dataDeletion?.modal?.isOpen),
  });
}
