import { hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  formatDateTime,
  formatFileSize,
  formatGenerationUnitLabel,
  formatOrientationLabel,
  formatStatusLabel,
  getStatusBadgeClass,
  renderRequestFilters,
} from "./pdf-generation-render-helpers.js";

export function renderPdfGenerationDetailView({ access, detail, pdfGenerations }) {
  const item = detail.item;
  const isRerunning = item ? pdfGenerations.rerunningGenerationIds.includes(item.id) : false;
  const lastRerunGeneration = pdfGenerations.lastRerunGeneration;

  if (detail.loading) {
    return `
      <section class="surface-panel">
        <div class="section-header">
          <div>
            <p class="section-kicker">생성 이력 상세</p>
            <h2>PDF 생성 결과 상세</h2>
          </div>
          <div class="generation-history-actions">
            <button class="ghost-button" data-action="back-to-pdf-generations" type="button">목록</button>
          </div>
        </div>
        <p class="helper-text">생성 이력 상세 정보를 불러오는 중입니다.</p>
      </section>
    `;
  }

  if (!item) {
    return `
      <section class="surface-panel">
        <div class="section-header">
          <div>
            <p class="section-kicker">생성 이력 상세</p>
            <h2>PDF 생성 결과 상세</h2>
          </div>
          <div class="generation-history-actions">
            <button class="ghost-button" data-action="back-to-pdf-generations" type="button">목록</button>
          </div>
        </div>
        <p class="helper-text">표시할 생성 이력이 없습니다.</p>
      </section>
    `;
  }

  return `
    <section class="surface-panel">
      <div class="section-header">
        <div>
          <p class="section-kicker">생성 이력 상세</p>
          <h2>${escapeHtml(item.fileName || "PDF 생성 결과")}</h2>
        </div>
        <div class="generation-history-actions">
          <button class="ghost-button" data-action="back-to-pdf-generations" type="button">목록</button>
          <button class="ghost-button" data-action="refresh-pdf-generation-detail" type="button">새로고침</button>
        </div>
      </div>

      <div class="generation-detail-toolbar">
        <span class="status-badge ${getStatusBadgeClass(item.status)}">${escapeHtml(formatStatusLabel(item.status))}</span>
        ${
          item.status === "queued" || item.status === "running"
            ? `<span class="status-badge neutral">진행률 ${formatCount(item.progressPercent)}%</span>`
            : ""
        }
        <span class="status-badge neutral">${escapeHtml(formatGenerationUnitLabel(item.generationUnit))}</span>
        <span class="status-badge neutral">${escapeHtml(item.targetName || "-")}</span>
        ${
          item.downloadUrl && hasAccess(access, "downloadPdfs")
            ? `<a class="primary-button" href="${escapeHtml(item.downloadUrl)}" download>PDF 다운로드</a>`
            : ""
        }
        ${
          item.canRerun && hasAccess(access, "generatePdfs")
            ? `
              <button
                class="ghost-button"
                data-action="rerun-pdf-generation"
                data-generation-id="${escapeHtml(item.id || "")}"
                type="button"
                ${isRerunning ? "disabled" : ""}
              >
                ${isRerunning ? "재생성 중..." : "재생성"}
              </button>
            `
            : ""
        }
        ${
          item.templateId
            ? `<button class="ghost-button" data-action="open-generation-template" data-template-id="${escapeHtml(item.templateId)}" type="button">템플릿 열기</button>`
            : ""
        }
      </div>

      ${
        lastRerunGeneration
          ? `
            <div class="generation-rerun-summary">
              <strong>최근 재생성</strong>
              <p>${escapeHtml(lastRerunGeneration.fileName || "-")}</p>
              <p class="cell-subtext">
                ${escapeHtml(formatGenerationUnitLabel(lastRerunGeneration.generationUnit))}
                / ${escapeHtml(lastRerunGeneration.targetName || "-")}
              </p>
              ${
                lastRerunGeneration.downloadUrl && hasAccess(access, "downloadPdfs")
                  ? `<a class="inline-button" href="${escapeHtml(lastRerunGeneration.downloadUrl)}" download>다운로드</a>`
                  : ""
              }
              ${
                lastRerunGeneration.id
                  ? `<button class="inline-button" data-action="open-generation-detail" data-generation-id="${escapeHtml(lastRerunGeneration.id)}" type="button">상세 보기</button>`
                  : ""
              }
            </div>
          `
          : ""
      }

      <div class="generation-detail-grid">
        <article class="generation-detail-card">
          <p class="section-kicker">문서 정보</p>
          <dl class="generation-detail-list">
            <div><dt>생성일시</dt><dd>${escapeHtml(formatDateTime(item.createdAt))}</dd></div>
            <div><dt>파일 크기</dt><dd>${escapeHtml(formatFileSize(item.fileSizeBytes))}</dd></div>
            <div><dt>페이지 수</dt><dd>${formatCount(item.pageCount)}페이지</dd></div>
            <div><dt>수험생 수</dt><dd>${formatCount(item.candidateCount)}명</dd></div>
            <div><dt>시도 횟수</dt><dd>${formatCount(Number(item.attemptCount) || 1)}/${formatCount(Number(item.maxAttempts) || 1)}회</dd></div>
          </dl>
        </article>

        <article class="generation-detail-card">
          <p class="section-kicker">요청 정보</p>
          <dl class="generation-detail-list">
            <div><dt>생성 단위</dt><dd>${escapeHtml(formatGenerationUnitLabel(item.requestSummary?.generationUnit || item.generationUnit))}</dd></div>
            <div><dt>대상명</dt><dd>${escapeHtml(item.requestSummary?.targetName || item.targetName || "-")}</dd></div>
            <div><dt>재생성 가능</dt><dd>${item.canRerun ? "가능" : "불가"}</dd></div>
            <div><dt>요청 스냅샷</dt><dd>${item.requestSummary?.available ? "저장됨" : "없음"}</dd></div>
          </dl>
        </article>

        <article class="generation-detail-card">
          <p class="section-kicker">템플릿 스냅샷</p>
          ${
            item.requestSummary?.template
              ? `
                <dl class="generation-detail-list">
                  <div><dt>템플릿명</dt><dd>${escapeHtml(item.requestSummary.template.name || item.templateName || "-")}</dd></div>
                  <div><dt>용지</dt><dd>${escapeHtml(item.requestSummary.template.paperPreset || "-")}</dd></div>
                  <div><dt>방향</dt><dd>${escapeHtml(formatOrientationLabel(item.requestSummary.template.orientation))}</dd></div>
                  <div><dt>페이지 수</dt><dd>${formatCount(item.requestSummary.template.pageCount)}장</dd></div>
                </dl>
              `
              : '<p class="helper-text">저장된 템플릿 스냅샷이 없습니다.</p>'
          }
        </article>
      </div>

      <div class="generation-detail-sections">
        <article class="generation-detail-card">
          <p class="section-kicker">요청 필터</p>
          ${renderRequestFilters(item.requestSummary?.filters)}
        </article>

        <article class="generation-detail-card">
          <p class="section-kicker">경고 및 오류</p>
          ${
            item.errorMessage
              ? `<p class="generation-error-text generation-detail-message">${escapeHtml(item.errorMessage)}</p>`
              : '<p class="helper-text">오류 없음</p>'
          }
          ${
            Array.isArray(item.warnings) && item.warnings.length
              ? item.warnings
                  .map((warning) => `<p class="generation-warning-text generation-detail-message">${escapeHtml(warning)}</p>`)
                  .join("")
              : '<p class="helper-text">경고 없음</p>'
          }
        </article>
      </div>
    </section>
  `;
}
