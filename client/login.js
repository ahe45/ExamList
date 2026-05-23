import { getJson, postJson } from "./app/api-client.js";
import { showToast } from "./app/toast.js";

const form = document.querySelector("[data-login-form]");
const errorElement = document.querySelector("[data-login-error]");
const submitButton = document.querySelector("[data-login-submit]");
const schoolListPath = "/schools";

function getRedirectPath() {
  return schoolListPath;
}

function setError(message = "") {
  const normalizedMessage = String(message || "").trim();

  if (normalizedMessage) {
    showToast(normalizedMessage, { tone: "error" });
  }

  if (!errorElement) {
    return;
  }

  errorElement.textContent = "";
  errorElement.classList.add("hidden");
}

function setLoading(isLoading) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "로그인 중..." : "로그인";
}

async function redirectIfAlreadyAuthenticated() {
  try {
    const session = await getJson("/api/auth/session");

    if (!session.enabled || session.authenticated) {
      window.location.replace(getRedirectPath());
    }
  } catch (_error) {
    setError("로그인 상태를 확인하지 못했습니다. 다시 시도하세요.");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");
  setLoading(true);

  try {
    const formData = new FormData(form);

    await postJson("/api/auth/login", {
      password: String(formData.get("password") || ""),
      username: String(formData.get("username") || "").trim(),
    });

    window.location.replace(getRedirectPath());
  } catch (error) {
    setError(error.message || "로그인에 실패했습니다.");
  } finally {
    setLoading(false);
  }
});

window.__examlistLoginReady = true;
redirectIfAlreadyAuthenticated();
