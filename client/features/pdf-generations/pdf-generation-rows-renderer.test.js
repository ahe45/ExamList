import test from "node:test";
import assert from "node:assert/strict";

import { renderGenerationRows } from "./pdf-generation-rows-renderer.js";
import { pdfGenerationGridColumns } from "./pdf-generation-table-model.js";

const access = Object.freeze({
  permissions: {
    downloadPdfs: true,
  },
});

test("PDF generation rows render print action with inline print url", () => {
  const html = renderGenerationRows(
    [
      {
        id: "generation-1",
        printUrl: "/api/pdf-generations/generation-1/download?disposition=inline",
        resultScope: {},
        status: "completed",
      },
    ],
    [],
    [],
    access,
  );

  assert.match(html, /data-action="print-pdf-generation"/);
  assert.match(html, /data-print-url="\/api\/pdf-generations\/generation-1\/download\?disposition=inline"/);
  assert.match(html, /viewBox="0 0 24 24"/);
  assert.doesNotMatch(html, /href="/);
});

test("PDF generation rows retain print without a detail action or column", () => {
  const html = renderGenerationRows(
    [
      {
        id: "generation-1",
        resultScope: {},
        status: "completed",
      },
    ],
    [],
    [],
    access,
  );
  const printIndex = html.indexOf('class="pdf-generation-print-column"');
  assert.ok(printIndex >= 0);
  assert.doesNotMatch(html, /pdf-generation-detail-column/);
  assert.doesNotMatch(html, /open-pdf-generation-detail-modal/);
  assert.match(html, /data-generation-id="generation-1"/);
  assert.equal((html.match(/<td\b/g) || []).length, pdfGenerationGridColumns.length + 2);
});

test("empty PDF generation rows span the visible columns", () => {
  const html = renderGenerationRows([]);
  assert.match(html, new RegExp(`colspan="${pdfGenerationGridColumns.length + 2}"`));
});
