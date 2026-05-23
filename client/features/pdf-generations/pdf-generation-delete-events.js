export async function handlePdfGenerationDeleteAction(_actionTarget, action, context) {
  const {
    closePdfGenerationDeleteConfirm,
    confirmPdfGenerationDelete,
    openPdfGenerationDeleteConfirm,
  } = context;

  if (action === "open-pdf-generation-delete-confirm") {
    await openPdfGenerationDeleteConfirm();
    return true;
  }

  if (action === "close-pdf-generation-delete-confirm") {
    await closePdfGenerationDeleteConfirm();
    return true;
  }

  if (action === "confirm-pdf-generation-delete") {
    await confirmPdfGenerationDelete();
    return true;
  }

  return false;
}
