import { escapeHtml } from "../../app/html-utils.js";

const roleLabels = Object.freeze({
  admin: "관리자",
  guest: "로그인 필요",
  super_admin: "슈퍼 관리자",
  user: "사용자",
});

function renderLogoutButton() {
  return `
    <button
      class="topbar-icon-button topbar-logout-button"
      data-action="logout"
      data-auth-logout="true"
      id="logoutButton"
      type="button"
      aria-label="로그아웃"
      title="로그아웃"
    >
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 7.5V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-1.5"></path>
        <path d="M10 12h9"></path>
        <path d="m16 8 4 4-4 4"></path>
      </svg>
    </button>
  `;
}

function renderLoginButton() {
  return `
    <a class="topbar-icon-button topbar-login-button" href="/login" aria-label="로그인" title="로그인">
      <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"></path>
        <path d="M5 20a7 7 0 0 1 14 0"></path>
      </svg>
    </a>
  `;
}

function renderTemplateListButton(showButton) {
  if (!showButton) {
    return "";
  }

  return `
    <button class="topbar-list-button" data-go-view="schoolManagement" id="topbarTemplateListButton" type="button">
      학교 목록
    </button>
  `;
}

function renderTopbarSeparator(kind = "") {
  return `<span class="topbar-separator" data-topbar-separator="${escapeHtml(kind)}" aria-hidden="true"></span>`;
}

function renderCurrentSchoolMeta({ currentView = "", school = null }) {
  if (currentView === "schoolManagement" || !school) {
    return "";
  }

  const schoolName = String(school.name || "").trim();
  const schoolCode = String(school.code || school.id || "").trim();
  const displayName = schoolName || schoolCode;

  if (!displayName) {
    return "";
  }

  return `
    <div class="topbar-school-card" id="currentSchoolMeta" title="${escapeHtml(displayName)}">
      <span class="topbar-school-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M3.8 8.2 10 4.4l6.2 3.8-6.2 3.8-6.2-3.8Z"></path>
          <path d="M6.1 10.2v3.1c0 1.1 1.75 2 3.9 2s3.9-.9 3.9-2v-3.1"></path>
        </svg>
      </span>
      <span class="topbar-school-meta">
        <strong id="currentSchoolName">${escapeHtml(displayName)}</strong>
        ${schoolCode && schoolCode !== displayName ? `<small id="currentSchoolCode">${escapeHtml(schoolCode)}</small>` : ""}
      </span>
    </div>
  `;
}

function getRoleLabel({ access, auth }) {
  const role = auth?.role || access?.currentRole || "";

  return access?.roleLabel || roleLabels[role] || role || "-";
}

function formatAccountParts({ access, auth }) {
  const userId = String(auth?.user?.userId || auth?.user?.username || "admin").trim() || "admin";

  return {
    roleLabel: getRoleLabel({ access, auth }),
    userId,
  };
}

function getAvatarLabel(value = "") {
  const normalizedValue = String(value || "").trim();

  return normalizedValue ? normalizedValue.slice(0, 1).toUpperCase() : "관";
}

function renderAccountMeta({ access, auth, isGuest = false, userId: userIdOverride = "", roleLabel: roleLabelOverride = "" }) {
  const { roleLabel, userId } = userIdOverride || roleLabelOverride
    ? {
        roleLabel: String(roleLabelOverride || ""),
        userId: String(userIdOverride || ""),
      }
    : formatAccountParts({ access, auth });

  return `
    <div class="topbar-account-card ${isGuest ? "guest" : ""}" id="currentUserMeta">
      <span class="topbar-account-avatar" aria-hidden="true">${escapeHtml(getAvatarLabel(userId))}</span>
      <div class="user-meta">
        <strong id="currentUserId">${escapeHtml(userId)}</strong>
        <span class="user-role" id="currentUserRole">${escapeHtml(roleLabel)}</span>
      </div>
    </div>
  `;
}

export function renderAuthStatus({ access, auth, currentView = "templateManagement", school = null }) {
  const showTemplateListButton = currentView !== "schoolManagement";
  const currentSchoolMeta = renderCurrentSchoolMeta({ currentView, school });
  const schoolAccountSeparator = currentSchoolMeta ? renderTopbarSeparator("school-account") : "";

  if (!auth.enabled) {
    return `
      ${currentSchoolMeta}
      ${schoolAccountSeparator}
      ${renderAccountMeta({ access, auth, isGuest: false })}
      ${renderTemplateListButton(showTemplateListButton)}
    `;
  }

  if (!auth.authenticated) {
    return `
      ${renderAccountMeta({ auth, isGuest: true, roleLabel: "세션 없음", userId: "로그인 필요" })}
      ${renderLoginButton()}
    `;
  }

  return `
    ${currentSchoolMeta}
    ${schoolAccountSeparator}
    ${renderAccountMeta({ access, auth, isGuest: false })}
    ${renderLogoutButton()}
    ${showTemplateListButton ? renderTopbarSeparator("logout-school-list") : ""}
    ${renderTemplateListButton(showTemplateListButton)}
  `;
}
