import { getJson, postJson } from "../../app/api-client.js";
import { showToast } from "../../app/toast.js";

function applyAuthPayload(appState, payload = {}) {
  appState.auth.authenticated = Boolean(payload.authenticated);
  appState.auth.enabled = Boolean(payload.enabled);
  appState.auth.role = payload.role || payload.access?.currentRole || "guest";
  appState.auth.user = payload.user || null;

  if (payload.access) {
    appState.summary.access = payload.access;
  }

  if (!appState.auth.enabled || appState.auth.authenticated) {
    appState.auth.errorMessage = "";
  }
}

export function setupAuthActions({ appState, clearProtectedState, navigateToDashboard, navigateToLogin, onStateChange }) {
  async function loadSession(options = {}) {
    try {
      const payload = await getJson("/api/auth/session");

      applyAuthPayload(appState, payload);
    } catch (error) {
      appState.auth.enabled = true;
      appState.auth.authenticated = false;
      appState.auth.errorMessage = error.message || "로그인 상태를 확인하지 못했습니다.";
      if (!options.silent) {
        showToast(appState.auth.errorMessage, { tone: "error" });
      }
    }

    if (!options.silent) {
      await onStateChange();
    }
  }

  async function logout() {
    appState.auth.loading = true;
    await onStateChange();

    try {
      const payload = await postJson("/api/auth/logout", {});

      applyAuthPayload(appState, payload);
      clearProtectedState();
      if (payload.enabled && typeof navigateToLogin === "function") {
        navigateToLogin({ replace: true, withRedirect: false });
      } else {
        navigateToDashboard();
      }
    } catch (error) {
      appState.auth.errorMessage = error.message || "로그아웃에 실패했습니다.";
      showToast(appState.auth.errorMessage, { tone: "error" });
    } finally {
      appState.auth.loading = false;
      await onStateChange();
    }
  }

  document.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
      return;
    }

    if (actionTarget.dataset.action === "logout") {
      await logout();
    }
  });

  return {
    loadSession,
    logout,
  };
}
