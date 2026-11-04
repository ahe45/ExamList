import { getOtherRoomPageConfig } from "./other-room-page-controls.js";

export function createOtherRoomSettingsActions({ appState, canManageTemplates = () => false, onStateChange } = {}) {
  const getPage = (id) => appState.templateEditor.template?.layout?.pages?.find((page) => page.id === id);

  async function openOtherRoomSettingsModal() {
    const page = getPage(appState.templateEditor.selectedPageId);
    if (!canManageTemplates() || !page || !getOtherRoomPageConfig(page).enabled) return;
    appState.templateEditor.otherRoomSettingsModal = { isOpen: true, pageId: page.id };
    await onStateChange?.();
  }

  async function closeOtherRoomSettingsModal() {
    appState.templateEditor.otherRoomSettingsModal = { isOpen: false, pageId: "" };
    await onStateChange?.();
  }

  async function saveOtherRoomSettingsModal() {
    if (!canManageTemplates() || !appState.templateEditor.otherRoomSettingsModal?.isOpen) return;
    const page = getPage(appState.templateEditor.otherRoomSettingsModal.pageId);
    const input = document.querySelector('.other-room-settings-modal-overlay [data-other-room-text]');
    if (!page || !getOtherRoomPageConfig(page).enabled || !input) {
      await closeOtherRoomSettingsModal();
      return;
    }
    page.settings.otherRoomPage = { ...getOtherRoomPageConfig(page), text: input.value };
    appState.templateEditor.isDirty = true;
    await closeOtherRoomSettingsModal();
  }

  return { openOtherRoomSettingsModal, closeOtherRoomSettingsModal, saveOtherRoomSettingsModal };
}
