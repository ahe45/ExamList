import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfHistoryManagementView } from "./pdf-generation-audit-log-renderer.js";

test("PDF 작업 로그 renders audit logs as a readable grid", () => {
  const html = renderPdfHistoryManagementView({
    pdfGenerations: {
      auditLoading: false,
      auditLogs: [
        {
          action: "pdf_generation_merged_created",
          createdAt: "2026-05-20T01:02:03.000Z",
          entityId: "pdf-merged-1",
          entityType: "pdf_generation_merged",
          id: "audit-1",
          metadata: {
            generationCount: 1234,
            templateId: "template-merged",
            templateTitle: "고사실 수험표",
          },
          status: "completed",
        },
        {
          action: "pdf_generation_job_queued",
          createdAt: "2026-05-20T01:03:03.000Z",
          entityId: "queue-1",
          entityType: "pdf_generation_queue",
          id: "audit-2",
          metadata: {
            queueDriver: "memory",
            queuedCount: 2500,
          },
          status: "queued",
        },
        {
          action: "pdf_generation_internal_code",
          createdAt: "2026-05-20T01:04:03.000Z",
          entityId: "internal-1",
          entityType: "pdf_generation_internal_target",
          id: "audit-3",
          metadata: {},
          status: "completed",
        },
      ],
      auditTable: {
        page: 1,
        pageSize: 30,
        pageSizeMenuOpen: true,
      },
      totalAuditLogs: 1234,
    },
  });

  assert.match(html, /PDF 작업 로그/);
  assert.match(html, /PDF 병합/);
  assert.match(html, /병합 PDF/);
  assert.match(html, /양식 고사실 수험표/);
  assert.match(html, /PDF 1,234건/);
  assert.match(html, /PDF 처리 대기 등록/);
  assert.match(html, /PDF 처리 대기열/);
  assert.match(html, /처리 방식 기본 처리/);
  assert.match(html, /대기 PDF 2,500건/);
  assert.match(html, /총 1,234건/);
  assert.match(html, /기타 PDF 작업/);
  assert.match(html, /data-pdf-audit-grid-sort="action"/);
  assert.match(html, /data-pdf-audit-grid-filter="action"/);
  assert.doesNotMatch(html, /pdf_generation_/);
  assert.doesNotMatch(html, /선택한 PDF를 하나의 파일로 병합했습니다/);
  assert.doesNotMatch(html, /참조:/);
  assert.match(html, /data-action="download-pdf-generation-artifact"/);
  assert.match(html, /\/api\/pdf-generations\/merged\/pdf-merged-1\/download/);
  assert.doesNotMatch(html, /template-merged/);
  assert.match(html, /data-pdf-audit-grid-page-picker/);
  assert.match(html, /data-pdf-audit-page-size-option="30"/);
});

test("PDF 작업 로그 page-size picker uses the shared combo classes", () => {
  const html = renderPdfHistoryManagementView({
    pdfGenerations: {
      auditLoading: false,
      auditLogs: Array.from({ length: 31 }, (_, index) => ({
        action: "pdf_generation_archive_created",
        createdAt: "2026-05-20T01:02:03.000Z",
        entityId: `archive-${index + 1}`,
        entityType: "pdf_generation_archive",
        id: `audit-${index + 1}`,
        metadata: {},
        status: "completed",
      })),
      auditTable: {
        filterMenuKey: "action",
        page: 1,
        pageSize: 30,
        pageSizeMenuOpen: true,
      },
      totalAuditLogs: 31,
    },
  });

  assert.match(html, /class="page-size-trigger"/);
  assert.match(html, /class="table-filter-menu pdf-audit-filter-menu workmate-dashboard-filter-menu"/);
  assert.match(html, /data-pdf-audit-filter-option/);
  assert.match(html, /data-pdf-audit-grid-nav="next"[\s\S]*data-pdf-audit-grid-page="2"/);
  assert.match(html, /<option value="2"[\s\S]*>2<\/option>/);
  assert.match(html, /class="table-pagination-divider"/);
  assert.match(html, /class="page-picker-label">page<\/span>/);
  assert.match(html, /data-pdf-audit-page-size-option="2000"/);
});
