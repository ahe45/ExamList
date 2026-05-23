import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";

const roleOptions = Object.freeze([
  Object.freeze({ label: "슈퍼 관리자", value: "super_admin" }),
  Object.freeze({ label: "관리자", value: "admin" }),
  Object.freeze({ label: "사용자", value: "user" }),
]);

const accountActionIcons = Object.freeze({
  settings: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.38 1.08V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.38H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .38-1.08V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15.4 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.34.35.65.6 1 .31.24.69.38 1.08.38H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"></path>
    </svg>
  `,
  trash: `
    <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    </svg>
  `,
});

function formatDateTime(value = "") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderRoleOptions(selectedRole = "admin") {
  return roleOptions
    .map(
      (option) => `
        <option value="${escapeHtml(option.value)}" ${option.value === selectedRole ? "selected" : ""}>
          ${escapeHtml(option.label)}
        </option>
      `,
    )
    .join("");
}

function renderAccountRows(accounts = []) {
  if (!accounts.length) {
    return `
      <tr>
        <td colspan="5" class="empty-cell">등록된 계정이 없습니다.</td>
      </tr>
    `;
  }

  return accounts
    .map((account) => {
      const accountId = String(account.id || account.userId || "");

      return `
        <tr>
          <td class="table-column-id"><span class="table-cell-text">${escapeHtml(account.userId || account.username || "")}</span></td>
          <td class="table-column-name"><span class="table-cell-text">${escapeHtml(account.userName || account.displayName || "")}</span></td>
          <td class="table-column-role"><span class="status-badge neutral">${escapeHtml(account.roleLabel || account.role || "-")}</span></td>
          <td class="table-column-recentAccess"><span class="table-cell-text">${escapeHtml(formatDateTime(account.lastLoginAt))}</span></td>
          <td class="table-action-column">
            <span class="table-inline-actions table-inline-actions-compact">
              <button class="table-inline-button table-inline-icon-button" data-action="open-account-edit-modal" data-account-id="${escapeHtml(accountId)}" type="button" aria-label="${escapeHtml(account.userName || account.userId || "계정")} 수정" title="수정">${accountActionIcons.settings}</button>
              <button class="table-inline-button table-inline-icon-button danger" data-action="delete-account" data-account-id="${escapeHtml(accountId)}" type="button" aria-label="${escapeHtml(account.userName || account.userId || "계정")} 삭제" title="삭제">${accountActionIcons.trash}</button>
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAccountModal(accounts = {}) {
  const modal = accounts.modal || {};

  if (!modal.isOpen) {
    return "";
  }

  const isEditMode = modal.mode === "edit";

  return `
    <div class="modal-overlay account-modal-overlay">
      <div class="modal-card account-modal-card">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">계정 관리</p>
            <h2>${isEditMode ? "계정 수정" : "계정 추가"}</h2>
          </div>
          <button class="icon-button" data-action="close-account-modal" type="button" aria-label="닫기">×</button>
        </div>
        <form class="modal-form account-modal-form" data-account-form>
          <div class="form-grid account-modal-field-grid">
            <label class="form-field">
              <span>아이디</span>
              <input
                data-account-modal-field="userId"
                name="userId"
                required
                type="text"
                value="${escapeHtml(modal.userId || "")}"
                ${isEditMode ? "disabled" : ""}
              />
            </label>
            <label class="form-field">
              <span>이름</span>
              <input
                data-account-modal-field="userName"
                name="userName"
                required
                type="text"
                value="${escapeHtml(modal.userName || "")}"
              />
            </label>
            <label class="form-field">
              <span>권한</span>
              <select data-account-modal-field="role" name="role">
                ${renderRoleOptions(String(modal.role || "admin"))}
              </select>
            </label>
            <label class="form-field">
              <span>비밀번호</span>
              <input
                autocomplete="new-password"
                data-account-modal-field="password"
                name="password"
                placeholder="${isEditMode ? "변경할 때만 입력" : "1234"}"
                ${isEditMode ? "" : "required"}
                type="password"
                value="${escapeHtml(modal.password || "")}"
              />
            </label>
          </div>
          ${modal.errorMessage ? `<p class="error-banner">${escapeHtml(modal.errorMessage)}</p>` : ""}
          <div class="modal-actions">
            <button class="ghost-button" data-action="close-account-modal" type="button">취소</button>
            <button class="primary-button" type="submit" ${modal.isSaving ? "disabled" : ""}>
              ${modal.isSaving ? "저장 중..." : isEditMode ? "저장" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function renderAccountManagementView({ access, accounts }) {
  const canManageAccounts = hasAccess(access, "manageAccounts");

  if (!canManageAccounts) {
    return `
      <section class="surface-panel account-management-panel">
        <div class="section-header">
          <div class="menu-section-copy">
            <h2>계정 관리</h2>
            <p>슈퍼 관리자만 접근할 수 있습니다.</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="view-stack table-view-stack account-management-panel">
      <article class="table-card result-grid-card">
        <div class="section-header">
          <div class="menu-section-copy">
            <h2>계정 관리</h2>
            <p>로그인 계정과 권한을 확인합니다.</p>
          </div>
          <div class="table-header-actions">
            <span class="status-badge neutral">총 ${formatCount(accounts.total || accounts.items?.length || 0)}개</span>
            <button class="primary-button" data-action="open-account-create-modal" type="button">계정 추가</button>
            <button class="ghost-button" data-action="refresh-accounts" type="button">새로고침</button>
            <button class="ghost-button" data-go-view="schoolManagement" type="button">학교 목록</button>
          </div>
        </div>
        ${accounts.errorMessage ? `<p class="error-banner">${escapeHtml(accounts.errorMessage)}</p>` : ""}
        <div class="table-wrap">
          <table class="result-grid account-management-grid account-management-table">
            <thead>
              <tr>
                <th class="table-column-id"><div class="table-header-static">아이디</div></th>
                <th class="table-column-name"><div class="table-header-static">이름</div></th>
                <th class="table-column-role"><div class="table-header-static">권한</div></th>
                <th class="table-column-recentAccess"><div class="table-header-static">마지막 로그인</div></th>
                <th class="table-action-column"><div class="table-header-static">관리</div></th>
              </tr>
            </thead>
            <tbody>
              ${accounts.loading ? '<tr><td colspan="5" class="empty-cell">계정 목록을 불러오는 중입니다.</td></tr>' : renderAccountRows(accounts.items || [])}
            </tbody>
          </table>
        </div>
      </article>
      ${renderAccountModal(accounts)}
    </section>
  `;
}
