import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationDownloadProgressOverlay } from "./pdf-generation-download-progress-renderer.js";

test("PDF generation download progress overlay is hidden when archive is idle", () => {
  const html = renderPdfGenerationDownloadProgressOverlay({
    downloadModal: {
      isSubmitting: false,
      mode: "zip",
    },
    isCreatingArchive: false,
    selectedGenerationIds: ["first"],
  });

  assert.equal(html, "");
});

test("PDF generation download progress overlay renders a busy overlay while preparing archive", () => {
  const html = renderPdfGenerationDownloadProgressOverlay({
    downloadModal: {
      isSubmitting: true,
      mode: "merge",
    },
    isCreatingArchive: true,
    selectedGenerationIds: ["first", "second"],
  });

  assert.match(html, /busy-overlay pdf-generation-download-busy-overlay/);
  assert.match(html, /PDF 병합 다운로드 준비 중/);
  assert.match(html, /처리 중/);
  assert.match(html, /선택 2건/);
  assert.match(html, /progress-bar is-indeterminate/);
});

test("PDF generation download progress overlay uses generated result modal targets when present", () => {
  const html = renderPdfGenerationDownloadProgressOverlay({
    downloadModal: {
      isSubmitting: false,
      mode: "zip",
    },
    generatedResultModal: {
      generationIds: ["first", "second", "third"],
      isSubmitting: true,
      mode: "zip",
    },
    isCreatingArchive: true,
    selectedGenerationIds: ["manual"],
  });

  assert.match(html, /이번에 생성된 PDF 파일을 ZIP으로 묶고 있습니다/);
  assert.match(html, /이번 생성 3건/);
  assert.doesNotMatch(html, /선택 1건/);
});
