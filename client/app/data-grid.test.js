import test from "node:test";
import assert from "node:assert/strict";
import { renderGridHeaderCell } from "./data-grid-header.js";
import { renderGridPagination } from "./data-grid-pagination.js";
import { renderGridFilterMenu } from "./data-grid-filter.js";
import { getGridVisibleRows, gridPageSizeOptions } from "./data-grid-model.js";
import { renderCandidateTable } from "../features/candidates/candidate-table-renderer.js";
import { renderPdfGenerationHeaderCell, renderPdfGenerationPagination } from "../features/pdf-generations/pdf-generation-table-renderer.js";
import { renderPdfGenerationArtifactHeaderCell, renderPdfGenerationArtifactPagination } from "../features/pdf-generations/pdf-generation-artifact-table-renderer.js";
import { renderPdfHistoryManagementView } from "../features/pdf-generations/pdf-generation-audit-log-renderer.js";

test("all grid headers show an arrow only for the active sort and preserve filter state", () => {
  for (const namespace of ["candidate", "pdf-generation", "pdf-generation-artifact", "pdf-audit"]) {
    const column = { key: "name", label: "이름" };
    const idle = renderGridHeaderCell(column, { sortRules: [{ key: "other", direction: "asc" }] }, namespace);
    assert.doesNotMatch(idle, /table-sort-icon|table-sort-arrow|8597/);
    assert.match(idle, /aria-sort="none"/);
    assert.ok(idle.includes(`data-${namespace}-grid-filter="name"`));
    for (const [direction, aria, arrow] of [["asc", "ascending", "&uarr;"], ["desc", "descending", "&darr;"]]) {
      const sorted = renderGridHeaderCell(column, { sortRules: [{ key: "name", direction }], filters: { name: ["홍길동"] } }, namespace);
      assert.equal((sorted.match(/class="table-sort-arrow"/g) || []).length, 1);
      assert.ok(sorted.includes(arrow));
      assert.ok(sorted.includes(`aria-sort="${aria}"`));
      assert.match(sorted, /filter-active/);
    }
    const plain = renderGridHeaderCell({ ...column, sortable: false, filterable: false }, {}, namespace);
    assert.doesNotMatch(plain, /table-sort-button|table-sort-icon|table-filter-button|aria-sort/);
  }
});

test("multiline headers preserve the full accessible label and escape each line", () => {
  const column = { key: "code", label: '모집단위코드 "<test>"', headerLines: ["모집", "단위", "<코드>"] };
  const html = renderGridHeaderCell(column, { sortRules: [{ key: "code", direction: "desc" }] }, "candidate");
  assert.match(html, /aria-label="모집단위코드 &quot;&lt;test&gt;&quot;"/);
  assert.equal((html.match(/class="table-header-label-line"/g) || []).length, 3);
  assert.match(html, /&lt;코드&gt;/);
  assert.doesNotMatch(html, /<코드>/);
  assert.match(html, /aria-sort="descending"/);
  assert.match(html, /data-candidate-grid-filter="code"/);
  const plain = renderGridHeaderCell({ ...column, sortable: false }, {}, "candidate");
  assert.match(plain, /table-header-label-multiline/);
  assert.doesNotMatch(plain, /table-sort-button/);
});

test("shared paging handles empty, filtered last page, all rows, and page gaps", () => {
  const rows = Array.from({ length: 123 }, (_, i) => i);
  const last = getGridVisibleRows(rows, { page: 99, pageSize: 30 });
  assert.equal(last.currentPage, 5);
  assert.deepEqual(last.visibleRows, [120, 121, 122]);
  assert.equal(last.startRowNumber, 121);
  assert.equal(last.endRowNumber, 123);
  const all = getGridVisibleRows(rows, { page: 99, pageSize: 0 });
  assert.equal(all.totalPages, 1);
  assert.equal(all.visibleRows.length, 123);
  const empty = getGridVisibleRows([], { page: 9, pageSize: 30 });
  assert.equal(empty.currentPage, 1);
  assert.equal(empty.startRowNumber, 0);
  for (const namespace of ["candidate", "pdf-generation", "pdf-generation-artifact", "pdf-audit"]) {
    const html = renderGridPagination({ namespace, tableState: { pageSize: 30, pageSizeMenuOpen: true }, visibleRows: last, pageSizeOptions: gridPageSizeOptions });
    assert.ok(html.includes(`data-${namespace}-grid-page-picker`));
    assert.ok(html.includes(`data-${namespace}-page-size-option="0"`));
    assert.match(html, /121-123 \/ 총 123건/);
    assert.match(html, /grid-nav="next"[\s\S]*?disabled/);
    const emptyHtml = renderGridPagination({ namespace, tableState: { pageSize: 30 }, visibleRows: empty, pageSizeOptions: gridPageSizeOptions });
    assert.match(emptyHtml, /0 \/ 총 0건/);
    assert.equal((emptyHtml.match(/disabled/g) || []).length, 2);
  }
  const middle = getGridVisibleRows(Array.from({ length: 1000 }), { page: 15, pageSize: 30 });
  const html = renderGridPagination({ namespace: "candidate", tableState: { pageSize: 30 }, visibleRows: middle, pageSizeOptions: gridPageSizeOptions });
  assert.equal((html.match(/table-pagination-ellipsis/g) || []).length, 2);
  assert.match(html, /aria-current="page"[\s\S]*?grid-page="15"/);
});

test("shared filter menus escape values and keep per-page event bindings", () => {
  for (const namespace of ["candidate", "pdf-generation", "pdf-generation-artifact", "pdf-audit"]) {
    const value = '<img src=x onerror="alert(1)">';
    const html = renderGridFilterMenu({ namespace, column: { key: "name", label: "이름" }, tableState: { filters: { name: [value] }, filterMenuSearch: '"<test>' }, visibleOptionValues: [value] });
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img/);
    assert.ok(html.includes(`data-${namespace}-filter-option`));
    assert.ok(html.includes(`data-action="clear-${namespace}-filter"`));
    assert.equal((html.match(/checked/g) || []).length, 2);
  }
});

test("page renderers use common headers and pagination with their own namespaces", () => {
  const candidate = renderCandidateTable({ access: {}, candidates: { items: [], table: { sortRules: [{ key: "name", direction: "asc" }] } } });
  const audit = renderPdfHistoryManagementView({ pdfGenerations: { auditLogs: [], auditTable: { sortRules: [{ key: "action", direction: "desc" }] } } });
  for (const [html, ns] of [[candidate, "candidate"], [audit, "pdf-audit"]]) {
    assert.equal((html.match(/class="table-sort-arrow"/g) || []).length, 1);
    assert.ok(html.includes(`data-${ns}-grid-page-picker`));
    assert.match(html, /table-empty-cell/);
  }
  for (const [header, pager, ns, field] of [
    [renderPdfGenerationHeaderCell, renderPdfGenerationPagination, "pdf-generation", "table"],
    [renderPdfGenerationArtifactHeaderCell, renderPdfGenerationArtifactPagination, "pdf-generation-artifact", "artifactTable"],
  ]) {
    assert.doesNotMatch(header({ key: "name", label: "이름" }, { [field]: { sortRules: [] } }), /table-sort-arrow/);
    assert.match(header({ key: "name", label: "이름" }, { [field]: { sortRules: [{ key: "name", direction: "desc" }] } }), /&darr;/);
    assert.ok(pager({}).includes(`data-${ns}-grid-page-picker`));
  }
});
