import { hasAccess } from "../../app/access.js";
import { deleteJson, getJson, patchJson, postJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";

const defaultAccountModal = Object.freeze({
  accountId: "",
  errorMessage: "",
  isOpen: false,
  isSaving: false,
  mode: "create",
  password: "",
  role: "admin",
  userId: "",
  userName: "",
});

export function setupAccountActions({ appState, onStateChange }) {
  function resetAccountModal(overrides = {}) {
    appState.accounts.modal = {
      ...defaultAccountModal,
      ...overrides,
    };
  }

  function canManageAccounts() {
    return hasAccess(appState.summary, "manageAccounts");
  }

  async function loadAccounts({ silent = false } = {}) {
    if (!canManageAccounts()) {
      appState.accounts.items = [];
      appState.accounts.total = 0;
      appState.accounts.errorMessage = "";
      resetAccountModal();
      return;
    }

    appState.accounts.loading = true;

    if (!silent) {
      await onStateChange();
    }

    try {
      const payload = await getJson("/api/accounts");

      appState.accounts.errorMessage = "";
      appState.accounts.items = Array.isArray(payload?.items) ? payload.items : [];
      appState.accounts.total = Number(payload?.total) || appState.accounts.items.length;
    } catch (error) {
      appState.accounts.errorMessage = error.message;
      appState.accounts.items = [];
      appState.accounts.total = 0;
      showToast(appState.accounts.errorMessage, { tone: "error" });
    } finally {
      appState.accounts.loading = false;
      await onStateChange();
    }
  }

  function openCreateAccountModal() {
    if (!canManageAccounts()) {
      return false;
    }

    resetAccountModal({
      isOpen: true,
      mode: "create",
    });
    return true;
  }

  function openEditAccountModal(accountId = "") {
    if (!canManageAccounts()) {
      return false;
    }

    const normalizedAccountId = String(accountId || "").trim();
    const account =
      appState.accounts.items.find((item) => String(item.id || item.userId || "") === normalizedAccountId) || null;

    if (!account) {
      showToast("수정할 계정을 찾을 수 없습니다.", { tone: "error" });
      return false;
    }

    resetAccountModal({
      accountId: String(account.id || account.userId || ""),
      isOpen: true,
      mode: "edit",
      role: String(account.role || "user"),
      userId: String(account.userId || account.username || ""),
      userName: String(account.userName || account.displayName || ""),
    });
    return true;
  }

  async function saveAccountModal() {
    const modal = appState.accounts.modal || {};

    if (!canManageAccounts() || modal.isSaving) {
      return false;
    }

    modal.isSaving = true;
    modal.errorMessage = "";
    await onStateChange();

    try {
      const payload = {
        password: modal.password,
        role: modal.role,
        userId: modal.userId,
        userName: modal.userName,
      };

      if (modal.mode === "edit") {
        await patchJson(`/api/accounts/${encodeURIComponent(modal.accountId || modal.userId)}`, payload);
        showToast("계정 정보를 수정했습니다.");
      } else {
        await postJson("/api/accounts", payload);
        showToast("계정을 추가했습니다.");
      }

      resetAccountModal();
      await loadAccounts({ silent: true });
      await onStateChange();
      return true;
    } catch (error) {
      appState.accounts.modal.errorMessage = error.message;
      appState.accounts.modal.isSaving = false;
      showToast(appState.accounts.modal.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    }
  }

  async function deleteAccount(accountId = "") {
    if (!canManageAccounts()) {
      return false;
    }

    const normalizedAccountId = String(accountId || "").trim();
    const account =
      appState.accounts.items.find((item) => String(item.id || item.userId || "") === normalizedAccountId) || null;

    if (!normalizedAccountId || !account) {
      showToast("삭제할 계정을 찾을 수 없습니다.", { tone: "error" });
      return false;
    }

    if (!window.confirm(`"${account.userName || account.userId}" 계정을 삭제하시겠습니까?`)) {
      return false;
    }

    try {
      await deleteJson(`/api/accounts/${encodeURIComponent(normalizedAccountId)}`);
      showToast("계정을 삭제했습니다.");
      await loadAccounts({ silent: true });
      await onStateChange();
      return true;
    } catch (error) {
      appState.accounts.errorMessage = error.message;
      showToast(appState.accounts.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    }
  }

  document.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-account-form]")) {
      return;
    }

    event.preventDefault();
    await saveAccountModal();
  });

  document.addEventListener("input", (event) => {
    const accountModalField = event.target.closest("[data-account-modal-field]");

    if (!accountModalField || !appState.accounts.modal?.isOpen) {
      return;
    }

    const fieldName = accountModalField.dataset.accountModalField || "";

    appState.accounts.modal[fieldName] = accountModalField.value;
  });

  document.addEventListener("change", (event) => {
    const accountModalField = event.target.closest("[data-account-modal-field]");

    if (!accountModalField || !appState.accounts.modal?.isOpen) {
      return;
    }

    const fieldName = accountModalField.dataset.accountModalField || "";

    appState.accounts.modal[fieldName] =
      accountModalField.type === "checkbox" ? accountModalField.checked : accountModalField.value;
  });

  document.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    if (actionTarget.dataset.action === "refresh-accounts") {
      await loadAccounts();
      return;
    }

    if (actionTarget.dataset.action === "open-account-create-modal") {
      openCreateAccountModal();
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "open-account-edit-modal") {
      openEditAccountModal(actionTarget.dataset.accountId || "");
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "close-account-modal") {
      resetAccountModal();
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "delete-account") {
      await deleteAccount(actionTarget.dataset.accountId || "");
    }
  });

  return Object.freeze({
    loadAccounts,
    resetAccountModal,
  });
}
