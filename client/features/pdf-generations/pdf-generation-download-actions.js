export function createPdfGenerationDownloadActions({
  appState,
  downloadGeneratedBatchResult,
  downloadSelectedGenerationArchive,
  getDownloadModalState,
  getGeneratedResultModalState,
  hasPermission,
  onStateChange,
}) {
  async function openPdfGenerationDownloadModal() {
    if (!hasPermission("downloadPdfs")) {
      return;
    }

    const modal = getDownloadModalState();

    modal.errorMessage = "";
    modal.isOpen = true;
    modal.isSubmitting = false;
    modal.mode = "merge";
    await onStateChange();
  }

  async function closePdfGenerationDownloadModal() {
    const modal = getDownloadModalState();

    modal.isOpen = false;
    modal.errorMessage = "";
    modal.isSubmitting = false;
    await onStateChange();
  }

  async function setPdfGenerationDownloadMode(mode) {
    const modal = getDownloadModalState();

    modal.mode = mode === "merge" ? "merge" : "zip";
    await onStateChange();
  }

  async function closePdfGenerationGeneratedResultModal() {
    const modal = getGeneratedResultModalState();

    if (modal.isSubmitting) {
      return;
    }

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
    await onStateChange();
  }

  async function setPdfGenerationGeneratedResultMode(mode) {
    const modal = getGeneratedResultModalState();

    modal.mode = mode === "merge" ? "merge" : "zip";
    await onStateChange();
  }

  async function submitPdfGenerationDownload() {
    const modal = getDownloadModalState();

    await downloadSelectedGenerationArchive(modal.mode);
  }

  async function submitPdfGenerationGeneratedResultDownload() {
    const modal = getGeneratedResultModalState();

    await downloadGeneratedBatchResult(modal.mode);
  }

  return {
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    openPdfGenerationDownloadModal,
    setPdfGenerationDownloadMode,
    setPdfGenerationGeneratedResultMode,
    submitPdfGenerationDownload,
    submitPdfGenerationGeneratedResultDownload,
  };
}
