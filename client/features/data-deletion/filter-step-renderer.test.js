import test from "node:test";
import assert from "node:assert/strict";
import { renderDataDeletionFilterList } from "./filter-step-renderer.js";

function trackField(options, selectedValue = "수시", hasSelection = true) {
  const html = renderDataDeletionFilterList({
    filters: { track: selectedValue }, isBusy: false, isLoadingOptions: false,
    modal: { options: { track: options } }, selectedFilterKeys: hasSelection ? ["track"] : [],
  });
  return html.match(/<select\s+name="track"[\s\S]*?<\/select>/)[0];
}

test("deletion keeps a selected condition when refreshed options omit it", () => {
  for (const options of [[], undefined, [{ value: "정시", candidateCount: 4 }]]) {
    const html = trackField(options);
    assert.match(html, /<option value="수시" selected>수시<\/option>/);
    assert.doesNotMatch(html, /<option value="" selected>/);
  }
});

test("deletion retains option counts without duplicating a selection and escapes fallback values", () => {
  const html = trackField([{ value: "수시", candidateCount: 12 }]);
  assert.equal((html.match(/value="수시"/g) || []).length, 1);
  assert.match(html, /수시 \(12\)/);
  assert.match(trackField([], '<A&"B>'), /value="&lt;A&amp;&quot;B&gt;" selected/);
});

test("explicit all and unselected deletion filters remain distinct after option refresh", () => {
  assert.match(trackField([], ""), /<option value="" selected>전체/);
  assert.match(trackField([], "", false), /value="__pdf_generation_unselected__" selected disabled/);
  assert.doesNotMatch(trackField([], "", false), /<option value="" selected>/);
});
