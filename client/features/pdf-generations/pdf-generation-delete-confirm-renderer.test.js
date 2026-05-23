import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationDeleteConfirmModal } from "./pdf-generation-delete-confirm-renderer.js";

test("PDF generation delete confirm modal renders a concise deletion summary", () => {
  const html = renderPdfGenerationDeleteConfirmModal({
    deleteConfirm: {
      candidateCount: 12,
      count: 2,
      fileSizeBytes: 1536,
      isDeleting: false,
      isOpen: true,
      items: [
        {
          candidateCount: 5,
          id: "generation-1",
          pageCount: 3,
          targetName: "논술 A고사실",
        },
      ],
      pageCount: 7,
    },
  });

  assert.match(html, /PDF 삭제 확인/);
  assert.match(html, /삭제 대상/);
  assert.match(html, /2건/);
  assert.match(html, /논술 A고사실/);
  assert.match(html, /외 1건/);
  assert.match(html, /data-action="confirm-pdf-generation-delete"/);
});

test("PDF generation delete confirm modal is hidden when closed", () => {
  const html = renderPdfGenerationDeleteConfirmModal({
    deleteConfirm: {
      isOpen: false,
    },
  });

  assert.equal(html, "");
});
