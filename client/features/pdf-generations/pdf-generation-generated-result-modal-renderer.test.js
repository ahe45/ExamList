import test from "node:test";
import assert from "node:assert/strict";

import { renderPdfGenerationGeneratedResultModal } from "./pdf-generation-generated-result-modal-renderer.js";

test("PDF generation generated result modal stays hidden when closed", () => {
  const html = renderPdfGenerationGeneratedResultModal({
    generatedResultModal: {
      isOpen: false,
    },
  });

  assert.equal(html, "");
});

test("PDF generation generated result modal renders result download controls", () => {
  const html = renderPdfGenerationGeneratedResultModal({
    generatedResultModal: {
      failedCount: 1,
      generationIds: ["first", "second"],
      isOpen: true,
      isSubmitting: false,
      mode: "merge",
      templateName: "수험표",
      totalRequested: 3,
    },
  });

  assert.match(html, /PDF 생성 결과 처리/);
  assert.match(html, /선택한 PDF 2개/);
  assert.doesNotMatch(html, /pdf-generation-generated-result-message/);
  assert.doesNotMatch(html, /방금 생성된 PDF만 대상으로 다운로드를 진행할 방식을 선택하세요/);
  assert.doesNotMatch(html, /양식: 수험표/);
  assert.doesNotMatch(html, /실패 1건/);
  assert.match(html, /name="generatedResultMode"/);
  assert.ok(html.indexOf("<strong>병합 다운로드</strong>") < html.indexOf("<strong>개별 다운로드</strong>"));
  assert.match(html, /value="merge" checked/);
  assert.doesNotMatch(html, /data-pdf-generation-download-form/);
  assert.match(html, /data-pdf-generation-generated-result-form/);
});
