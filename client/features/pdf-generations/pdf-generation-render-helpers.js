import { formatGenerationUnitLabel as formatSharedGenerationUnitLabel } from "../../app/generation-units.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount, formatDecimalNumber } from "../../app/number-format.js";

export function formatDateTime(value) {
  const dateValue = value ? new Date(value) : null;

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return "-";
  }

  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")} ${String(dateValue.getHours()).padStart(2, "0")}:${String(dateValue.getMinutes()).padStart(2, "0")}`;
}

export function formatFileSize(fileSizeBytes) {
  const size = Number(fileSizeBytes) || 0;

  if (size >= 1024 * 1024) {
    return `${formatDecimalNumber(size / (1024 * 1024), 1)} MB`;
  }

  if (size >= 1024) {
    return `${formatCount(Math.round(size / 1024))} KB`;
  }

  return `${formatCount(size)} B`;
}

export function formatGenerationUnitLabel(value) {
  return formatSharedGenerationUnitLabel(value);
}

export function formatStatusLabel(value) {
  const labelMap = {
    completed: "완료",
    failed: "실패",
    queued: "대기",
    running: "생성 중",
  };

  return labelMap[value] || value || "-";
}

export function formatAuditActionLabel(value) {
  const labelMap = {
    pdf_generation_archive_created: "ZIP 파일 생성",
    pdf_generation_archive_downloaded: "ZIP 다운로드",
    pdf_generation_batch_cancelled: "일괄 생성 중단",
    pdf_generation_batch_completed: "일괄 생성 완료",
    pdf_generation_batch_queued: "일괄 생성 대기 등록",
    pdf_generation_completed: "PDF 생성 완료",
    pdf_generation_deleted: "PDF 삭제",
    pdf_generation_downloaded: "PDF 다운로드",
    pdf_generation_failed: "PDF 생성 실패",
    pdf_generation_job_completed: "PDF 처리 완료",
    pdf_generation_job_cancelled: "PDF 처리 중단",
    pdf_generation_job_failed: "PDF 처리 실패",
    pdf_generation_job_queued: "PDF 처리 대기 등록",
    pdf_generation_job_retry_requested: "PDF 재시도 요청",
    pdf_generation_job_retry_scheduled: "PDF 재시도 예약",
    pdf_generation_job_started: "PDF 처리 시작",
    pdf_generation_merged_created: "PDF 병합",
    pdf_generation_merged_downloaded: "병합 PDF 다운로드",
    pdf_generation_preview_created: "미리보기 생성",
    pdf_generation_queue_connection_error: "대기열 연결 오류",
    pdf_generation_queue_worker_failed: "PDF 처리 오류",
    pdf_generation_retention_cleanup: "보관 정리",
  };

  return labelMap[value] || (value ? "PDF 작업" : "-");
}

function formatAuditMetadataValue(key = "", value = "") {
  if (key === "generationUnit") {
    return formatGenerationUnitLabel(value);
  }

  if (key === "progressPercent") {
    return `${formatCount(value)}%`;
  }

  if (key === "retentionDays") {
    return `${formatCount(value)}일`;
  }

  if (key === "totalFileSizeBytes") {
    return formatFileSize(value);
  }

  if (key === "queueDriver") {
    const normalizedDriver = String(value ?? "").trim().toLowerCase();
    const driverLabelMap = {
      bullmq: "외부 대기열",
      memory: "기본 처리",
    };

    return driverLabelMap[normalizedDriver] || String(value ?? "").trim() || "-";
  }

  if (key === "templateId") {
    return String(value ?? "").trim() || "-";
  }

  if (key === "templateTitle") {
    return String(value ?? "").trim() || "확인 불가";
  }

  return `${formatCount(value)}건`;
}

export function renderAuditMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const labelMap = {
    archiveGenerationCount: "압축 대상",
    attemptCount: "시도 횟수",
    deletedCount: "삭제 PDF",
    failedCount: "실패 PDF",
    fileDeletedCount: "삭제 파일",
    generationCount: "PDF",
    generationUnit: "생성 기준",
    maxAttempts: "최대 재시도",
    progressPercent: "진행률",
    purgedCount: "정리 파일",
    queuedCount: "대기 PDF",
    queueDriver: "처리 방식",
    requestedCount: "요청 PDF",
    retentionDays: "보관 기준",
    runningCount: "진행 PDF",
    succeededCount: "성공 PDF",
    templateTitle: "양식",
    totalFileSizeBytes: "전체 용량",
    totalRequested: "전체 요청",
  };
  const displayOrder = [
    "templateTitle",
    "generationUnit",
    "generationCount",
    "archiveGenerationCount",
    "requestedCount",
    "totalRequested",
    "queuedCount",
    "runningCount",
    "succeededCount",
    "failedCount",
    "deletedCount",
    "fileDeletedCount",
    "purgedCount",
    "totalFileSizeBytes",
    "progressPercent",
    "attemptCount",
    "maxAttempts",
    "retentionDays",
    "queueDriver",
  ];
  const displayMetadata = { ...metadata };

  if (!displayMetadata.templateTitle && displayMetadata.templateId) {
    displayMetadata.templateTitle = "";
  }

  const allowedEntries = displayOrder
    .filter((key) => Object.prototype.hasOwnProperty.call(displayMetadata, key))
    .map((key) => [key, displayMetadata[key]])
    .slice(0, 4);

  if (!allowedEntries.length) {
    return "";
  }

  return allowedEntries
    .map(([key, value]) => `${labelMap[key]} ${formatAuditMetadataValue(key, value)}`)
    .join(" / ");
}

export function getStatusBadgeClass(value) {
  if (value === "completed") {
    return "active";
  }

  if (value === "queued" || value === "running") {
    return "neutral";
  }

  return "danger";
}

export function formatOrientationLabel(value) {
  return value === "landscape" ? "가로" : value === "portrait" ? "세로" : value || "-";
}

export function renderRequestFilters(filters = []) {
  if (!Array.isArray(filters) || !filters.length) {
    return '<p class="helper-text">저장된 요청 필터가 없습니다.</p>';
  }

  return `
    <div class="generation-filter-list">
      ${filters
        .map(
          (filter) => `
            <span class="generation-filter-chip">
              <strong>${escapeHtml(filter.label || filter.key || "-")}</strong>
              <span>${escapeHtml(filter.value || "-")}</span>
            </span>
          `,
        )
        .join("")}
    </div>
  `;
}
