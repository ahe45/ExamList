import { canUseAccess, hasAccess } from "../../app/access.js";
import { escapeHtml } from "../../app/html-utils.js";
import { formatCount } from "../../app/number-format.js";
import {
  formatAuditActionLabel,
  formatDateTime,
  renderAuditMetadata,
} from "./pdf-generation-render-helpers.js";

export function renderGenerationOperations(pdfGenerations, access) {
  const auditLogs = Array.isArray(pdfGenerations.auditLogs) ? pdfGenerations.auditLogs : [];
  const hasPdfGenerationPermission = hasAccess(access, "generatePdfs");
  const canGeneratePdfs = canUseAccess(access, "generatePdfs");

  return `
    <section class="generation-operations-panel">
      <article class="generation-operations-card">
        <div class="generation-operations-header">
          <div>
            <p class="section-kicker">보관 정책</p>
            <h3>만료 PDF 파일 정리</h3>
          </div>
          ${
            hasPdfGenerationPermission
              ? `
                <button
                  class="ghost-button"
                  data-action="cleanup-expired-pdf-generations"
                  type="button"
                  ${pdfGenerations.isCleaningRetention || !canGeneratePdfs ? "disabled" : ""}
                >
                  ${pdfGenerations.isCleaningRetention ? "정리 중..." : "만료 파일 정리"}
                </button>
              `
              : ""
          }
        </div>
        <p class="helper-text">보관 기간이 지난 완료 PDF 파일만 삭제하고 생성 이력은 유지합니다.</p>
        ${
          pdfGenerations.cleanupResult
            ? `<p class="generation-operation-result">최근 정리 ${formatCount(pdfGenerations.cleanupResult.purgedCount)}건 / 보관 ${formatCount(pdfGenerations.cleanupResult.retentionDays)}일</p>`
            : ""
        }
      </article>

      <article class="generation-operations-card">
        <div class="generation-operations-header">
          <div>
            <p class="section-kicker">감사 로그</p>
            <h3>최근 PDF 작업 기록</h3>
          </div>
          <button class="ghost-button" data-action="refresh-pdf-audit-logs" type="button">새로고침</button>
        </div>
        ${pdfGenerations.auditLoading ? '<p class="helper-text">감사 로그를 불러오는 중입니다.</p>' : ""}
        ${
          auditLogs.length
            ? `
              <div class="generation-audit-list">
                ${auditLogs
                  .slice(0, 6)
                  .map(
                    (log) => `
                      <div class="generation-audit-item">
                        <div>
                          <strong>${escapeHtml(formatAuditActionLabel(log.action))}</strong>
                          <p class="cell-subtext">${escapeHtml(formatDateTime(log.createdAt))} / ${escapeHtml(log.status || "-")}</p>
                        </div>
                        <small>${escapeHtml(renderAuditMetadata(log.metadata))}</small>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            `
            : '<p class="helper-text">표시할 감사 로그가 없습니다.</p>'
        }
      </article>
    </section>
  `;
}
