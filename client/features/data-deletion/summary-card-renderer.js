import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { dataDeletionItems } from "./constants.js";

const deleteIcon = `
  <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 6h18"></path>
    <path d="M8 6V4h8v2"></path>
    <path d="M19 6l-1 14H6L5 6"></path>
    <path d="M10 11v5"></path>
    <path d="M14 11v5"></path>
  </svg>
`;

export function renderDataDeletionCard(item, state = {}, options = {}) {
  const isAll = item.scope === "all";
  const isDeleting = Boolean(state.isDeleting && state.activeScope === item.scope);
  const disabled = Boolean(options.disabled || state.isDeleting);
  const className = [
    "data-deletion-item",
    "system-data-delete-card",
    isAll ? "data-deletion-item-all system-data-delete-card-all" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${className}">
      <div class="data-deletion-item-layout system-data-delete-card-layout ${isAll ? "is-emphasized" : ""}">
        <div class="data-deletion-item-copy system-data-delete-card-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.description)}</span>
          <div class="data-deletion-item-summary">
            <span>대상 데이터</span>
            <ul>
              ${(item.summary || []).map((summaryItem) => `<li>${escapeHtml(summaryItem)}</li>`).join("")}
            </ul>
          </div>
        </div>
        <div class="data-deletion-item-action system-data-delete-card-action">
          <button
            class="icon-button data-deletion-delete-button system-data-delete-button ${isDeleting ? "is-loading" : ""}"
            data-action="open-data-deletion-modal"
            data-data-deletion-scope="${escapeHtml(item.scope)}"
            type="button"
            aria-label="${escapeHtml(item.title)} 삭제"
            title="${escapeHtml(item.title)} 삭제"
            ${disabled ? "disabled" : ""}
          >
            ${deleteIcon}
          </button>
        </div>
      </div>
    </article>
  `;
}

export function renderDataDeletionView({ access, dataDeletion, school }) {
  const canDeleteData = hasAccess(access, "deleteProjectData");
  const hasSchool = Boolean(String(school?.id || "").trim());
  const disabled = !canDeleteData || !hasSchool;
  const statusMessage = String(dataDeletion?.statusMessage || "").trim();
  const statusType = String(dataDeletion?.statusType || "").trim();
  const statusClass = statusType === "warning" ? " warning" : statusType === "success" ? " success" : "";
  const schoolName = String(school?.name || "").trim();

  return `
    <section class="view-stack data-deletion-view system-settings-view">
      <article class="form-card data-deletion-panel">
        <div class="section-header">
          <div class="menu-section-copy">
            <h3>데이터 삭제</h3>
            <p>${escapeHtml(schoolName || "현재 학교")}의 운영 데이터를 범위별로 삭제합니다. 삭제된 데이터는 복구할 수 없습니다.</p>
          </div>
        </div>
        <div class="data-deletion-form system-data-delete-form">
          <div class="data-deletion-grid system-data-delete-grid">
            ${dataDeletionItems.map((item) => renderDataDeletionCard(item, dataDeletion, { disabled })).join("")}
          </div>
        </div>
        ${
          !canDeleteData
            ? '<p class="data-deletion-status system-data-delete-status warning">데이터 삭제 권한이 없습니다.</p>'
            : !hasSchool
              ? '<p class="data-deletion-status system-data-delete-status warning">학교를 먼저 선택하세요.</p>'
              : statusMessage
                ? `<p class="data-deletion-status system-data-delete-status${statusClass}" id="dataDeletionStatus">${escapeHtml(statusMessage)}</p>`
                : '<p class="data-deletion-status system-data-delete-status" id="dataDeletionStatus" aria-live="polite"></p>'
        }
      </article>
    </section>
  `;
}
