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
          resultScope: { campus: "서울" },
          status: "completed",
        },
      ],
      loading: false,
      rerunningGenerationIds: [],
      selectedGenerationIds: [],
      table: {
        filters: { campus: ["서울"] },
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
