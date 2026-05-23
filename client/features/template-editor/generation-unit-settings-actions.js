import {
  normalizeGenerationUnitFields,
  writeGenerationUnitSettingsToTemplate,
} from "./generation-unit-settings.js";

function readGenerationUnitPriorityFieldsFromDom() {
  return normalizeGenerationUnitFields(
    Array.from(document.querySelectorAll("[data-generation-unit-priority]"))
      .map((control) => String(control?.value || "").trim()),
  );
}

export function syncGenerationUnitPriorityRows(modalElement = document) {
  const modalRoot = modalElement?.querySelector?.(".generation-unit-settings-modal-overlay") ||
    modalElement?.closest?.(".generation-unit-settings-modal-overlay") ||
    modalElement;

  if (!(modalRoot instanceof HTMLElement)) {
    return;
  }

  const selects = Array.from(modalRoot.querySelectorAll("[data-generation-unit-priority]"));
  const selectedValues = selects.map((select) => String(select.value || "").trim()).filter(Boolean);
  const fourthValue = String(selects[3]?.value || "").trim();

  modalRoot.querySelector('[data-generation-unit-priority-row="5"]')?.classList.toggle("hidden", !fourthValue);

  selects.forEach((select) => {
    Array.from(select.options || []).forEach((option) => {
      const value = String(option.value || "").trim();

      option.disabled = Boolean(value && value !== select.value && selectedValues.includes(value));
    });
  });
}

export function createGenerationUnitSettingsActions({
  appState,
  canManageTemplates = () => false,
  onStateChange,
} = {}) {
  function getTemplate() {
    return appState?.templateEditor?.template || null;
  }

  async function openGenerationUnitSettingsModal() {
    if (!canManageTemplates()) {
      return;
    }

    appState.templateEditor.generationUnitModal = {
      isOpen: true,
    };
    await onStateChange?.();
  }

  async function closeGenerationUnitSettingsModal() {
    appState.templateEditor.generationUnitModal = {
      ...(appState.templateEditor.generationUnitModal || {}),
      isOpen: false,
    };
    await onStateChange?.();
  }

  async function saveGenerationUnitSettingsModal() {
    if (!canManageTemplates()) {
      return;
    }

    const template = getTemplate();

    if (!template) {
      await closeGenerationUnitSettingsModal();
      return;
    }

    writeGenerationUnitSettingsToTemplate(template, readGenerationUnitPriorityFieldsFromDom());
    appState.templateEditor.isDirty = true;
    appState.templateEditor.generationUnitModal = {
      ...(appState.templateEditor.generationUnitModal || {}),
      isOpen: false,
    };
    await onStateChange?.();
  }

  return {
    closeGenerationUnitSettingsModal,
    openGenerationUnitSettingsModal,
    saveGenerationUnitSettingsModal,
    syncGenerationUnitPriorityRows,
  };
}
