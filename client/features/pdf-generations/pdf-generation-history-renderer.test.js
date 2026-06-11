import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationView } from "./pdf-generation-history-renderer.js";

const access = Object.freeze({
  permissions: {
    downloadPdfs: true,
    generatePdfs: true,
  },
});

function renderViewWithSelection(selectedGenerationIds = []) {
  return renderPdfGenerationView({
    access,
    pdfGenerations: {
      items: [
        { id: "first", status: "completed", templateName: "A" },
        { id: "second", status: "completed", templateName: "B" },
      ],
      loading: false,
      rerunningGenerationIds: [],
      selectedGenerationIds,
      table: {
        filters: {},
        page: 1,
        pageSize: 1,
        sortRules: [],
      },
      total: 2,
    },
  });
}

test("PDF generation select-all header reflects all filtered rows, not only the current page", () => {
  const partiallySelectedHtml = renderViewWithSelection(["first"]);
  const fullySelectedHtml = renderViewWithSelection(["first", "second"]);

  assert.doesNotMatch(partiallySelectedHtml, /data-pdf-generation-select-all type="checkbox" checked/);
  assert.match(fullySelectedHtml, /data-pdf-generation-select-all type="checkbox" checked/);
});

test("PDF generation delete button is enabled only when at least one completed row is selected", () => {
  const emptySelectionHtml = renderViewWithSelection([]);
  const selectedHtml = renderViewWithSelection(["first"]);
  const emptyDeleteButtonHtml = emptySelectionHtml.match(
    /<button[\s\S]*?data-action="open-pdf-generation-delete-confirm"[\s\S]*?<\/button>/,
  )?.[0] || "";
  const selectedDeleteButtonHtml = selectedHtml.match(
    /<button[\s\S]*?data-action="open-pdf-generation-delete-confirm"[\s\S]*?<\/button>/,
  )?.[0] || "";

  assert.match(emptyDeleteButtonHtml, /disabled/);
  assert.doesNotMatch(selectedDeleteButtonHtml, /disabled/);
});

test("PDF generation write buttons stay visible but disabled for read-only school access", () => {
  const html = renderPdfGenerationView({
    access: {
      permissions: {
        downloadPdfs: true,
        generatePdfs: true,
      },
      schoolAccess: {
        canManage: false,
        schoolId: "school-readonly",
      },
    },
    pdfGenerations: {
      items: [{ id: "first", status: "completed", templateName: "A" }],
      loading: false,
      rerunningGenerationIds: [],
      selectedGenerationIds: ["first"],
      table: {
        filters: {},
        page: 1,
        pageSize: 30,
        sortRules: [],
      },
      total: 1,
    },
  });
  const createButtonHtml = html.match(/<button[\s\S]*?data-action="open-pdf-generation-create-modal"[\s\S]*?<\/button>/)?.[0] || "";
  const deleteButtonHtml = html.match(/<button[\s\S]*?data-action="open-pdf-generation-delete-confirm"[\s\S]*?<\/button>/)?.[0] || "";

  assert.match(createButtonHtml, /disabled/);
  assert.match(deleteButtonHtml, /disabled/);
});

test("PDF generation header keeps only the selected count badge", () => {
  const html = renderViewWithSelection(["first"]);
  const headerActionsHtml = html.match(/<div class="table-header-actions pdf-generation-header-actions">[\s\S]*?<\/div>/)?.[0] || "";
  const badgeMatches = headerActionsHtml.match(/class="status-badge neutral"/g) || [];

  assert.equal(badgeMatches.length, 1);
  assert.match(headerActionsHtml, /선택 1건/);
  assert.doesNotMatch(headerActionsHtml, /완료 \d+건/);
  assert.doesNotMatch(headerActionsHtml, /총 \d+건/);
});

test("PDF generation grid adds detail column to the right of print", () => {
  const html = renderViewWithSelection([]);
  const printHeaderIndex = html.indexOf('<span class="table-header-label">인쇄</span>');
  const detailHeaderIndex = html.indexOf('<span class="table-header-label">상세</span>');

  assert.ok(printHeaderIndex >= 0);
  assert.ok(detailHeaderIndex > printHeaderIndex);
  assert.match(html, /pdf-generation-detail-column/);
});

test("PDF generation grid does not render filter strip when filters are active", () => {
  const html = renderPdfGenerationView({
    access,
    pdfGenerations: {
      items: [
        {
          id: "first",
          resultScope: { track: "수시" },
          status: "completed",
        },
      ],
      loading: false,
      rerunningGenerationIds: [],
      selectedGenerationIds: [],
      table: {
        filters: { track: ["수시"] },
        page: 1,
        pageSize: 25,
        sortRules: [],
      },
      total: 1,
    },
  });

  assert.doesNotMatch(html, /class="filter-strip"/);
  assert.doesNotMatch(html, /적용된 필터/);
});

test("PDF generation grid page-size picker uses the admitcard option set", () => {
  const html = renderPdfGenerationView({
    access,
    pdfGenerations: {
      items: Array.from({ length: 31 }, (_, index) => ({
        id: `generation-${index + 1}`,
        status: "completed",
      })),
      loading: false,
      rerunningGenerationIds: [],
      selectedGenerationIds: [],
      table: {
        filters: {},
        page: 1,
        pageSize: 30,
        pageSizeMenuOpen: true,
        sortRules: [],
      },
      total: 31,
    },
  });

  assert.match(html, /data-pdf-generation-page-size-option="30"/);
  assert.match(html, /data-pdf-generation-page-size-option="2000"/);
  assert.match(html, /data-pdf-generation-grid-nav="next"[\s\S]*data-pdf-generation-grid-page="2"/);
  assert.match(html, /data-pdf-generation-grid-page-picker/);
  assert.match(html, /class="table-pagination-divider"/);
  assert.match(html, /data-pdf-generation-grid-page-picker[\s\S]*class="page-picker-label">page<\/span>/);
  assert.match(html, /<option value="2"[\s\S]*>2<\/option>/);
  assert.match(html, /모두 표시/);
  assert.doesNotMatch(html, /data-pdf-generation-page-size-option="20"/);
});

test("PDF generation artifact tab renders merged and zip downloads", () => {
  const html = renderPdfGenerationView({
    access,
    pdfGenerations: {
      activeTab: "artifacts",
      artifactItems: [
        {
          createdAt: "2026-05-20T01:02:03.000Z",
          downloadUrl: "/api/pdf-generations/merged/pdf-merged-1/download?name=merged.pdf",
          fileExists: true,
          fileName: "merged.pdf",
          fileSizeBytes: 1536,
          generationCount: 2,
          id: "pdf-merged-1",
          kind: "merged",
          pageCount: 6,
        },
        {
          createdAt: "2026-05-20T02:03:04.000Z",
          downloadUrl: "/api/pdf-generations/archives/pdf-archive-1/download?name=archive.zip",
          fileExists: true,
          fileName: "archive.zip",
          fileSizeBytes: 2048,
          generationCount: 3,
          id: "pdf-archive-1",
          kind: "archive",
        },
        {
          createdAt: "2026-05-20T03:04:05.000Z",
          downloadUrl: "/api/pdf-generations/merged/pdf-merged-2/download?name=merged-2.pdf",
          fileExists: true,
          fileName: "merged-2.pdf",
          fileSizeBytes: 4096,
          generationCount: 1,
          id: "pdf-merged-2",
          kind: "merged",
          pageCount: 12,
        },
      ],
      artifactLoading: false,
      artifactTable: {
        filterMenuKey: "kind",
        filterMenuPosition: null,
        filterMenuSearch: "",
        filters: {},
        page: 1,
        pageSize: 30,
        pageSizeMenuOpen: true,
        sortRules: [{ direction: "desc", key: "createdAt" }],
      },
      items: [],
      rerunningGenerationIds: [],
      selectedGenerationIds: [],
      table: {
        filters: {},
        page: 1,
        pageSize: 30,
        sortRules: [],
      },
      totalArtifacts: 3,
    },
  });

  assert.match(html, /data-pdf-generation-tab="artifacts"/);
  const sectionHeaderIndex = html.indexOf('<div class="section-header">');
  const tabIndex = html.indexOf('class="pdf-generation-view-tabs"');
  const headerActionsIndex = html.indexOf('class="table-header-actions pdf-generation-header-actions"');
  const artifactTableIndex = html.indexOf('class="table-wrap pdf-generation-artifact-table-wrap"');

  assert.ok(sectionHeaderIndex >= 0);
  assert.ok(tabIndex > sectionHeaderIndex);
  assert.ok(headerActionsIndex > tabIndex);
  assert.ok(artifactTableIndex > headerActionsIndex);
  assert.match(html, /병합\/ZIP 파일/);
  assert.match(html, /merged\.pdf/);
  assert.match(html, /archive\.zip/);
  assert.match(html, /병합 PDF/);
  assert.match(html, /파일 내용/);
  assert.match(html, /다운로드/);
  assert.match(html, /12페이지/);
  assert.match(html, /6페이지/);
  assert.match(html, /PDF 3개/);
  assert.match(html, /data-pdf-generation-artifact-grid-sort="createdAt"/);
  assert.match(html, /data-pdf-generation-artifact-grid-filter="kind"/);
  assert.match(html, /data-pdf-generation-artifact-page-size-option="2000"/);
  assert.match(html, /data-pdf-generation-artifact-grid-nav="next"/);
  assert.match(html, /data-pdf-generation-artifact-grid-page-picker/);
  assert.match(html, /pdf-generation-artifact-filter-menu/);
  assert.match(html, /data-pdf-generation-artifact-filter-option/);
  assert.match(html, /data-action="open-pdf-generation-download-modal"[\s\S]*?disabled/);
  assert.match(html, /data-action="open-pdf-generation-create-modal"[\s\S]*?disabled/);
  assert.match(html, /data-action="open-pdf-generation-delete-confirm"[\s\S]*?disabled/);
  assert.doesNotMatch(html, /상태\/다운로드/);
  assert.doesNotMatch(html, /다운로드 가능/);
  assert.match(html, /data-action="download-pdf-generation-artifact"/);
  assert.match(html, /refresh-pdf-generation-artifacts/);
});
