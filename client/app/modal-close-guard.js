import { escapeHtml } from "./html-utils.js";

function getPromptState(appState) {
  appState.ui.modalClosePrompt = {
    isOpen: false,
    isSaving: false,
    modalId: "",
    ...(appState.ui.modalClosePrompt || {}),
  };

  return appState.ui.modalClosePrompt;
}

export function renderModalClosePrompt(prompt = {}) {
  if (!prompt.isOpen) {
    return "";
  }

  const isSaving = Boolean(prompt.isSaving);
  const cancelLabel = prompt.cancelLabel || "취소";
  const discardLabel = prompt.discardLabel || "저장 안 함";
  const saveLabel = isSaving
    ? prompt.savingLabel || "저장 중..."
    : prompt.saveLabel || "저장 후 종료";

  return `
    <div class="modal-overlay global-modal-close-overlay" role="dialog" aria-modal="true" aria-labelledby="globalModalClosePromptTitle">
      <div class="modal-card global-modal-close-card">
        <div class="modal-header">
          <div>
            <h2 id="globalModalClosePromptTitle">변경사항을 저장할까요?</h2>
            <p class="global-modal-close-message">${escapeHtml(prompt.message || "저장하지 않은 변경사항이 있습니다.")}</p>
          </div>
        </div>
        <div class="modal-actions global-modal-close-actions">
          <button class="ghost-button" data-global-modal-close-choice="cancel" type="button" ${isSaving ? "disabled" : ""}>${escapeHtml(cancelLabel)}</button>
          <button class="ghost-button" data-global-modal-close-choice="discard" type="button" ${isSaving ? "disabled" : ""}>${escapeHtml(discardLabel)}</button>
          <button class="primary-button" data-global-modal-close-choice="save" type="button" ${isSaving ? "disabled" : ""}>
            ${escapeHtml(saveLabel)}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function createModalCloseGuard({ appState, onStateChange }) {
  const modalConfigs = [];

  function findModalConfig(modalId = "") {
    return modalConfigs.find((config) => config.id === modalId) || null;
  }

  function getOpenModalConfigs() {
    return modalConfigs.filter((config) => Boolean(config.isOpen?.()));
  }

  function getTopOpenModalConfig() {
    const openConfigs = getOpenModalConfigs();

    return openConfigs[openConfigs.length - 1] || null;
  }

  function getModalConfigByCloseAction(actionName = "") {
    return modalConfigs.find((config) => (config.closeActions || []).includes(actionName) && config.isOpen?.()) || null;
  }

  async function closePrompt() {
    appState.ui.modalClosePrompt = {
      isOpen: false,
      isSaving: false,
      modalId: "",
    };
    await onStateChange();
  }

  async function requestClose(modalId = "") {
    const config = findModalConfig(modalId);

    if (!config || !config.isOpen?.()) {
      return false;
    }

    if (config.isBusy?.()) {
      return true;
    }

    if (!config.isDirty?.()) {
      await config.close?.();
      return true;
    }

    const promptOptions =
      typeof config.getPromptOptions === "function"
        ? config.getPromptOptions() || {}
        : {};

    appState.ui.modalClosePrompt = {
      cancelLabel: promptOptions.cancelLabel || config.cancelLabel || "",
      discardLabel: promptOptions.discardLabel || config.discardLabel || "",
      isOpen: true,
      isSaving: false,
      message: promptOptions.message || config.message || "저장하지 않은 변경사항이 있습니다.",
      modalId: config.id,
      saveLabel: promptOptions.saveLabel || config.saveLabel || "",
      savingLabel: promptOptions.savingLabel || config.savingLabel || "",
    };
    await onStateChange();
    return true;
  }

  async function handlePromptChoice(choice = "") {
    const prompt = getPromptState(appState);
    const config = findModalConfig(prompt.modalId);

    if (!prompt.isOpen || !config) {
      return false;
    }

    if (choice === "cancel") {
      await closePrompt();
      await config.cancel?.();
      return true;
    }

    if (choice === "discard") {
      appState.ui.modalClosePrompt = {
        isOpen: false,
        isSaving: false,
        modalId: "",
      };
      await config.close?.();
      return true;
    }

    if (choice === "save") {
      prompt.isSaving = true;
      await onStateChange();
      const didSave = await config.saveAndClose?.();

      if (didSave === false) {
        prompt.isSaving = false;
        await onStateChange();
        return true;
      }

      appState.ui.modalClosePrompt = {
        isOpen: false,
        isSaving: false,
        modalId: "",
      };
      await onStateChange();
      return true;
    }

    return false;
  }

  function registerModal(config = {}) {
    if (!config.id || typeof config.isOpen !== "function" || typeof config.close !== "function") {
      return;
    }

    modalConfigs.push({
      closeActions: [],
      cancel: null,
      cancelLabel: "",
      isBusy: () => false,
      isDirty: () => false,
      discardLabel: "",
      getPromptOptions: null,
      message: "저장하지 않은 변경사항이 있습니다.",
      saveAndClose: config.close,
      saveLabel: "",
      savingLabel: "",
      ...config,
    });
  }

  function attach() {
    document.addEventListener(
      "click",
      async (event) => {
        const promptChoiceTarget = event.target?.closest?.("[data-global-modal-close-choice]");

        if (promptChoiceTarget) {
          event.preventDefault();
          event.stopPropagation();
          await handlePromptChoice(promptChoiceTarget.dataset.globalModalCloseChoice || "");
          return;
        }

        const actionTarget = event.target?.closest?.("[data-action]");

        if (!actionTarget) {
          return;
        }

        const config = getModalConfigByCloseAction(actionTarget.dataset.action || "");

        if (!config) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        await requestClose(config.id);
      },
      true,
    );

    document.addEventListener(
      "keydown",
      async (event) => {
        if (event.key !== "Escape") {
          return;
        }

        const prompt = getPromptState(appState);

        if (prompt.isOpen) {
          const config = findModalConfig(prompt.modalId);

          event.preventDefault();
          event.stopPropagation();
          await closePrompt();
          await config?.cancel?.();
          return;
        }

        const config = getTopOpenModalConfig();

        if (!config) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        await requestClose(config.id);
      },
      true,
    );
  }

  return Object.freeze({
    attach,
    registerModal,
    requestClose,
  });
}
