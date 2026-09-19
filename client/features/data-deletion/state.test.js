import test from "node:test";
import assert from "node:assert/strict";

import { buildDataDeletionSuccessMessage, getDeletionImpact, normalizeDataDeletionScope } from "./state.js";
import { getDataDeletionItems } from "./constants.js";

test("data deletion never invalidates template or editor state", () => {
  for (const { scope } of getDataDeletionItems()) {
    assert.equal(getDeletionImpact(scope).templates, false);
    assert.equal(getDeletionImpact(scope, { filters: { track: "수시" } }).templates, false);
  }
  assert.equal(getDeletionImpact("all").candidates, true);
  assert.equal(getDeletionImpact("all").pdfGenerations, true);
  assert.equal(normalizeDataDeletionScope("templates"), "");
});

test("all-data deletion success explicitly preserves templates", () => {
  const message = buildDataDeletionSuccessMessage({
    scope: "all",
    deletedCandidateRecords: 2,
    deletedCandidatePhotos: 1,
    deletedPdfGenerationHistories: 3,
    deletedPdfTemplates: 0,
  });
  assert.match(message, /수험생 2건/);
  assert.match(message, /생성 PDF 데이터 3건/);
  assert.match(message, /양식은 유지됩니다/);
  assert.doesNotMatch(message, /양식 0건/);
});
