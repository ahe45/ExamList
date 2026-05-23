import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationDownloadModal } from "./pdf-generation-download-modal-renderer.js";

test("PDF generation bulk download modal renders merge before zip and selects merge by default", () => {
  const html = renderPdfGenerationDownloadModal({
    downloadModal: {
      isOpen: true,
      isSubmitting: false,
      mode: "merge",
    },
    selectedGenerationIds: ["first", "second"],
  });

  assert.match(html, /일괄 다운로드/);
  assert.match(html, /선택한 PDF 2개/);
  assert.ok(html.indexOf("<strong>병합 다운로드</strong>") < html.indexOf("<strong>개별 다운로드</strong>"));
  assert.match(html, /value="merge" checked/);
});
