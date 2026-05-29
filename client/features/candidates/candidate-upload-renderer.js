import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import { uploadPolicyOptions } from "./candidate-table-model.js";

function clampUploadPercent(value = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(numericValue)));
}

function renderBusyProgressBar(percent = 0, options = {}) {
  const normalizedPercent = clampUploadPercent(percent);
  const isIndeterminate = Boolean(options.isIndeterminate);

  return `
    <div class="progress-bar ${isIndeterminate ? "is-indeterminate" : ""}" aria-hidden="true">
      <span ${isIndeterminate ? "" : `style="width: ${normalizedPercent}%"`}></span>
    </div>
  `;
}

export function renderCandidatePreviewProgressOverlay(progress = {}) {
  if (!progress.isActive) {
    return "";
  }

  const percent = clampUploadPercent(progress.percent);
  const isIndeterminate = Boolean(progress.isIndeterminate);

  return `
    <div class="busy-overlay candidate-preview-progress-overlay" role="status" aria-live="polite" aria-busy="true">
      <div class="busy-overlay-backdrop"></div>
      <section class="busy-overlay-panel">
        <div class="busy-spinner" aria-hidden="true"></div>
        <strong>${escapeHtml(progress.message || "미리보기를 계산하는 중입니다.")}</strong>
        <small class="busy-overlay-detail">${escapeHtml(progress.detail || "선택한 파일을 처리하고 있습니다.")}</small>
        <div class="busy-overlay-progress" aria-label="수험생 업로드 파일 처리 진행 상태">
          <div class="busy-overlay-progress-meta">
            <span>${isIndeterminate ? "서버 처리 상태" : "파일 처리율"}</span>
            <span class="busy-overlay-progress-value">${isIndeterminate ? "처리 중" : `${percent}%`}</span>
          </div>
          ${renderBusyProgressBar(percent, { isIndeterminate })}
        </div>
      </section>
    </div>
  `;
}

function renderUploadSummaryCard({ count = null, label = "", tone = "neutral" } = {}) {
  const countText = count === null ? "-" : formatCount(count);

  return `
    <div class="upload-preview-summary-card is-${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${countText}</strong>
    </div>
  `;
}

function renderUploadSummaryGrid(items = []) {
  return `
    <div class="upload-preview-summary-grid">
      ${items.map((item) => renderUploadSummaryCard(item)).join("")}
    </div>
  `;
}

function renderUploadPreview(preview) {
  if (!preview) {
    return `
      <div class="upload-preview-empty">
        <strong>수험생 데이터 미리보기</strong>
        <p>XLSX 파일을 선택하면 신규, 수정, 동일 데이터 건수를 먼저 확인합니다.</p>
      </div>
      ${renderUploadSummaryGrid([
        { label: "신규", tone: "insert" },
        { label: "수정", tone: "update" },
        { label: "동일", tone: "neutral" },
      ])}
    `;
  }

  return `
    <div class="upload-preview-head">
      <div>
        <strong>수험생 데이터 미리보기</strong>
        <p>${escapeHtml(preview.fileName || "선택한 XLSX")} 기준으로 반영 대상을 확인했습니다.</p>
      </div>
      <span class="upload-preview-caption">총 ${formatCount(preview.totalRows)}건</span>
    </div>
    ${renderUploadSummaryGrid([
      { count: preview.insertCount, label: "신규", tone: "insert" },
      { count: preview.updateCount, label: "수정", tone: "update" },
      { count: preview.unchangedCount, label: "동일", tone: "neutral" },
    ])}
  `;
}

function renderUploadPolicyOptions(selectedValue = "insert-update") {
  return `
    <div class="upload-preview-policy">
      <div class="upload-preview-policy-head">
        <strong>기존 데이터 처리</strong>
        <span class="upload-preview-caption">수험번호가 같은 데이터 기준</span>
      </div>
      <div class="upload-preview-policy-options">
        ${uploadPolicyOptions
          .map(
            (option) => `
              <label class="upload-preview-policy-option">
                <input
                  data-candidate-upload-policy
                  name="candidateUploadPolicy"
                  ${selectedValue === option.value ? "checked" : ""}
                  type="radio"
                  value="${escapeHtml(option.value)}"
                />
                <span class="upload-preview-policy-option-copy">
                  <strong>${escapeHtml(option.label)}</strong>
                  <span>${escapeHtml(option.description)}</span>
                </span>
              </label>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderPhotoArchivePreview(preview) {
  if (!preview) {
    return `
      <div class="upload-preview-empty">
        <strong>수험생 사진 미리보기</strong>
        <p>수험번호가 포함된 JPG, JPEG, PNG 파일을 ZIP으로 묶어 선택하면 매칭 결과를 확인합니다.</p>
      </div>
      ${renderUploadSummaryGrid([
        { label: "매칭 가능", tone: "insert" },
        { label: "건너뜀", tone: "neutral" },
        { label: "중복", tone: "update" },
      ])}
    `;
  }

  const uploadableCount = Number(preview.uploadableCount ?? preview.estimatedUploadCount ?? preview.matchedCount ?? 0);
  const skippedCount = Number(
    preview.skippedCount ?? (Number(preview.unmatchedCount || 0) + Number(preview.invalidEntryCount || 0)),
  );
  const duplicateCount = Number(preview.duplicateCount ?? preview.duplicateEntryCount ?? 0);

  return `
    <div class="upload-preview-head">
      <div>
        <strong>수험생 사진 미리보기</strong>
        <p>등록된 수험번호와 파일명을 비교해 반영 가능 여부를 확인했습니다.</p>
      </div>
      <span class="upload-preview-caption">총 ${formatCount(preview.totalEntries)}개 파일</span>
    </div>
    ${renderUploadSummaryGrid([
      { count: uploadableCount, label: "매칭 가능", tone: "insert" },
      { count: skippedCount, label: "건너뜀", tone: "neutral" },
      { count: duplicateCount, label: "중복", tone: "update" },
    ])}
  `;
}

function renderWorkbookUploadPanel(upload = {}) {
  const isPreviewBusy = Boolean(upload.previewProgress?.isActive);

  return `
    <div class="candidate-upload-file-panel">
      <label class="candidate-upload-file-picker">
        <input accept=".xlsx" data-candidate-workbook-file type="file" />
        <span>${escapeHtml(upload.dataFileName || "XLSX 파일 선택")}</span>
      </label>
      <button class="outline-button" data-action="download-candidate-template" type="button">업로드 양식 다운로드</button>
    </div>
    <section class="upload-preview-section ${isPreviewBusy ? "is-busy" : ""}" aria-busy="${isPreviewBusy ? "true" : "false"}">
      ${renderUploadPreview(upload.preview)}
    </section>
    ${renderUploadPolicyOptions(upload.existingDataPolicy)}
  `;
}

function renderPhotoArchiveUploadPanel(upload = {}) {
  const isPreviewBusy = Boolean(upload.previewProgress?.isActive);

  return `
    <div class="candidate-upload-file-panel">
      <label class="candidate-upload-file-picker">
        <input accept=".zip" data-candidate-photo-archive-file type="file" />
        <span>${escapeHtml(upload.photoFileName || "사진 ZIP 파일 선택")}</span>
      </label>
    </div>
    <section class="upload-preview-section ${isPreviewBusy ? "is-busy" : ""}" aria-busy="${isPreviewBusy ? "true" : "false"}">
      ${renderPhotoArchivePreview(upload.photoPreview)}
    </section>
    ${renderUploadPolicyOptions(upload.existingDataPolicy)}
  `;
}

export function renderCandidateUploadProgressOverlay(candidates = {}) {
  const progress = candidates.upload?.progressOverlay || {};

  if (!progress.isOpen) {
    return "";
  }

  const percent = clampUploadPercent(progress.percent);
  const isIndeterminate = Boolean(progress.isIndeterminate);

  return `
    <div class="busy-overlay candidate-upload-progress-overlay" role="status" aria-live="polite" aria-busy="true">
      <div class="busy-overlay-backdrop"></div>
      <section class="busy-overlay-panel">
        <div class="busy-spinner" aria-hidden="true"></div>
        <span class="busy-overlay-kicker">${escapeHtml(progress.stageLabel || "진행 중")}</span>
        <strong>${escapeHtml(progress.title || "데이터 업로드")}</strong>
        <p>${escapeHtml(progress.message || "업로드를 처리하고 있습니다.")}</p>
        ${progress.detail ? `<small class="busy-overlay-detail">${escapeHtml(progress.detail)}</small>` : ""}
        <div class="busy-overlay-progress" aria-label="수험생 데이터 업로드 진행 상태">
          <div class="busy-overlay-progress-meta">
            <span>${isIndeterminate ? "서버 처리 상태" : "파일 크기 기준"}</span>
            <span class="busy-overlay-progress-value">${isIndeterminate ? "처리 중" : `${percent}%`}</span>
          </div>
          ${renderBusyProgressBar(percent, { isIndeterminate })}
        </div>
      </section>
    </div>
  `;
}

export function renderCandidateUploadModal(candidates = {}, options = {}) {
  const upload = candidates.upload || {};

  if (!upload.isOpen) {
    return "";
  }

  const includeBusyOverlays = options.includeBusyOverlays !== false;
  const mode = upload.mode === "photo-archive" ? "photo-archive" : "workbook";

  return `
    <div class="modal-overlay candidate-modal-overlay" data-candidate-modal="upload">
      <div class="modal-card candidate-upload-modal">
        <div class="modal-header">
          <div>
            <p class="modal-kicker">수험생 데이터</p>
            <h2>데이터 업로드</h2>
          </div>
          <button class="icon-button" data-action="close-candidate-upload-modal" type="button" aria-label="닫기">×</button>
        </div>
        <div class="candidate-upload-mode-tabs">
          <button
            class="candidate-upload-mode-tab ${mode === "workbook" ? "active" : ""}"
            data-action="set-candidate-upload-mode"
            data-upload-mode="workbook"
            type="button"
          >
            수험생 데이터
          </button>
          <button
            class="candidate-upload-mode-tab ${mode === "photo-archive" ? "active" : ""}"
            data-action="set-candidate-upload-mode"
            data-upload-mode="photo-archive"
            type="button"
          >
            수험생 사진
          </button>
        </div>
        ${mode === "photo-archive" ? renderPhotoArchiveUploadPanel(upload) : renderWorkbookUploadPanel(upload)}
        <div class="modal-actions">
          <button class="ghost-button" data-action="close-candidate-upload-modal" type="button">취소</button>
          <button class="primary-button" data-action="execute-candidate-upload" ${upload.isUploading ? "disabled" : ""} type="button">
            ${upload.isUploading ? "업로드 중..." : "업로드 실행"}
          </button>
        </div>
      </div>
      ${includeBusyOverlays ? renderCandidatePreviewProgressOverlay(upload.previewProgress) : ""}
    </div>
  `;
}
