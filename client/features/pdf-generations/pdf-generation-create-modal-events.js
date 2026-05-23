export async function handlePdfGenerationCreateModalSubmit(event, context) {
  const { submitPdfGenerationCreate } = context;

  if (!event.target.matches("[data-pdf-generation-create-form]")) {
    return false;
  }

  event.preventDefault();
  await submitPdfGenerationCreate();
  return true;
}

export async function handlePdfGenerationCreateModalAction(actionTarget, action, context) {
  const {
    closePdfGenerationCreateModal,
    closePdfGenerationTemplatePreview,
    movePdfGenerationCreateStep,
    openPdfGenerationCreateModal,
    openPdfGenerationFirstResultPreview,
    openPdfGenerationTemplatePreview,
    setPdfGenerationCreateStep,
  } = context;

  if (action === "open-pdf-generation-create-modal") {
    await openPdfGenerationCreateModal();
    return true;
  }

  if (action === "close-pdf-generation-create-modal") {
    await closePdfGenerationCreateModal();
    return true;
  }

  if (action === "open-pdf-generation-template-preview") {
    await openPdfGenerationTemplatePreview();
    return true;
  }

  if (action === "open-pdf-generation-first-result-preview") {
    await openPdfGenerationFirstResultPreview();
    return true;
  }

  if (action === "close-pdf-generation-template-preview") {
    await closePdfGenerationTemplatePreview();
    return true;
  }

  if (action === "set-pdf-generation-create-step") {
    await setPdfGenerationCreateStep(actionTarget.dataset.stepIndex || 0);
    return true;
  }

  if (action === "previous-pdf-generation-create-step") {
    await movePdfGenerationCreateStep("previous");
    return true;
  }

  if (action === "next-pdf-generation-create-step") {
    await movePdfGenerationCreateStep("next");
    return true;
  }

  return false;
}

export async function handlePdfGenerationCreateModalChange(event, context) {
  const { updatePdfGenerationCreateFilter, updatePdfGenerationCreateTemplate } = context;
  const templateSelect = event.target.closest("[data-pdf-generation-template-select]");

  if (templateSelect) {
    await updatePdfGenerationCreateTemplate(templateSelect.value || "");
    return true;
  }

  const createFilterSelect = event.target.closest("[data-pdf-generation-modal-filter]");

  if (createFilterSelect) {
    await updatePdfGenerationCreateFilter(createFilterSelect.dataset.pdfGenerationModalFilter || "", createFilterSelect.value || "");
    return true;
  }

  return false;
}
