export async function handlePdfGenerationDownloadSubmit(event, context) {
  const {
    submitPdfGenerationDownload,
    submitPdfGenerationGeneratedResultDownload,
  } = context;

  if (event.target.matches("[data-pdf-generation-download-form]")) {
    event.preventDefault();
    await submitPdfGenerationDownload();
    return true;
  }

  if (event.target.matches("[data-pdf-generation-generated-result-form]")) {
    event.preventDefault();
    await submitPdfGenerationGeneratedResultDownload();
    return true;
  }

  return false;
}

export async function handlePdfGenerationDownloadAction(_actionTarget, action, context) {
  const {
    closePdfGenerationDownloadModal,
    closePdfGenerationGeneratedResultModal,
    openPdfGenerationDownloadModal,
  } = context;

  if (action === "open-pdf-generation-download-modal") {
    await openPdfGenerationDownloadModal();
    return true;
  }

  if (action === "close-pdf-generation-download-modal") {
    await closePdfGenerationDownloadModal();
    return true;
  }

  if (action === "close-pdf-generation-generated-result-modal") {
    await closePdfGenerationGeneratedResultModal();
    return true;
  }

  return false;
}

export async function handlePdfGenerationDownloadChange(event, context) {
  const { setPdfGenerationDownloadMode, setPdfGenerationGeneratedResultMode } = context;
  const downloadModeInput = event.target.closest('input[name="downloadMode"]');

  if (downloadModeInput) {
    await setPdfGenerationDownloadMode(downloadModeInput.value || "merge");
    return true;
  }

  const generatedResultModeInput = event.target.closest('input[name="generatedResultMode"]');

  if (generatedResultModeInput) {
    await setPdfGenerationGeneratedResultMode(generatedResultModeInput.value || "merge");
    return true;
  }

  return false;
}
