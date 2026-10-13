import { getPageNumberConfig } from "./page-number-controls.js";
import { readPageNumberFormatControls } from "./page-number-format-controls.js";

export function createPageNumberFormatActions({ appState, canManageTemplates = () => false, onStateChange } = {}) {
  const getPage = (pageId) => appState.templateEditor.template?.layout?.pages?.find((page) => page.id === pageId);

  async function openPageNumberFormatModal() {
    const page = getPage(appState.templateEditor.selectedPageId);
    if (!canManageTemplates() || !page || !getPageNumberConfig(page).enabled) return;
    appState.templateEditor.pageNumberFormatModal = { isOpen: true, pageId: page.id };
    await onStateChange?.();
  }

  async function closePageNumberFormatModal() {
    appState.templateEditor.pageNumberFormatModal = { isOpen: false, pageId: "" };
    await onStateChange?.();
  }

  async function savePageNumberFormatModal() {
    if (!canManageTemplates() || !appState.templateEditor.pageNumberFormatModal?.isOpen) return;
    const page = getPage(appState.templateEditor.pageNumberFormatModal.pageId);
    const modal = document.querySelector(".page-number-format-modal-overlay");
    if (!page || !getPageNumberConfig(page).enabled || !modal) {
      await closePageNumberFormatModal();
      return;
    }
    if (!modal.querySelector('[data-page-number-format-field="fontSizePt"]').reportValidity()) return;
    page.settings.pageNumber = {
      ...getPageNumberConfig(page),
      format: readPageNumberFormatControls(modal, page.settings.pageNumber.format),
    };
    appState.templateEditor.isDirty = true;
    await closePageNumberFormatModal();
  }

  return { openPageNumberFormatModal, closePageNumberFormatModal, savePageNumberFormatModal };
}
