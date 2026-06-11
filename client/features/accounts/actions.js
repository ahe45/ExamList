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
const defaultAccountUploadModal = Object.freeze({
  errorMessage: "",
  file: null,
  fileName: "",
  isOpen: false,
  isUploading: false,
  result: null,
});

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("파일을 읽는 중 오류가 발생했습니다.")));
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);

    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

function triggerBlobDownload(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

async function fetchBlob(url, fallbackMessage = "파일을 다운로드할 수 없습니다.") {
  const response = await fetch(url, {
    credentials: "same-origin",
  });
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    throw new Error(payload?.message || payload?.error || fallbackMessage);
  }

  return response.blob();
}

export function setupAccountActions({ appState, onStateChange }) {
  function resetAccountModal(overrides = {}) {
    appState.accounts.modal = {
      ...defaultAccountModal,
      ...overrides,
    };
  }

  function resetAccountUploadModal(overrides = {}) {
    appState.accounts.uploadModal = {
      ...defaultAccountUploadModal,
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
      resetAccountUploadModal();
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

  function openAccountUploadModal() {
    if (!canManageAccounts()) {
      return false;
    }

    resetAccountUploadModal({
      isOpen: true,
    });
    return true;
  }

  async function closeAccountUploadModal() {
    resetAccountUploadModal();
    await onStateChange();
  }

  async function downloadAccountTemplate() {
    if (!canManageAccounts()) {
      return false;
    }

    try {
      triggerBlobDownload(
        await fetchBlob("/api/accounts/template.xlsx", "계정 업로드 양식을 다운로드할 수 없습니다."),
        "계정 업로드 양식.xlsx",
      );
      return true;
    } catch (error) {
      appState.accounts.errorMessage = error.message;
      showToast(appState.accounts.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    }
  }

  async function uploadAccountWorkbook() {
    const uploadModal = appState.accounts.uploadModal || {};

    if (!canManageAccounts() || uploadModal.isUploading) {
      return false;
    }

    if (!uploadModal.file) {
      uploadModal.errorMessage = "업로드할 엑셀 파일을 선택하세요.";
      showToast(uploadModal.errorMessage, { tone: "warning" });
      await onStateChange();
      return false;
    }

    if (!String(uploadModal.file.name || "").toLowerCase().endsWith(".xlsx")) {
      uploadModal.errorMessage = "계정 업로드는 XLSX 파일만 지원합니다.";
      showToast(uploadModal.errorMessage, { tone: "warning" });
      await onStateChange();
      return false;
    }

    uploadModal.isUploading = true;
    uploadModal.errorMessage = "";
    uploadModal.result = null;
    await onStateChange();

    try {
      const fileContentBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(uploadModal.file));
      const result = await postJson("/api/accounts/import", {
        fileContentBase64,
        fileName: uploadModal.file.name,
      });
      const errorCount = Array.isArray(result?.errors) ? result.errors.length : 0;

      uploadModal.file = null;
      uploadModal.fileName = "";
      uploadModal.result = result || null;
      showToast(
        `계정 업로드 완료: 추가 ${result?.created || 0}개, 수정 ${result?.updated || 0}개, 실패 ${errorCount}개`,
        { tone: errorCount ? "warning" : "success" },
      );
      await loadAccounts({ silent: true });
      await onStateChange();
      return true;
    } catch (error) {
      uploadModal.errorMessage = error.message;
      showToast(uploadModal.errorMessage, { tone: "error" });
      await onStateChange();
      return false;
    } finally {
      uploadModal.isUploading = false;
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

  async function closeAccountModal() {
    resetAccountModal();
    await onStateChange();
  }

  function focusAccountCreateModalUserIdField() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const focusField = () => {
      const field = document.querySelector("[data-account-modal-initial-focus]");

      if (field instanceof HTMLElement && !field.disabled) {
        field.focus();
      }
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(focusField);
      return;
    }

    setTimeout(focusField, 0);
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
      if (event.target.matches("[data-account-upload-form]")) {
        event.preventDefault();
        await uploadAccountWorkbook();
      }
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
    if (event.target?.matches?.("[data-account-upload-file]")) {
      const [file] = event.target.files || [];
      const uploadModal = appState.accounts.uploadModal || {};

      uploadModal.file = file || null;
      uploadModal.fileName = file?.name || "";
      uploadModal.errorMessage = "";
      uploadModal.result = null;
      void onStateChange();
      return;
    }

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
      const opened = openCreateAccountModal();
      await onStateChange();

      if (opened) {
        focusAccountCreateModalUserIdField();
      }
      return;
    }

    if (actionTarget.dataset.action === "open-account-upload-modal") {
      openAccountUploadModal();
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "close-account-upload-modal") {
      await closeAccountUploadModal();
      return;
    }

    if (actionTarget.dataset.action === "download-account-template") {
      await downloadAccountTemplate();
      return;
    }

    if (actionTarget.dataset.action === "open-account-edit-modal") {
      openEditAccountModal(actionTarget.dataset.accountId || "");
      await onStateChange();
      return;
    }

    if (actionTarget.dataset.action === "close-account-modal") {
      await closeAccountModal();
      return;
    }

    if (actionTarget.dataset.action === "delete-account") {
      await deleteAccount(actionTarget.dataset.accountId || "");
    }
  });

  return Object.freeze({
    closeAccountModal,
    closeAccountUploadModal,
    loadAccounts,
    resetAccountModal,
    resetAccountUploadModal,
  });
}
