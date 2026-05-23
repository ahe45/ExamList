export function bindDataDeletionEventHandlers({
  closeDataDeletionConfirmation,
  closeDataDeletionModal,
  confirmDataDeletion,
  openDataDeletionModal,
  setDataDeletionModalScope,
  submitDataDeletionModal,
  updateDataDeletionConfirmation,
  updateDataDeletionModalFilter,
  updateDataDeletionTemplateSelection,
}) {
  document.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-data-deletion-modal-form]")) {
      if (event.target.matches("[data-data-deletion-confirm-form]")) {
        event.preventDefault();
        await confirmDataDeletion();
      }

      return;
    }

    event.preventDefault();
    await submitDataDeletionModal();
  });

  document.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("[data-action]");

    if (actionTarget) {
      const action = actionTarget.dataset.action || "";

      if (action === "close-data-deletion-modal") {
        event.preventDefault();
        await closeDataDeletionModal();
        return;
      }

      if (action === "close-data-deletion-confirm") {
        event.preventDefault();
        await closeDataDeletionConfirmation();
        return;
      }
    }

    const deleteButton = event.target.closest("[data-data-deletion-scope]");

    if (!deleteButton) {
      return;
    }

    event.preventDefault();

    if (deleteButton.disabled) {
      return;
    }

    await openDataDeletionModal(deleteButton.dataset.dataDeletionScope || "");
  });

  document.addEventListener("change", async (event) => {
    const templateSelectAllInput = event.target.closest("[data-data-deletion-template-select-all]");

    if (templateSelectAllInput) {
      await updateDataDeletionTemplateSelection("__all__", Boolean(templateSelectAllInput.checked));
      return;
    }

    const templateInput = event.target.closest("[data-data-deletion-template-id]");

    if (templateInput) {
      await updateDataDeletionTemplateSelection(
        templateInput.dataset.dataDeletionTemplateId || "",
        Boolean(templateInput.checked),
      );
      return;
    }

    const filterInput = event.target.closest("[data-data-deletion-modal-filter]");

    if (filterInput) {
      await updateDataDeletionModalFilter(filterInput.dataset.dataDeletionModalFilter || "", filterInput.value || "");
      return;
    }

    const scopeInput = event.target.closest("[data-data-deletion-modal-scope-select]");

    if (!scopeInput) {
      return;
    }

    await setDataDeletionModalScope(scopeInput.value || "");
  });

  document.addEventListener("input", async (event) => {
    const confirmationInput = event.target.closest("[data-data-deletion-confirmation-input]");

    if (!confirmationInput) {
      return;
    }

    await updateDataDeletionConfirmation(confirmationInput.value || "");
  });
}
