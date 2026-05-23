import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationProgressOverlay } from "./pdf-generation-progress-renderer.js";

test("PDF generation progress overlay uses busy overlay styling while keeping progress content", () => {
  const html = renderPdfGenerationProgressOverlay({
    activeGeneration: {
      batchId: "batch-1",
      canCancel: true,
      completedCount: 1200,
      elapsedSeconds: 12,
      estimatedSeconds: 40,
      isCancelling: false,
      isOpen: true,
      label: "수험생확인대장 PDF 생성 중",
      progressPercent: 35,
      totalRequested: 3500,
    },
  });

  assert.match(html, /busy-overlay pdf-generation-progress-overlay/);
  assert.match(html, /busy-overlay-backdrop/);
  assert.match(html, /busy-overlay-panel pdf-generation-progress-card/);
  assert.match(html, /busy-spinner/);
  assert.match(html, /수험생확인대장 PDF 생성 중/);
  assert.match(html, /35%/);
  assert.match(html, /진행 1,200개 \/ 총 3,500개/);
  assert.match(html, /시간 00:12 \/ 예상 00:40/);
  assert.match(html, /data-action="cancel-active-pdf-generation"/);
});
