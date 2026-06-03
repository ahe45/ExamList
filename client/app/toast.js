let toastTimer = 0;
const toastDurationMs = 5000;

function getToastRoot() {
  const toastRoot = document.getElementById("examlist-toast-root");
  return toastRoot instanceof HTMLElement ? toastRoot : null;
}

function ensureToastRoot() {
  const existingToastRoot = getToastRoot();

  if (existingToastRoot) {
    return existingToastRoot;
  }

  const toastRoot = document.createElement("div");
  toastRoot.id = "examlist-toast-root";
  toastRoot.className = "toast-root";
  toastRoot.setAttribute("aria-live", "polite");
  toastRoot.setAttribute("aria-atomic", "true");
  document.body.appendChild(toastRoot);
  return toastRoot;
}

export function hideToast() {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = 0;
  }

  const toastRoot = getToastRoot();

  if (!toastRoot) {
    return;
  }

  toastRoot.classList.remove("has-toast");
  toastRoot.replaceChildren();
}

export function showToast(message = "", options = {}) {
  const normalizedMessage = String(message || "").trim();
  const normalizedOptions = typeof options === "string" ? { tone: options } : options || {};

  hideToast();

  if (!normalizedMessage) {
    return;
  }

  const toastRoot = ensureToastRoot();
  const toastMessage = document.createElement("div");
  const tone = String(normalizedOptions.tone || "").trim().toLowerCase();
  const toneClass = ["error", "warning"].includes(tone) ? ` is-${tone}` : "";

  toastMessage.className = `toast-message${toneClass}`;
  toastMessage.setAttribute("role", tone === "error" ? "alert" : "status");
  toastMessage.textContent = normalizedMessage;
  toastRoot.replaceChildren(toastMessage);
  toastRoot.classList.add("has-toast");

  toastTimer = window.setTimeout(() => {
    toastTimer = 0;
    hideToast();
  }, toastDurationMs);
}
