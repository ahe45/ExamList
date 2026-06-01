import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  formatSchoolNameForSave,
  normalizeAcademicYearInputValue,
  normalizeCampusNameInputValue,
  normalizeSchoolNameInputValue,
} from "./utils.js";

function formatUpdatedAtLabel(value = "") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}년 ${pad(date.getMonth() + 1)}월 ${pad(date.getDate())}일 ${pad(date.getHours())}시 ${pad(date.getMinutes())}분`;
}

const schoolActionIcons = Object.freeze({
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

function isProtectedSchool(school = {}) {
  return formatSchoolNameForSave(school.name) === "한국대학교";
}

function renderAcademicYearOptions(selectedValue = "") {
  const selectedYear = normalizeAcademicYearInputValue(selectedValue);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_item, index) => String(currentYear - 5 + index));
  const hasSelectedYear = years.includes(selectedYear);

  return [
    `<option value="" ${hasSelectedYear ? "" : "selected"}>선택</option>`,
    ...years.map(
      (year) => `<option value="${escapeHtml(year)}" ${selectedYear === year ? "selected" : ""}>${escapeHtml(year)}학년도</option>`,
    ),
  ].join("");
}

function renderSchoolRows(schools = [], access = null, schoolState = {}) {
  if (!schools.length) {
    return `
      <div class="school-empty-state">
        <strong>등록된 학교가 없습니다.</strong>
        <p>학교를 먼저 등록한 뒤 양식과 수험생 데이터를 관리하세요.</p>
      </div>
    `;
  }

  return schools
    .map(
      (school) => {
        const hasSchoolManagement = hasAccess(access, "manageTemplates");
        const canManageSchool = hasSchoolManagement && school.canManage !== false;
        const isDeleting = Boolean(schoolState?.isDeleting);
        const isDeletingThisSchool = isDeleting && String(schoolState?.deletingSchoolId || "") === String(school.id || "");
        const isSettingsDisabled = !canManageSchool || isDeleting;
        const isDeleteDisabled = !canManageSchool || isProtectedSchool(school) || isDeleting;
        const campusName = String(school.campusName || "").trim() || "캠퍼스 미설정";
        const deleteTitle = !canManageSchool
          ? "이 학교는 생성자 또는 슈퍼 관리자만 삭제할 수 있습니다."
          : isProtectedSchool(school)
            ? "한국대학교는 삭제할 수 없습니다."
            : "삭제";

        return `
        <article
          class="school-list-row ${isDeletingThisSchool ? "is-deleting" : ""}"
          data-action="open-school-workspace"
          data-school-code="${escapeHtml(school.code || school.id)}"
          data-school-id="${escapeHtml(school.id)}"
        >
          <button class="school-list-main" data-action="open-school-workspace" data-school-code="${escapeHtml(school.code || school.id)}" data-school-id="${escapeHtml(school.id)}" type="button">
            <span class="school-list-heading">
              <span class="school-list-title">${escapeHtml(school.name)}</span>
              <span class="school-list-campus">${escapeHtml(campusName)}</span>
            </span>
            <span class="school-list-meta" aria-label="학교 관리 현황">
              <span class="school-meta-badge">양식 ${formatCount(school.templateCount)}개</span>
              <span class="school-meta-badge">수험생 ${formatCount(school.candidateCount)}건</span>
              <span class="school-meta-badge">최종수정일시 : ${escapeHtml(formatUpdatedAtLabel(school.updatedAt))}</span>
              <span class="school-meta-badge school-created-account-badge">${escapeHtml(school.createdAccount || "-")}</span>
            </span>
          </button>
          ${
            hasSchoolManagement
              ? `
                <div class="school-list-side">
                  <button class="school-icon-action school-settings-button" data-action="open-school-edit-modal" data-school-id="${escapeHtml(school.id)}" type="button" aria-label="${escapeHtml(school.name)} 설정" title="설정" ${isSettingsDisabled ? "disabled" : ""}>
                    ${schoolActionIcons.settings}
                  </button>
                  <button
                    class="school-icon-action school-delete-button ${isDeletingThisSchool ? "is-loading" : ""}"
                    data-action="delete-school"
                    data-school-id="${escapeHtml(school.id)}"
                    type="button"
                    aria-label="${escapeHtml(school.name)} 삭제"
                    title="${escapeHtml(deleteTitle)}"
                    ${isDeleteDisabled ? "disabled" : ""}
                  >
                    ${schoolActionIcons.trash}
                  </button>
                </div>
              `
              : ""
          }
        </article>
      `;
      },
    )
    .join("");
}

export function renderSchoolDeletionProgressOverlay(schools = {}) {
  if (!schools?.isDeleting) {
    return "";
  }

  const progress = schools.deletionProgress || {};
  const schoolName = String(progress.schoolName || "선택한 학교").trim();
  const templateCount = Number(progress.templateCount) || 0;
  const candidateCount = Number(progress.candidateCount) || 0;
  const message = String(progress.message || "").trim() || "학교 데이터를 삭제하고 있습니다. 완료될 때까지 화면을 닫지 마세요.";
  const stageLabel = String(progress.stageLabel || "").trim() || "삭제 처리";

  return `
    <div class="busy-overlay school-delete-progress-overlay" role="alert" aria-live="polite" aria-busy="true" data-school-delete-progress-overlay>
      <div class="busy-overlay-backdrop"></div>
      <section class="busy-overlay-panel school-delete-progress-card">
        <div class="busy-spinner" aria-hidden="true"></div>
        <strong>${escapeHtml(schoolName)} 삭제 중</strong>
        <p>${escapeHtml(message)}</p>
        <div class="busy-overlay-progress" aria-label="학교 삭제 진행 상태">
          <div class="busy-overlay-progress-meta">
            <span>${escapeHtml(stageLabel)}</span>
            <span class="busy-overlay-progress-value">처리 중</span>
          </div>
          <div class="progress-bar is-indeterminate">
            <span></span>
          </div>
        </div>
        <div class="school-delete-progress-counts">
          <span>
            <strong>수험생</strong>
            <em>${formatCount(candidateCount)}건</em>
          </span>
          <span>
            <strong>양식</strong>
            <em>${formatCount(templateCount)}개</em>
          </span>
        </div>
      </section>
    </div>
  `;
}

function renderCreateSchoolModal(schools, access = null) {
  if (!schools.modal.isOpen) {
    return "";
  }

  const isEditMode = schools.modal.mode === "edit";
  const canEditSettings = !schools.modal.settingsLoading;
  const isDeletionPasswordRequired = !hasAccess(access, "deleteSchoolsWithoutPassword");
  const schoolNameInputValue = normalizeSchoolNameInputValue(schools.modal.name);
  const academicYearInputValue = normalizeAcademicYearInputValue(schools.modal.academicYear);
  const campusNameInputValue = normalizeCampusNameInputValue(schools.modal.campusName);

  return `
    <div class="modal-overlay school-modal-overlay">
      <div class="modal-card school-modal-card">
        <div class="modal-header">
          <div>
            ${isEditMode ? "" : '<p class="modal-kicker">학교 등록</p>'}
            <h2>${isEditMode ? "학교 정보 수정" : "새 학교"}</h2>
          </div>
          <button class="icon-button" data-action="close-school-modal" type="button" aria-label="닫기">×</button>
        </div>
        <form class="modal-form" data-school-form>
          <div class="school-modal-field-grid">
            <label class="form-field school-modal-name-field">
              <span>학교명</span>
              <div class="school-suffixed-input">
                <input data-school-modal-field="name" name="name" required type="text" value="${escapeHtml(schoolNameInputValue)}" />
                <span class="school-input-suffix">대학교</span>
              </div>
            </label>
            <label class="form-field">
              <span>학교 코드</span>
              <input class="school-modal-code-input" data-school-modal-field="code" name="code" placeholder="예 : 0000" type="text" value="${escapeHtml(schools.modal.code)}" />
            </label>
            <label class="form-field">
              <span>학년도</span>
              <select
                class="school-academic-year-select"
                data-school-modal-field="academicYear"
                name="academicYear"
                ${canEditSettings ? "" : "disabled"}
              >
                ${renderAcademicYearOptions(academicYearInputValue)}
              </select>
            </label>
            <label class="form-field school-modal-campus-name-field">
              <span>캠퍼스명</span>
              <div class="school-suffixed-input">
                <input data-school-modal-field="campusName" name="campusName" type="text" value="${escapeHtml(campusNameInputValue)}" ${canEditSettings ? "" : "disabled"} />
                <span class="school-input-suffix">캠퍼스</span>
              </div>
            </label>
            <label class="form-field">
              <span>캠퍼스 코드</span>
              <input class="school-modal-code-input" data-school-modal-field="campusCode" name="campusCode" placeholder="예 : 01" type="text" value="${escapeHtml(schools.modal.campusCode || "")}" ${canEditSettings ? "" : "disabled"} />
            </label>
            <span class="school-modal-grid-spacer" aria-hidden="true"></span>
            ${
              isEditMode
                ? ""
                : `
                  <label class="form-field school-modal-deletion-password-field">
                    <span>삭제 비밀번호</span>
                    <input
                      data-school-modal-field="deletionPassword"
                      name="deletionPassword"
                      type="password"
                      autocomplete="new-password"
                      placeholder="삭제 비밀번호"
                      value="${escapeHtml(schools.modal.deletionPassword || "")}"
                      ${isDeletionPasswordRequired ? "required" : ""}
                    />
                  </label>
                  <label class="form-field school-modal-deletion-password-field">
                    <span>삭제 비밀번호 확인</span>
                    <input
                      data-school-modal-field="deletionPasswordConfirm"
                      name="deletionPasswordConfirm"
                      type="password"
                      autocomplete="new-password"
                      placeholder="삭제 비밀번호 재입력"
                      value="${escapeHtml(schools.modal.deletionPasswordConfirm || "")}"
                      ${isDeletionPasswordRequired ? "required" : ""}
                    />
                  </label>
                `
            }
          </div>
          <section class="school-modal-settings-section">
            <div class="school-settings-form school-modal-settings-form">
              <div class="school-logo-preview">
                ${
                  schools.modal.logoDataUrl
                    ? `<img src="${escapeHtml(schools.modal.logoDataUrl)}" alt="학교 로고" />`
                    : `<span>${schools.modal.settingsLoading ? "불러오는 중..." : "로고 없음"}</span>`
                }
              </div>
              <div class="school-settings-fields">
                <label class="form-field">
                  <span>학교 로고</span>
                  <input accept="image/png,image/jpeg,image/webp" data-school-modal-logo-file name="logo" type="file" ${canEditSettings ? "" : "disabled"} />
                </label>
                <button class="ghost-button school-modal-logo-clear-button" data-action="clear-school-modal-logo" type="button" ${canEditSettings ? "" : "disabled"}>로고 삭제</button>
              </div>
            </div>
          </section>
          <div class="modal-actions school-modal-actions">
            <div class="school-modal-actions-left">
              <button class="ghost-button" data-action="close-school-modal" type="button">취소</button>
            </div>
            <div class="school-modal-actions-right">
              <button class="primary-button" type="submit" ${schools.modal.isSaving ? "disabled" : ""}>
                ${schools.modal.isSaving ? "저장 중..." : isEditMode ? "저장" : "등록"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function renderSchoolManagementView({ access, schools }, options = {}) {
  const canManageAccounts = hasAccess(access, "manageAccounts");
  const canManageSchools = hasAccess(access, "manageTemplates");
  const includeBusyOverlays = options.includeBusyOverlays !== false;

  return `
    <section class="surface-panel school-management-panel">
      <div class="section-header">
        <div>
          <h2>학교 선택</h2>
        </div>
        <div class="school-header-actions">
          ${
            canManageAccounts
              ? '<button class="ghost-button" data-go-view="accountManagement" type="button">계정관리</button>'
              : ""
          }
          ${
            canManageSchools
              ? `
                <button class="primary-button" data-action="open-school-modal" type="button">
                  <svg class="button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                  </svg>
                  <span>새 학교</span>
                </button>
              `
              : ""
          }
        </div>
      </div>

      <form class="filter-bar" data-school-filter-form>
        <label class="filter-field school-search-field">
          <span>학교 검색</span>
          <input name="keyword" placeholder="학교명, 코드, 캠퍼스명" type="text" value="${escapeHtml(schools.filters.keyword)}" />
        </label>
        <div class="filter-actions">
          <button class="ghost-button" type="submit">검색</button>
        </div>
      </form>

      <div class="school-list">
        ${schools.loading ? '<p class="helper-text">학교 목록을 불러오는 중입니다.</p>' : renderSchoolRows(schools.items, access, schools)}
      </div>
    </section>
    ${renderCreateSchoolModal(schools, access)}
    ${includeBusyOverlays ? renderSchoolDeletionProgressOverlay(schools) : ""}
  `;
}
